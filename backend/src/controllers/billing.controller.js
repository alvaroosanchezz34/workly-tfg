// backend/src/controllers/billing.controller.js
import Stripe from 'stripe';
import { pool } from '../config/db.js';
import { PLANS } from '../config/plans.js';

const getStripe = () => {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY no configurada');
    return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
};

// ── GET /api/billing/plans ────────────────────────────────
// Devuelve los planes disponibles al frontend (sin secret keys)
export const getPlans = (_req, res) => {
    const plans = Object.entries(PLANS).map(([key, plan]) => ({
        id:            key,
        name:          plan.name,
        price_monthly: plan.price_monthly,
        price_yearly:  plan.price_yearly,
        limits:        plan.limits,
        has_stripe:    !!plan.stripe_price_monthly,
    }));
    res.json(plans);
};

// ── GET /api/billing/status ───────────────────────────────
// Estado de suscripción del usuario actual
export const getBillingStatus = async (req, res) => {
    try {
        const [[user]] = await pool.query(
            `SELECT plan, plan_status, plan_expires_at, trial_ends_at, stripe_customer_id, stripe_subscription_id
             FROM users WHERE id = ?`, [req.user.id]
        );
        res.json({
            plan:              user.plan || 'free',
            plan_status:       user.plan_status,
            plan_expires_at:   user.plan_expires_at,
            trial_ends_at:     user.trial_ends_at,
            has_subscription:  !!user.stripe_subscription_id,
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/billing/checkout ────────────────────────────
// Crea una sesión de pago de Stripe
export const createCheckout = async (req, res) => {
    const { plan, billing } = req.body; // billing: 'monthly' | 'yearly'
    if (!['pro', 'business'].includes(plan)) return res.status(400).json({ message: 'Plan no válido' });

    try {
        const stripe = getStripe();
        const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);

        const planConfig = PLANS[plan];
        const priceId    = billing === 'yearly'
            ? planConfig.stripe_price_yearly
            : planConfig.stripe_price_monthly;

        if (!priceId) return res.status(400).json({ message: `Precio de Stripe no configurado para el plan ${plan}. Añade STRIPE_PRICE_${plan.toUpperCase()}_${billing.toUpperCase()} al .env` });

        // Crear o recuperar customer de Stripe
        let customerId = user.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name:  user.name,
                metadata: { workly_user_id: String(user.id) },
            });
            customerId = customer.id;
            await pool.query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, user.id]);
        }

        const session = await stripe.checkout.sessions.create({
            customer:             customerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode:                 'subscription',
            allow_promotion_codes: true,
            subscription_data: {
                trial_period_days: plan === 'pro' ? 7 : 0,
                metadata: { workly_user_id: String(user.id), plan },
            },
            success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${process.env.FRONTEND_URL}/billing`,
            metadata: { workly_user_id: String(user.id), plan, billing },
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('[createCheckout]', err.message);
        res.status(500).json({ message: err.message });
    }
};

// ── POST /api/billing/portal ──────────────────────────────
// Abre el portal de Stripe para gestionar suscripción
export const createPortal = async (req, res) => {
    try {
        const stripe = getStripe();
        const [[user]] = await pool.query('SELECT stripe_customer_id FROM users WHERE id = ?', [req.user.id]);

        if (!user.stripe_customer_id) return res.status(400).json({ message: 'No tienes una suscripción activa' });

        const session = await stripe.billingPortal.sessions.create({
            customer:   user.stripe_customer_id,
            return_url: `${process.env.FRONTEND_URL}/billing`,
        });

        res.json({ url: session.url });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── POST /api/billing/webhook ─────────────────────────────
// Recibe eventos de Stripe (pagos, cancelaciones, renovaciones)
export const stripeWebhook = async (req, res) => {
    const sig    = req.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
        console.error('[Webhook] Signature error:', err.message);
        return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    const data = event.data.object;

    try {
        switch (event.type) {

            case 'checkout.session.completed': {
                const userId = data.metadata?.workly_user_id;
                const plan   = data.metadata?.plan;
                if (!userId || !plan) break;
                await pool.query(
                    `UPDATE users SET plan = ?, plan_status = 'active', stripe_subscription_id = ? WHERE id = ?`,
                    [plan, data.subscription, userId]
                );
                await logBillingEvent(userId, event.id, event.type, data.amount_total / 100, 'paid');
                break;
            }

            case 'customer.subscription.updated': {
                const customer = await getStripe().customers.retrieve(data.customer);
                const userId   = customer.metadata?.workly_user_id;
                if (!userId) break;
                const plan       = data.metadata?.plan || await getPlanFromSubscription(data);
                const planStatus = data.status;
                const expiresAt  = data.current_period_end
                    ? new Date(data.current_period_end * 1000)
                    : null;
                await pool.query(
                    `UPDATE users SET plan = ?, plan_status = ?, plan_expires_at = ?, stripe_subscription_id = ? WHERE id = ?`,
                    [plan, planStatus, expiresAt, data.id, userId]
                );
                break;
            }

            case 'customer.subscription.deleted': {
                const customer = await getStripe().customers.retrieve(data.customer);
                const userId   = customer.metadata?.workly_user_id;
                if (!userId) break;
                await pool.query(
                    `UPDATE users SET plan = 'free', plan_status = 'canceled', stripe_subscription_id = NULL, plan_expires_at = NULL WHERE id = ?`,
                    [userId]
                );
                await logBillingEvent(userId, event.id, event.type, null, 'canceled');
                break;
            }

            case 'invoice.payment_succeeded': {
                const customer = await getStripe().customers.retrieve(data.customer);
                const userId   = customer.metadata?.workly_user_id;
                if (!userId) break;
                await pool.query(`UPDATE users SET plan_status = 'active' WHERE id = ?`, [userId]);
                await logBillingEvent(userId, event.id, event.type, data.amount_paid / 100, 'paid');
                break;
            }

            case 'invoice.payment_failed': {
                const customer = await getStripe().customers.retrieve(data.customer);
                const userId   = customer.metadata?.workly_user_id;
                if (!userId) break;
                await pool.query(`UPDATE users SET plan_status = 'past_due' WHERE id = ?`, [userId]);
                await logBillingEvent(userId, event.id, event.type, data.amount_due / 100, 'failed');
                break;
            }

            case 'customer.subscription.trial_will_end': {
                // Aquí podrías enviar un email recordatorio del fin de trial
                console.log('[Webhook] Trial ending for customer:', data.customer);
                break;
            }

            default:
                console.log('[Webhook] Unhandled event:', event.type);
        }

        res.json({ received: true });
    } catch (err) {
        console.error('[Webhook] Processing error:', err.message);
        res.status(500).json({ message: err.message });
    }
};

// ── Helpers ───────────────────────────────────────────────
const logBillingEvent = async (userId, stripeEventId, type, amount, status) => {
    try {
        await pool.query(
            `INSERT IGNORE INTO billing_events (user_id, stripe_event_id, event_type, amount, status) VALUES (?,?,?,?,?)`,
            [userId, stripeEventId, type, amount, status]
        );
    } catch { /* ignorar duplicados */ }
};

const getPlanFromSubscription = async subscription => {
    // Intenta deducir el plan del precio de Stripe
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (!priceId) return 'pro';
    if (priceId === process.env.STRIPE_PRICE_BUSINESS_MONTHLY || priceId === process.env.STRIPE_PRICE_BUSINESS_YEARLY) return 'business';
    return 'pro';
};