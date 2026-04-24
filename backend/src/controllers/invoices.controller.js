import { pool } from '../config/db.js';
import { generateInvoicePDF } from '../services/pdf.service.js';
import { logActivity } from '../utils/activityLogger.js';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Genera el próximo número de factura para el usuario */
const getNextInvoiceNumber = async (conn, userId) => {
    const currentYear = new Date().getFullYear();

    // Obtener o crear configuración
    let [rows] = await conn.query(
        `SELECT * FROM invoice_settings WHERE user_id = ?`, [userId]
    );

    if (rows.length === 0) {
        await conn.query(
            `INSERT INTO invoice_settings (user_id, prefix, next_number, padding, current_year)
             VALUES (?, 'FAC', 1, 4, ?)`, [userId, currentYear]
        );
        [rows] = await conn.query(`SELECT * FROM invoice_settings WHERE user_id = ?`, [userId]);
    }

    let cfg = rows[0];

    // Resetear contador si cambió el año
    if (cfg.reset_yearly && cfg.current_year !== currentYear) {
        await conn.query(
            `UPDATE invoice_settings SET next_number = 1, current_year = ? WHERE user_id = ?`,
            [currentYear, userId]
        );
        cfg.next_number = 1;
        cfg.current_year = currentYear;
    }

    const seq    = cfg.next_number;
    const padded = String(seq).padStart(cfg.padding, '0');
    const number = `${cfg.prefix}-${currentYear}-${padded}`;

    // Incrementar
    await conn.query(
        `UPDATE invoice_settings SET next_number = next_number + 1 WHERE user_id = ?`, [userId]
    );

    return { number, seq, year: currentYear };
};

/** Recalcula totales de factura desde sus líneas */
const recalcTotals = async (conn, invoiceId) => {
    const [items] = await conn.query(
        `SELECT subtotal, tax_amount, total FROM invoice_items
         WHERE invoice_id = ? AND is_deleted = 0`, [invoiceId]
    );
    const subtotal = items.reduce((s, i) => s + Number(i.subtotal), 0);
    const tax      = items.reduce((s, i) => s + Number(i.tax_amount), 0);
    const total    = subtotal + tax;
    await conn.query(
        `UPDATE invoices SET subtotal_amount = ?, tax_amount = ?, total_amount = ? WHERE id = ?`,
        [subtotal, tax, total, invoiceId]
    );
    return { subtotal, tax, total };
};

// ─────────────────────────────────────────────────────────────
// CRUD FACTURAS
// ─────────────────────────────────────────────────────────────

export const createInvoice = async (req, res) => {
    const { client_id, project_id, issue_date, due_date, status, notes, items } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        if (!Array.isArray(items) || items.length === 0)
            throw new Error('La factura debe tener al menos una línea');

        const [client] = await conn.query(
            `SELECT id FROM clients WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            [client_id, req.user.id]
        );
        if (client.length === 0) throw new Error('Cliente no válido');

        const { number, seq, year } = await getNextInvoiceNumber(conn, req.user.id);

        const [result] = await conn.query(
            `INSERT INTO invoices
               (user_id, client_id, project_id, invoice_number, invoice_seq, invoice_year,
                issue_date, due_date, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, client_id, project_id || null, number, seq, year,
             issue_date, due_date, status || 'draft', notes]
        );
        const invoiceId = result.insertId;

        for (const item of items) {
            const subtotal   = Number(item.quantity) * Number(item.unit_price);
            const taxRate    = Number(item.tax_rate ?? 21);
            const taxAmount  = Math.round(subtotal * taxRate / 100 * 100) / 100;
            const lineTotal  = subtotal + taxAmount;
            await conn.query(
                `INSERT INTO invoice_items
                   (invoice_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [invoiceId, item.description, item.quantity, item.unit_price,
                 taxRate, subtotal, taxAmount, lineTotal]
            );
        }

        await recalcTotals(conn, invoiceId);
        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: invoiceId, action: 'created' });
        await conn.commit();

        res.status(201).json({ message: 'Factura creada', invoiceId, invoice_number: number });
    } catch (err) {
        await conn.rollback();
        res.status(400).json({ message: err.message });
    } finally {
        conn.release();
    }
};

export const updateInvoice = async (req, res) => {
    const { id } = req.params;
    const { client_id, project_id, issue_date, due_date, status, notes, items } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[invoice]] = await conn.query(
            `SELECT id, status, payment_status FROM invoices
             WHERE id = ? AND user_id = ? AND is_deleted = 0`, [id, req.user.id]
        );
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        if (invoice.payment_status === 'paid')
            return res.status(400).json({ message: 'No se puede modificar una factura pagada' });

        await conn.query(
            `UPDATE invoices SET client_id=?, project_id=?, issue_date=?, due_date=?, status=?, notes=?
             WHERE id = ?`,
            [client_id, project_id || null, issue_date, due_date, status, notes, id]
        );

        await conn.query(`UPDATE invoice_items SET is_deleted = 1 WHERE invoice_id = ?`, [id]);

        if (Array.isArray(items)) {
            for (const item of items) {
                const subtotal  = Number(item.quantity) * Number(item.unit_price);
                const taxRate   = Number(item.tax_rate ?? 21);
                const taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
                const lineTotal = subtotal + taxAmount;
                await conn.query(
                    `INSERT INTO invoice_items
                       (invoice_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, item.description, item.quantity, item.unit_price,
                     taxRate, subtotal, taxAmount, lineTotal]
                );
            }
        }

        await recalcTotals(conn, id);
        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: id, action: 'updated' });
        await conn.commit();
        res.json({ message: 'Factura actualizada' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

export const getInvoices = async (req, res) => {
    const { status, client_id, date_from, date_to, min_amount, max_amount } = req.query;
    try {
        await pool.query(
            `UPDATE invoices SET status = 'overdue'
             WHERE user_id = ? AND status IN ('draft','sent') AND due_date < CURDATE() AND is_deleted = 0`,
            [req.user.id]
        );

        let where = `i.user_id = ? AND i.is_deleted = 0 AND c.is_deleted = 0`;
        const params = [req.user.id];

        if (status)     { where += ` AND i.status = ?`;              params.push(status); }
        if (client_id)  { where += ` AND i.client_id = ?`;           params.push(client_id); }
        if (date_from)  { where += ` AND i.issue_date >= ?`;          params.push(date_from); }
        if (date_to)    { where += ` AND i.issue_date <= ?`;          params.push(date_to); }
        if (min_amount) { where += ` AND i.total_amount >= ?`;        params.push(min_amount); }
        if (max_amount) { where += ` AND i.total_amount <= ?`;        params.push(max_amount); }

        const [rows] = await pool.query(
            `SELECT i.*, c.name AS client_name,
                    (i.total_amount - i.paid_amount) AS pending_amount
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             WHERE ${where}
             ORDER BY i.created_at DESC`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getInvoiceById = async (req, res) => {
    const { id } = req.params;
    try {
        const [[invoice]] = await pool.query(
            `SELECT i.*, c.name AS client_name, c.email AS client_email,
                    c.company AS client_company, c.document AS client_document
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             WHERE i.id = ? AND i.user_id = ? AND i.is_deleted = 0`,
            [id, req.user.id]
        );
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        const [items] = await pool.query(
            `SELECT * FROM invoice_items WHERE invoice_id = ? AND is_deleted = 0`, [id]
        );
        const [payments] = await pool.query(
            `SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC`, [id]
        );
        res.json({ ...invoice, items, payments });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const softDeleteInvoice = async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[invoice]] = await conn.query(
            `SELECT status, payment_status FROM invoices WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            [id, req.user.id]
        );
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        if (invoice.payment_status === 'paid')
            return res.status(400).json({ message: 'No se puede eliminar una factura pagada' });

        await conn.query(
            `UPDATE invoices SET is_deleted=1, deleted_at=NOW(), deleted_by=? WHERE id=?`,
            [req.user.id, id]
        );
        await conn.query(
            `UPDATE invoice_items SET is_deleted=1 WHERE invoice_id=?`, [id]
        );
        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: id, action: 'deleted' });
        await conn.commit();
        res.json({ message: 'Factura eliminada' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// ─────────────────────────────────────────────────────────────
// CAMBIO DE ESTADO RÁPIDO
// ─────────────────────────────────────────────────────────────
export const updateInvoiceStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const VALID = ['draft', 'sent', 'paid', 'overdue'];
    if (!VALID.includes(status))
        return res.status(400).json({ message: 'Estado no válido' });

    try {
        const [[invoice]] = await pool.query(
            `SELECT id FROM invoices WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            [id, req.user.id]
        );
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        const extra = status === 'paid' ? `, paid_at = NOW(), payment_status = 'paid'` : '';
        await pool.query(
            `UPDATE invoices SET status = ? ${extra} WHERE id = ?`, [status, id]
        );
        res.json({ message: 'Estado actualizado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// PAGOS PARCIALES
// ─────────────────────────────────────────────────────────────
export const addPayment = async (req, res) => {
    const { id } = req.params;
    const { amount, payment_date, method, reference, notes } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[invoice]] = await conn.query(
            `SELECT id, total_amount, paid_amount FROM invoices
             WHERE id = ? AND user_id = ? AND is_deleted = 0`, [id, req.user.id]
        );
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        const newPaid    = Number(invoice.paid_amount) + Number(amount);
        const total      = Number(invoice.total_amount);
        const payStatus  = newPaid >= total ? 'paid' : 'partial';
        const invStatus  = newPaid >= total ? 'paid' : 'sent';

        await conn.query(
            `INSERT INTO invoice_payments (invoice_id, user_id, amount, payment_date, method, reference, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, req.user.id, amount, payment_date, method || 'transfer', reference, notes]
        );
        await conn.query(
            `UPDATE invoices SET paid_amount = ?, payment_status = ?, status = ?
             WHERE id = ?`, [newPaid, payStatus, invStatus, id]
        );

        await conn.commit();
        res.status(201).json({ message: 'Pago registrado', paid_amount: newPaid, payment_status: payStatus });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

export const getPayments = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            `SELECT p.* FROM invoice_payments p
             JOIN invoices i ON i.id = p.invoice_id
             WHERE p.invoice_id = ? AND i.user_id = ?
             ORDER BY p.payment_date DESC`, [id, req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deletePayment = async (req, res) => {
    const { id, paymentId } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[payment]] = await conn.query(
            `SELECT p.amount FROM invoice_payments p
             JOIN invoices i ON i.id = p.invoice_id
             WHERE p.id = ? AND p.invoice_id = ? AND i.user_id = ?`,
            [paymentId, id, req.user.id]
        );
        if (!payment) return res.status(404).json({ message: 'Pago no encontrado' });

        await conn.query(`DELETE FROM invoice_payments WHERE id = ?`, [paymentId]);

        const [[invoice]] = await conn.query(
            `SELECT paid_amount, total_amount FROM invoices WHERE id = ?`, [id]
        );
        const newPaid   = Math.max(0, Number(invoice.paid_amount) - Number(payment.amount));
        const payStatus = newPaid === 0 ? 'unpaid' : newPaid >= invoice.total_amount ? 'paid' : 'partial';
        const invStatus = payStatus === 'paid' ? 'paid' : 'sent';

        await conn.query(
            `UPDATE invoices SET paid_amount=?, payment_status=?, status=? WHERE id=?`,
            [newPaid, payStatus, invStatus, id]
        );

        await conn.commit();
        res.json({ message: 'Pago eliminado' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// ─────────────────────────────────────────────────────────────
// ESTADÍSTICAS
// ─────────────────────────────────────────────────────────────
export const getInvoiceStats = async (req, res) => {
    const userId = req.user.id;
    try {
        // Ingresos por mes (últimos 12)
        const [byMonth] = await pool.query(
            `SELECT DATE_FORMAT(issue_date, '%Y-%m') AS month,
                    SUM(total_amount) AS total,
                    COUNT(*) AS count
             FROM invoices
             WHERE user_id = ? AND is_deleted = 0 AND status != 'draft'
               AND issue_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
             GROUP BY month ORDER BY month ASC`, [userId]
        );

        // Top clientes por facturación
        const [topClients] = await pool.query(
            `SELECT c.name, SUM(i.total_amount) AS total, COUNT(*) AS invoices
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             WHERE i.user_id = ? AND i.is_deleted = 0 AND i.status = 'paid'
             GROUP BY c.id ORDER BY total DESC LIMIT 5`, [userId]
        );

        // Resumen fiscal (IVA)
        const [taxSummary] = await pool.query(
            `SELECT
               SUM(subtotal_amount) AS base_imponible,
               SUM(tax_amount)      AS total_iva,
               SUM(total_amount)    AS total_con_iva
             FROM invoices
             WHERE user_id = ? AND is_deleted = 0
               AND status IN ('sent','paid')
               AND YEAR(issue_date) = YEAR(CURDATE())`, [userId]
        );

        // Conteo por estado
        const [byStatus] = await pool.query(
            `SELECT status, COUNT(*) AS count, SUM(total_amount) AS total
             FROM invoices
             WHERE user_id = ? AND is_deleted = 0
             GROUP BY status`, [userId]
        );

        // Tiempo medio de cobro
        const [[avgDays]] = await pool.query(
            `SELECT AVG(DATEDIFF(paid_at, issue_date)) AS avg_days
             FROM invoices
             WHERE user_id = ? AND is_deleted = 0 AND payment_status = 'paid'
               AND paid_at IS NOT NULL`, [userId]
        );

        res.json({ byMonth, topClients, taxSummary: taxSummary[0], byStatus, avgDays: avgDays.avg_days });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE NUMERACIÓN
// ─────────────────────────────────────────────────────────────
export const getInvoiceSettings = async (req, res) => {
    try {
        let [rows] = await pool.query(
            `SELECT * FROM invoice_settings WHERE user_id = ?`, [req.user.id]
        );
        if (rows.length === 0) {
            await pool.query(
                `INSERT INTO invoice_settings (user_id, prefix, next_number, padding, current_year)
                 VALUES (?, 'FAC', 1, 4, ?)`, [req.user.id, new Date().getFullYear()]
            );
            [rows] = await pool.query(`SELECT * FROM invoice_settings WHERE user_id = ?`, [req.user.id]);
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateInvoiceSettings = async (req, res) => {
    const { prefix, padding, reset_yearly } = req.body;
    try {
        await pool.query(
            `UPDATE invoice_settings SET prefix=?, padding=?, reset_yearly=? WHERE user_id=?`,
            [prefix, padding, reset_yearly ? 1 : 0, req.user.id]
        );
        res.json({ message: 'Configuración guardada' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────
export const downloadInvoicePDF = async (req, res) => {
    const { id } = req.params;
    try {
        const [[invoice]] = await pool.query(
            `SELECT i.*, u.name AS issuer_name, u.email AS issuer_email, u.company_name AS issuer_company
             FROM invoices i
             JOIN users u ON u.id = i.user_id
             WHERE i.id = ? AND i.user_id = ? AND i.is_deleted = 0`,
            [id, req.user.id]
        );
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        const [items] = await pool.query(
            `SELECT * FROM invoice_items WHERE invoice_id = ? AND is_deleted = 0`, [id]
        );
        const [[client]] = await pool.query(
            `SELECT name, email, company, document FROM clients WHERE id = ? AND is_deleted = 0`,
            [invoice.client_id]
        );

        res.setHeader('Content-Disposition', `attachment; filename=factura-${invoice.invoice_number}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        generateInvoicePDF(invoice, items, client, res);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};