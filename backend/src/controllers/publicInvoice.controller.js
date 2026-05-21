// backend/src/controllers/publicInvoice.controller.js
// Endpoint público — NO requiere autenticación
// Sirve los datos de una factura identificada por su public_token

import { pool } from '../config/db.js';

export const getPublicInvoice = async (req, res) => {
    const { token } = req.params;

    if (!token || token.length < 32) {
        return res.status(400).json({ message: 'Token no válido' });
    }

    try {
        const [[invoice]] = await pool.query(
            `SELECT
                i.id, i.invoice_number, i.issue_date, i.due_date, i.status,
                i.subtotal_amount, i.tax_amount, i.total_amount,
                i.paid_amount, i.payment_status, i.notes,
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