import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

const recalcQuoteTotals = async (conn, quoteId) => {
    const [items] = await conn.query(
        `SELECT subtotal, tax_amount, total FROM quote_items WHERE quote_id = ? AND is_deleted = 0`,
        [quoteId]
    );
    const subtotal = items.reduce((s, i) => s + Number(i.subtotal), 0);
    const tax      = items.reduce((s, i) => s + Number(i.tax_amount), 0);
    const total    = subtotal + tax;
    await conn.query(
        `UPDATE quotes SET subtotal_amount=?, tax_amount=?, total_amount=? WHERE id=?`,
        [subtotal, tax, total, quoteId]
    );
    return { subtotal, tax, total };
};

const getNextQuoteNumber = async (conn, userId) => {
    const year = new Date().getFullYear();
    const [[row]] = await conn.query(
        `SELECT COUNT(*)+1 AS seq FROM quotes WHERE user_id = ? AND YEAR(issue_date) = ?`,
        [userId, year]
    );
    return `PRE-${year}-${String(row.seq).padStart(4, '0')}`;
};

// Crear presupuesto
export const createQuote = async (req, res) => {
    const { client_id, project_id, issue_date, expiry_date, notes, items } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        if (!Array.isArray(items) || items.length === 0)
            throw new Error('El presupuesto debe tener al menos una línea');

        const [client] = await conn.query(
            `SELECT id FROM clients WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            [client_id, req.user.id]
        );
        if (client.length === 0) throw new Error('Cliente no válido');

        const quoteNumber = await getNextQuoteNumber(conn, req.user.id);

        const [result] = await conn.query(
            `INSERT INTO quotes (user_id, client_id, project_id, quote_number, issue_date, expiry_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, client_id, project_id || null, quoteNumber, issue_date, expiry_date || null, notes]
        );
        const quoteId = result.insertId;

        for (const item of items) {
            const subtotal  = Number(item.quantity) * Number(item.unit_price);
            const taxRate   = Number(item.tax_rate ?? 21);
            const taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
            await conn.query(
                `INSERT INTO quote_items (quote_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [quoteId, item.description, item.quantity, item.unit_price, taxRate, subtotal, taxAmount, subtotal + taxAmount]
            );
        }

        await recalcQuoteTotals(conn, quoteId);
        await logActivity({ userId: req.user.id, entity: 'quote', entityId: quoteId, action: 'created' });
        await conn.commit();
        res.status(201).json({ message: 'Presupuesto creado', quoteId, quote_number: quoteNumber });
    } catch (err) {
        await conn.rollback();
        res.status(400).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// Listar presupuestos
export const getQuotes = async (req, res) => {
    // Marcar expirados
    await pool.query(
        `UPDATE quotes SET status = 'expired'
         WHERE user_id = ? AND status = 'sent' AND expiry_date < CURDATE() AND is_deleted = 0`,
        [req.user.id]
    );
    try {
        const [rows] = await pool.query(
            `SELECT q.*, c.name AS client_name FROM quotes q
             JOIN clients c ON c.id = q.client_id
             WHERE q.user_id = ? AND q.is_deleted = 0 AND c.is_deleted = 0
             ORDER BY q.created_at DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Obtener presupuesto por ID
export const getQuoteById = async (req, res) => {
    const { id } = req.params;
    try {
        const [[quote]] = await pool.query(
            `SELECT q.*, c.name AS client_name FROM quotes q
             JOIN clients c ON c.id = q.client_id
             WHERE q.id = ? AND q.user_id = ? AND q.is_deleted = 0`,
            [id, req.user.id]
        );
        if (!quote) return res.status(404).json({ message: 'Presupuesto no encontrado' });

        const [items] = await pool.query(
            `SELECT * FROM quote_items WHERE quote_id = ? AND is_deleted = 0`, [id]
        );
        res.json({ ...quote, items });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Actualizar presupuesto
export const updateQuote = async (req, res) => {
    const { id } = req.params;
    const { client_id, project_id, issue_date, expiry_date, status, notes, items } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[quote]] = await conn.query(
            `SELECT id, status FROM quotes WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            [id, req.user.id]
        );
        if (!quote) return res.status(404).json({ message: 'Presupuesto no encontrado' });
        if (['accepted', 'rejected'].includes(quote.status))
            return res.status(400).json({ message: 'No se puede modificar un presupuesto cerrado' });

        await conn.query(
            `UPDATE quotes SET client_id=?, project_id=?, issue_date=?, expiry_date=?, status=?, notes=?
             WHERE id=?`,
            [client_id, project_id || null, issue_date, expiry_date || null, status, notes, id]
        );
        await conn.query(`UPDATE quote_items SET is_deleted=1 WHERE quote_id=?`, [id]);

        if (Array.isArray(items)) {
            for (const item of items) {
                const subtotal  = Number(item.quantity) * Number(item.unit_price);
                const taxRate   = Number(item.tax_rate ?? 21);
                const taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
                await conn.query(
                    `INSERT INTO quote_items (quote_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, item.description, item.quantity, item.unit_price, taxRate, subtotal, taxAmount, subtotal + taxAmount]
                );
            }
        }

        await recalcQuoteTotals(conn, id);
        await logActivity({ userId: req.user.id, entity: 'quote', entityId: id, action: 'updated' });
        await conn.commit();
        res.json({ message: 'Presupuesto actualizado' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// Eliminar presupuesto
export const deleteQuote = async (req, res) => {
    const { id } = req.params;
    try {
        const [[quote]] = await pool.query(
            `SELECT id FROM quotes WHERE id = ? AND user_id = ? AND is_deleted = 0`, [id, req.user.id]
        );
        if (!quote) return res.status(404).json({ message: 'Presupuesto no encontrado' });
        await pool.query(`UPDATE quotes SET is_deleted=1, deleted_at=NOW() WHERE id=?`, [id]);
        res.json({ message: 'Presupuesto eliminado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Convertir presupuesto en factura
export const convertQuoteToInvoice = async (req, res) => {
    const { id } = req.params;
    const { issue_date, due_date } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[quote]] = await conn.query(
            `SELECT * FROM quotes WHERE id = ? AND user_id = ? AND is_deleted = 0`, [id, req.user.id]
        );
        if (!quote) return res.status(404).json({ message: 'Presupuesto no encontrado' });
        if (quote.converted_to_invoice_id)
            return res.status(400).json({ message: 'Este presupuesto ya fue convertido' });

        // Importar función de numeración inline
        const currentYear = new Date().getFullYear();
        let [cfgRows] = await conn.query(`SELECT * FROM invoice_settings WHERE user_id = ?`, [req.user.id]);
        if (cfgRows.length === 0) {
            await conn.query(
                `INSERT INTO invoice_settings (user_id, prefix, next_number, padding, current_year) VALUES (?, 'FAC', 1, 4, ?)`,
                [req.user.id, currentYear]
            );
            [cfgRows] = await conn.query(`SELECT * FROM invoice_settings WHERE user_id = ?`, [req.user.id]);
        }
        const cfg    = cfgRows[0];
        const seq    = cfg.next_number;
        const padded = String(seq).padStart(cfg.padding, '0');
        const number = `${cfg.prefix}-${currentYear}-${padded}`;
        await conn.query(`UPDATE invoice_settings SET next_number = next_number + 1 WHERE user_id = ?`, [req.user.id]);

        const [result] = await conn.query(
            `INSERT INTO invoices (user_id, client_id, project_id, invoice_number, invoice_seq, invoice_year,
              issue_date, due_date, status, notes, subtotal_amount, tax_amount, total_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
            [req.user.id, quote.client_id, quote.project_id, number, seq, currentYear,
             issue_date || quote.issue_date, due_date || quote.expiry_date,
             quote.notes, quote.subtotal_amount, quote.tax_amount, quote.total_amount]
        );
        const invoiceId = result.insertId;

        const [qItems] = await conn.query(
            `SELECT * FROM quote_items WHERE quote_id = ? AND is_deleted = 0`, [id]
        );
        for (const item of qItems) {
            await conn.query(
                `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [invoiceId, item.description, item.quantity, item.unit_price, item.tax_rate, item.subtotal, item.tax_amount, item.total]
            );
        }

        await conn.query(
            `UPDATE quotes SET status='accepted', converted_to_invoice_id=? WHERE id=?`,
            [invoiceId, id]
        );

        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: invoiceId, action: 'created' });
        await conn.commit();
        res.status(201).json({ message: 'Factura creada desde presupuesto', invoiceId, invoice_number: number });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};