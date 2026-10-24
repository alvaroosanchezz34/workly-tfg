// backend/src/services/scheduler.service.js
import cron   from 'node-cron';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { sendInvoiceEmail } from './email.service.js';
import { processRecurringExpenses } from '../controllers/recurringExpenses.controller.js';
import { issuerKeyFor } from './invoicing/numbering.js';
import { appendInvoiceEvent } from './invoicing/invoiceEvents.js';

/**
 * Inicializa todos los jobs programados.
 * Llamar una vez al arrancar el servidor.
 */
export const initScheduler = () => {
    console.log('[Scheduler] Iniciando jobs programados...');

    // ── Cada día a las 9:00 ─────────────────────────────────
    cron.schedule('0 9 * * *', async () => {
        console.log('[Scheduler] Ejecutando jobs diarios...');
        await markOverdueInvoices();
        await markExpiredQuotes();
        await sendOverdueReminders();
        await sendUpcomingDueReminders();   // ← NUEVO
        await sendQuoteExpiryWarnings();    // ← NUEVO
        await processRecurringInvoices();
        await processRecurringExpenses();   // ← NUEVO
    }, { timezone: 'Europe/Madrid' });

    console.log('[Scheduler] Jobs registrados: marcado de vencidas (09:00), presupuestos expirados (09:00), recordatorios vencidas (09:00), avisos próximos a vencer (09:00), avisos presupuestos (09:00), recurrentes de facturas y gastos (09:00)');
};

// ── Marcar facturas como vencidas ─────────────────────────
const markOverdueInvoices = async () => {
    try {
        const [result] = await pool.query(
            `UPDATE invoices
             SET status = 'overdue'
             WHERE status = 'sent'
               AND due_date < CURDATE()
               AND is_deleted = 0`
        );
        if (result.affectedRows > 0)
            console.log(`[Scheduler] ${result.affectedRows} facturas marcadas como vencidas`);
    } catch (err) {
        console.error('[Scheduler] Error marcando vencidas:', err.message);
    }
};

// ── Marcar presupuestos expirados ─────────────────────────
const markExpiredQuotes = async () => {
    try {
        const [result] = await pool.query(
            `UPDATE quotes
             SET status = 'expired'
             WHERE status = 'sent'
               AND expiry_date < CURDATE()
               AND is_deleted = 0`
        );
        if (result.affectedRows > 0)
            console.log(`[Scheduler] ${result.affectedRows} presupuestos marcados como expirados`);
    } catch (err) {
        console.error('[Scheduler] Error marcando presupuestos expirados:', err.message);
    }
};

// ── Enviar recordatorios de facturas vencidas ─────────────
const sendOverdueReminders = async () => {
    if (!process.env.RESEND_API_KEY) return;

    try {
        const [invoices] = await pool.query(
            `SELECT i.id, i.invoice_number, i.total_amount, i.due_date, i.paid_amount,
                    c.name AS client_name, c.email AS client_email,
                    u.name AS issuer_name, u.company_name AS issuer_company
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             JOIN users   u ON u.id = i.user_id
             WHERE i.status = 'overdue'
               AND i.payment_status != 'paid'
               AND i.is_deleted = 0
               AND c.email IS NOT NULL
               AND c.email != ''
               AND (
                 i.last_reminder_at IS NULL
                 OR i.last_reminder_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
               )
             LIMIT 50`
        );

        if (invoices.length === 0) return;

        console.log(`[Scheduler] Enviando ${invoices.length} recordatorios de pago...`);

        for (const inv of invoices) {
            try {
                await sendPaymentReminder(inv);
                await pool.query(
                    `UPDATE invoices SET last_reminder_at = NOW() WHERE id = ?`,
                    [inv.id]
                );
            } catch (err) {
                console.error(`[Scheduler] Error enviando recordatorio factura ${inv.invoice_number}:`, err.message);
            }
        }

        console.log(`[Scheduler] Recordatorios enviados`);
    } catch (err) {
        console.error('[Scheduler] Error en sendOverdueReminders:', err.message);
    }
};

// ── [NUEVO] Avisos previos al vencimiento (3 y 1 días antes) ──────────────────
const sendUpcomingDueReminders = async () => {
    if (!process.env.RESEND_API_KEY) return;

    try {
        // Facturas que vencen en exactamente 3 días o en 1 día
        const [invoices] = await pool.query(
            `SELECT i.id, i.invoice_number, i.total_amount, i.due_date, i.paid_amount,
                    c.name AS client_name, c.email AS client_email,
                    u.name AS issuer_name, u.company_name AS issuer_company,
                    DATEDIFF(i.due_date, CURDATE()) AS days_left
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             JOIN users   u ON u.id = i.user_id
             WHERE i.status = 'sent'
               AND i.is_deleted = 0
               AND c.email IS NOT NULL AND c.email != ''
               AND DATEDIFF(i.due_date, CURDATE()) IN (3, 1)
               AND (
                 i.upcoming_reminder_at IS NULL
                 OR DATE(i.upcoming_reminder_at) != CURDATE()
               )
             LIMIT 50`
        );

        if (invoices.length === 0) return;

        console.log(`[Scheduler] Enviando ${invoices.length} avisos previos a vencimiento...`);

        for (const inv of invoices) {
            try {
                await sendUpcomingDueEmail(inv);
                await pool.query(
                    `UPDATE invoices SET upcoming_reminder_at = NOW() WHERE id = ?`,
                    [inv.id]
                );
            } catch (err) {
                console.error(`[Scheduler] Error enviando aviso previo ${inv.invoice_number}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[Scheduler] Error en sendUpcomingDueReminders:', err.message);
    }
};

// ── [NUEVO] Avisos de presupuestos próximos a expirar (3 días) ────────────────
const sendQuoteExpiryWarnings = async () => {
    if (!process.env.RESEND_API_KEY) return;

    try {
        const [quotes] = await pool.query(
            `SELECT q.id, q.quote_number, q.total_amount, q.expiry_date,
                    c.name AS client_name, c.email AS client_email,
                    u.name AS issuer_name, u.company_name AS issuer_company,
                    DATEDIFF(q.expiry_date, CURDATE()) AS days_left
             FROM quotes q
             JOIN clients c ON c.id = q.client_id
             JOIN users   u ON u.id = q.user_id
             WHERE q.status = 'sent'
               AND q.is_deleted = 0
               AND c.email IS NOT NULL AND c.email != ''
               AND DATEDIFF(q.expiry_date, CURDATE()) IN (3, 1)
               AND (
                 q.expiry_reminder_at IS NULL
                 OR DATE(q.expiry_reminder_at) != CURDATE()
               )
             LIMIT 30`
        );

        if (quotes.length === 0) return;

        console.log(`[Scheduler] Enviando ${quotes.length} avisos de presupuestos próximos a expirar...`);

        for (const q of quotes) {
            try {
                await sendQuoteExpiryEmail(q);
                await pool.query(
                    `UPDATE quotes SET expiry_reminder_at = NOW() WHERE id = ?`,
                    [q.id]
                );
            } catch (err) {
                console.error(`[Scheduler] Error enviando aviso presupuesto ${q.quote_number}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[Scheduler] Error en sendQuoteExpiryWarnings:', err.message);
    }
};

// ── Email de recordatorio de pago (ya vencida) ────────────
const sendPaymentReminder = async inv => {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM   = process.env.EMAIL_FROM || 'Workly <noreply@workly.space>';

    const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
    const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    const daysLate = Math.floor((new Date() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
    const pending  = Number(inv.total_amount) - Number(inv.paid_amount);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Recordatorio de pago</title></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#F44336;padding:28px 32px;">
      <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em;">RECORDATORIO DE PAGO</div>
      <div style="color:#fff;font-size:22px;font-weight:800;">${inv.invoice_number}</div>
      <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;">Vencida hace ${daysLate} día${daysLate !== 1 ? 's' : ''}</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:15px;color:#212121;margin:0 0 16px;">Hola <strong>${inv.client_name}</strong>,</p>
      <p style="font-size:14px;color:#616161;line-height:1.65;margin:0 0 24px;">
        Te recordamos que la factura <strong>${inv.invoice_number}</strong>, con fecha de vencimiento el
        <strong style="color:#F44336;">${fmtDate(inv.due_date)}</strong>, sigue pendiente de pago.
      </p>
      <div style="background:#FFF5F5;border:1px solid #FFCDD2;border-radius:10px;padding:18px 22px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:12px;color:#9E9E9E;margin-bottom:4px;">Importe pendiente</div>
            <div style="font-size:26px;font-weight:800;color:#F44336;">${fmt(pending)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;color:#9E9E9E;margin-bottom:4px;">Vencimiento</div>
            <div style="font-size:14px;font-weight:600;color:#F44336;">${fmtDate(inv.due_date)}</div>
          </div>
        </div>
      </div>
      <p style="font-size:13px;color:#9E9E9E;margin:0;">
        Si ya realizaste el pago, por favor ignora este mensaje.<br>
        Ante cualquier duda, contacta con <strong>${inv.issuer_company || inv.issuer_name}</strong>.
      </p>
    </div>
    <div style="background:#F8FAFF;padding:16px 32px;text-align:center;border-top:1px solid #F0F0F0;">
      <p style="font-size:11px;color:#BDBDBD;margin:0;">⚡ Recordatorio gestionado con <strong style="color:#1976D2;">Workly</strong></p>
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
        from:    FROM,
        to:      [inv.client_email],
        subject: `Recordatorio de pago: ${inv.invoice_number} — ${fmt(pending)} pendiente`,
        html,
    });
};

// ── [NUEVO] Email de aviso previo a vencimiento ───────────
const sendUpcomingDueEmail = async inv => {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM   = process.env.EMAIL_FROM || 'Workly <noreply@workly.space>';

    const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
    const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    const days = inv.days_left;
    const pending = Number(inv.total_amount) - Number(inv.paid_amount);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Aviso de vencimiento próximo</title></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#F59E0B;padding:28px 32px;">
      <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em;">VENCIMIENTO PRÓXIMO</div>
      <div style="color:#fff;font-size:22px;font-weight:800;">${inv.invoice_number}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Vence en ${days} día${days !== 1 ? 's' : ''}</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:15px;color:#212121;margin:0 0 16px;">Hola <strong>${inv.client_name}</strong>,</p>
      <p style="font-size:14px;color:#616161;line-height:1.65;margin:0 0 24px;">
        Te recordamos que la factura <strong>${inv.invoice_number}</strong> vence el
        <strong style="color:#F59E0B;">${fmtDate(inv.due_date)}</strong>.
        Por favor, ten en cuenta este plazo para realizar el pago a tiempo.
      </p>
      <div style="background:#FFFBF0;border:1px solid #FDE68A;border-radius:10px;padding:18px 22px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:12px;color:#9E9E9E;margin-bottom:4px;">Importe pendiente</div>
            <div style="font-size:26px;font-weight:800;color:#F59E0B;">${fmt(pending)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;color:#9E9E9E;margin-bottom:4px;">Fecha de vencimiento</div>
            <div style="font-size:14px;font-weight:600;color:#F59E0B;">${fmtDate(inv.due_date)}</div>
          </div>
        </div>
      </div>
      <p style="font-size:13px;color:#9E9E9E;margin:0;">
        Si ya realizaste el pago, por favor ignora este mensaje.<br>
        Para cualquier consulta, contacta con <strong>${inv.issuer_company || inv.issuer_name}</strong>.
      </p>
    </div>
    <div style="background:#F8FAFF;padding:16px 32px;text-align:center;border-top:1px solid #F0F0F0;">
      <p style="font-size:11px;color:#BDBDBD;margin:0;">⚡ Aviso gestionado con <strong style="color:#1976D2;">Workly</strong></p>
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
        from:    FROM,
        to:      [inv.client_email],
        subject: `Aviso: la factura ${inv.invoice_number} vence en ${days} día${days !== 1 ? 's' : ''}`,
        html,
    });
};

// ── [NUEVO] Email de aviso de presupuesto próximo a expirar ──────────────────
const sendQuoteExpiryEmail = async q => {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const FROM   = process.env.EMAIL_FROM || 'Workly <noreply@workly.space>';

    const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
    const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    const days = q.days_left;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Presupuesto próximo a expirar</title></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1976D2;padding:28px 32px;">
      <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em;">PRESUPUESTO</div>
      <div style="color:#fff;font-size:22px;font-weight:800;">${q.quote_number}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Expira en ${days} día${days !== 1 ? 's' : ''}</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:15px;color:#212121;margin:0 0 16px;">Hola <strong>${q.client_name}</strong>,</p>
      <p style="font-size:14px;color:#616161;line-height:1.65;margin:0 0 24px;">
        El presupuesto <strong>${q.quote_number}</strong> que te enviamos expira el
        <strong style="color:#1976D2;">${fmtDate(q.expiry_date)}</strong>.
        Si estás interesado, por favor confírmalo antes de esa fecha.
      </p>
      <div style="background:#E3F2FD;border:1px solid #BBDEFB;border-radius:10px;padding:18px 22px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:12px;color:#9E9E9E;margin-bottom:4px;">Importe total</div>
            <div style="font-size:26px;font-weight:800;color:#1976D2;">${fmt(q.total_amount)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;color:#9E9E9E;margin-bottom:4px;">Fecha de expiración</div>
            <div style="font-size:14px;font-weight:600;color:#1976D2;">${fmtDate(q.expiry_date)}</div>
          </div>
        </div>
      </div>
      <p style="font-size:13px;color:#9E9E9E;margin:0;">
        Para aceptar o consultar el presupuesto, contacta con <strong>${q.issuer_company || q.issuer_name}</strong>.
      </p>
    </div>
    <div style="background:#F8FAFF;padding:16px 32px;text-align:center;border-top:1px solid #F0F0F0;">
      <p style="font-size:11px;color:#BDBDBD;margin:0;">⚡ Gestionado con <strong style="color:#1976D2;">Workly</strong></p>
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
        from:    FROM,
        to:      [q.client_email],
        subject: `Recordatorio: el presupuesto ${q.quote_number} expira en ${days} día${days !== 1 ? 's' : ''}`,
        html,
    });
};

// ── Procesar facturas recurrentes ─────────────────────────
const processRecurringInvoices = async () => {
    try {
        const [recurrings] = await pool.query(
            `SELECT r.*, u.id AS owner_id
             FROM recurring_invoices r
             JOIN users u ON u.id = r.user_id
             WHERE r.status = 'active'
               AND r.next_date <= CURDATE()
               AND r.is_deleted = 0
               AND (r.end_date IS NULL OR r.end_date >= CURDATE())
             LIMIT 100`
        );

        if (recurrings.length === 0) return;
        console.log(`[Scheduler] Procesando ${recurrings.length} facturas recurrentes...`);

        for (const rec of recurrings) {
            try {
                await generateFromRecurring(rec);
            } catch (err) {
                console.error(`[Scheduler] Error procesando recurrente ${rec.id}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[Scheduler] Error en processRecurringInvoices:', err.message);
    }
};

const madridDate = date => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

const generateFromRecurring = async rec => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const issueDate = new Date();
        const dueDate   = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + 30);

        const publicToken = crypto.randomBytes(32).toString('hex');
        const issuerKey = issuerKeyFor({ id: rec.user_id, company_id: rec.company_id });
        const [result] = await conn.query(
            `INSERT INTO invoices
             (user_id, company_id, client_id, project_id, issuer_key, invoice_number,
              issue_date, due_date, status, subtotal_amount, tax_amount, total_amount, notes, public_token)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [rec.user_id, rec.company_id || null, rec.client_id, rec.project_id, issuerKey, null,
             madridDate(issueDate),
             madridDate(dueDate),
             'draft', rec.subtotal_amount, rec.tax_amount, rec.total_amount,
             `Generada automáticamente desde factura recurrente #${rec.id}`,
             publicToken]
        );
        const invoiceId = result.insertId;

        const [items] = await conn.query(
            `SELECT * FROM recurring_invoice_items WHERE recurring_id = ?`, [rec.id]
        );
        for (const item of items) {
            await conn.query(
                `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total)
                 VALUES (?,?,?,?,?,?,?,?)`,
                [invoiceId, item.description, item.quantity, item.unit_price, item.tax_rate, item.subtotal, item.tax_amount, item.total]
            );
        }

        const nextDate = calculateNextDate(rec.next_date, rec.frequency);
        const finished = rec.end_date && nextDate > new Date(rec.end_date);

        await conn.query(
            `UPDATE recurring_invoices SET next_date = ?, last_generated = NOW(), status = ? WHERE id = ?`,
            [madridDate(nextDate), finished ? 'finished' : 'active', rec.id]
        );
        await appendInvoiceEvent(conn, {
            invoiceId, issuerKey, userId: rec.user_id, action: 'draft_created',
            payload: { source: 'recurring', recurring_id: rec.id },
        });

        await conn.commit();
        console.log(`[Scheduler] Borrador recurrente generado: ${invoiceId}`);
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally { conn.release(); }
};

const calculateNextDate = (currentDate, frequency) => {
    const d = new Date(currentDate);
    switch (frequency) {
        case 'weekly':    d.setDate(d.getDate() + 7);    break;
        case 'monthly':   d.setMonth(d.getMonth() + 1);  break;
        case 'quarterly': d.setMonth(d.getMonth() + 3);  break;
        case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
    }
    return d;
};