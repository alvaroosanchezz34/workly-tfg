import { pool } from '../config/db.js';
import { resourceScope } from '../utils/scope.js';
import { TRADE_CATALOG } from '../data/tradeCatalog.js';

export const listTradeCatalog = (_req, res) => {
    res.json(TRADE_CATALOG);
};

export const importTradeCatalog = async (req, res) => {
    const trade = String(req.body?.trade || '');
    const lines = TRADE_CATALOG[trade];
    if (!lines) return res.status(400).json({ message: 'Elige un oficio: fontanero, electricista, reformas o instalador' });
    try {
        let created = 0;
        for (const line of lines) {
            const [existing] = await pool.query(
                `SELECT id FROM services WHERE user_id = ? AND name = ? AND is_deleted = 0 LIMIT 1`,
                [req.user.id, line.name]
            );
            if (existing.length) continue;
            await pool.query(
                `INSERT INTO services (user_id, company_id, name, default_rate, unit, trade)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.id, req.user.company_id || null, line.name, line.default_rate, line.unit, trade]
            );
            created += 1;
        }
        res.status(201).json({ message: `Partidas de ${trade} listas`, created });
    } catch (err) {
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const getInvoiceAging = async (req, res) => {
    try {
        const scope = resourceScope(req, 'i');
        const [rows] = await pool.query(
            `SELECT i.id, i.invoice_number, i.due_date, i.total_amount, i.paid_amount, i.status,
                    i.public_token, c.name AS client_name, c.phone AS client_phone,
                    DATEDIFF(CURDATE(), i.due_date) AS days_overdue
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             WHERE ${scope.where} AND i.is_deleted = 0
               AND i.status IN ('sent','overdue')
               AND (i.payment_status IS NULL OR i.payment_status != 'paid')
             ORDER BY i.due_date ASC
             LIMIT 100`,
            scope.params
        );
        const buckets = { al_dia: [], d1_30: [], d31_60: [], d61: [] };
        for (const row of rows) {
            const pending = Number(row.total_amount) - Number(row.paid_amount || 0);
            const item = { ...row, pending };
            const days = Number(row.days_overdue);
            if (days <= 0) buckets.al_dia.push(item);
            else if (days <= 30) buckets.d1_30.push(item);
            else if (days <= 60) buckets.d31_60.push(item);
            else buckets.d61.push(item);
        }
        res.json(buckets);
    } catch (err) {
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const remindInvoice = async (req, res) => {
    try {
        const scope = resourceScope(req, 'i');
        const [[invoice]] = await pool.query(
            `SELECT i.id, i.invoice_number, i.total_amount, i.paid_amount, i.due_date, i.status,
                    i.public_token, i.last_reminder_at, c.name AS client_name, c.email AS client_email
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             WHERE i.id = ? AND ${scope.where} AND i.is_deleted = 0`,
            [req.params.id, ...scope.params]
        );
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        if (!['sent', 'overdue'].includes(invoice.status)) {
            return res.status(400).json({ message: 'Solo se recuerda una factura ya emitida y enviada' });
        }
        const pending = Number(invoice.total_amount) - Number(invoice.paid_amount || 0);
        const publicUrl = invoice.public_token && process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/p/${invoice.public_token}`
            : '';
        const text = `Hola ${invoice.client_name}, te recuerdo la factura ${invoice.invoice_number || ''}. Quedan ${pending.toFixed(2)} €. ${publicUrl}`.trim();
        const recent = invoice.last_reminder_at && (Date.now() - new Date(invoice.last_reminder_at).getTime()) < 20 * 60 * 60 * 1000;
        if (recent) {
            return res.status(429).json({ message: 'Ya enviaste un recordatorio hoy', whatsapp: text });
        }
        let emailed = false;
        if (process.env.RESEND_API_KEY && invoice.client_email) {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Workly <noreply@workly.space>',
                to: invoice.client_email,
                subject: `Recordatorio de la factura ${invoice.invoice_number || ''}`.trim(),
                text: `${text}\n\nSi ya lo pagaste, ignora este mensaje.`,
            });
            emailed = true;
        }
        await pool.query(`UPDATE invoices SET last_reminder_at = NOW() WHERE id = ?`, [invoice.id]);
        res.json({
            message: emailed ? 'Recordatorio enviado por email' : 'No hay email configurado. Comparte el mensaje por WhatsApp.',
            emailed,
            whatsapp: text,
        });
    } catch (err) {
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
