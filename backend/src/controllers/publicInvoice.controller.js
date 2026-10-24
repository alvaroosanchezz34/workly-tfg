// backend/src/controllers/publicInvoice.controller.js
// Endpoint público — NO requiere autenticación
// Sirve los datos de una factura identificada por su public_token

import { pool } from '../config/db.js';
import { getStripe } from './billing.controller.js';

export const getPublicInvoice = async (req, res) => {
    const { token } = req.params;

    if (!token || token.length < 32) {
        return res.status(400).json({ message: 'Token no válido' });
    }

    try {
        const [[invoice]] = await pool.query(
            `SELECT
                i.id, i.invoice_number, i.issue_date, i.due_date, i.status,
                i.subtotal_amount, i.tax_amount, i.equivalence_surcharge_amount,
                i.irpf_rate, i.irpf_amount, i.total_amount,
                i.paid_amount, i.payment_status, i.notes,
                i.invoice_type, i.rectification_method,
                i.issuer_legal_name, i.issuer_tax_id, i.issuer_fiscal_address,
                i.customer_legal_name, i.customer_tax_id, i.customer_fiscal_address,
                i.verifactu_qr_url, i.verifactu_legend,
                c.name  AS client_name,
                c.email AS client_email,
                c.company AS client_company,
                c.document AS client_document,
                u.name         AS issuer_name,
                u.email        AS issuer_email,
                u.company_name AS issuer_company,
                u.phone        AS issuer_phone
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             JOIN users   u ON u.id = i.user_id
             WHERE i.public_token = ?
               AND i.is_deleted   = 0`,
            [token]
        );

        if (!invoice) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        const [items] = await pool.query(
            `SELECT description, quantity, unit_price, tax_rate, subtotal, tax_amount, total
             FROM invoice_items
             WHERE invoice_id = ? AND is_deleted = 0
             ORDER BY id ASC`,
            [invoice.id]
        );

        // No devolvemos datos sensibles del emisor (plan, contraseña, etc.)
        res.json({ ...invoice, items });

    } catch (err) {
        console.error('[publicInvoice]', err.message);
        res.status(500).json({ message: 'Error interno' });
    }
};

// POST /api/public/invoice/:token/checkout — crea una sesión de pago de Stripe
// para el importe pendiente de la factura. Sin autenticación: el token público
// (32+ caracteres aleatorios) es la única credencial, igual que getPublicInvoice.
export const createPublicInvoiceCheckout = async (req, res) => {
    const { token } = req.params;
    if (!token || token.length < 32) return res.status(400).json({ message: 'Token no válido' });

    try {
        const [[invoice]] = await pool.query(
            `SELECT id, invoice_number, total_amount, paid_amount, payment_status, status
             FROM invoices WHERE public_token = ? AND is_deleted = 0`,
            [token]
        );
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        if (invoice.status === 'void') return res.status(400).json({ message: 'Esta factura está anulada' });
        if (invoice.status === 'draft') return res.status(400).json({ message: 'Esta factura todavía es un borrador' });
        if (invoice.payment_status === 'paid') return res.status(400).json({ message: 'Esta factura ya está pagada' });

        const pending = Math.round((Number(invoice.total_amount) - Number(invoice.paid_amount)) * 100) / 100;
        if (!(pending > 0)) return res.status(400).json({ message: 'No hay importe pendiente de cobro' });

        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: `Factura ${invoice.invoice_number}` },
                    unit_amount: Math.round(pending * 100),
                },
                quantity: 1,
            }],
            success_url: `${process.env.FRONTEND_URL}/p/${token}?payment=success`,
            cancel_url:  `${process.env.FRONTEND_URL}/p/${token}?payment=cancelled`,
            metadata: { type: 'invoice_payment', invoice_id: String(invoice.id), public_token: token },
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('[publicInvoiceCheckout]', err.message);
        res.status(500).json({ message: err.message.includes('STRIPE_SECRET_KEY') ? 'El cobro online no está disponible ahora mismo.' : 'Error al iniciar el pago' });
    }
};