import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

const getNextCreditNumber = async (conn, userId) => {
    const year = new Date().getFullYear();
    const [[row]] = await conn.query(
        `SELECT COUNT(*)+1 AS seq FROM credit_notes WHERE user_id = ? AND YEAR(issue_date) = ?`,
        [userId, year]
    );
    return `RC-${year}-${String(row.seq).padStart(4, '0')}`;
};

// Crear nota de crédito
export const createCreditNote = async (req, res) => {
    const { invoice_id, issue_date, reason, items } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[invoice]] = await conn.query(
            `SELECT id, total_amount FROM invoices WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            [invoice_id, req.user.id]
        );
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });

        const creditNumber = await getNextCreditNumber(conn, req.user.id);
        const [result] = await conn.query(
            `INSERT INTO credit_notes (user_id, invoice_id, credit_number, issue_date, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, invoice_id, creditNumber, issue_date, reason]
        );
        const creditId = result.insertId;

        let subtotal = 0, taxTotal = 0;
        for (const item of (items || [])) {
            const sub       = Number(item.quantity) * Number(item.unit_price);
            const taxRate   = Number(item.tax_rate ?? 21);
            const taxAmount = Math.round(sub * taxRate / 100 * 100) / 100;
            subtotal  += sub;
            taxTotal  += taxAmount;
            await conn.query(
                `INSERT INTO credit_note_items (credit_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [creditId, item.description, item.quantity, item.unit_price, taxRate, sub, taxAmount, sub + taxAmount]
            );
        }

        await conn.query(
            `UPDATE credit_notes SET subtotal_amount=?, tax_amount=?, total_amount=? WHERE id=?`,
            [subtotal, taxTotal, subtotal + taxTotal, creditId]
        );

        await logActivity({ userId: req.user.id, entity: 'credit_note', entityId: creditId, action: 'created' });
        await conn.commit();
        res.status(201).json({ message: 'Nota de crédito creada', creditId, credit_number: creditNumber });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// Listar notas de crédito
export const getCreditNotes = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT cn.*, i.invoice_number, c.name AS client_name
             FROM credit_notes cn
             JOIN invoices i ON i.id = cn.invoice_id
             JOIN clients c ON c.id = i.client_id
             WHERE cn.user_id = ? AND cn.is_deleted = 0
             ORDER BY cn.created_at DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Obtener nota de crédito por ID
export const getCreditNoteById = async (req, res) => {
    const { id } = req.params;
    try {
        const [[cn]] = await pool.query(
            `SELECT cn.*, i.invoice_number FROM credit_notes cn
             JOIN invoices i ON i.id = cn.invoice_id
             WHERE cn.id = ? AND cn.user_id = ? AND cn.is_deleted = 0`,
            [id, req.user.id]
        );
        if (!cn) return res.status(404).json({ message: 'Nota de crédito no encontrada' });
        const [items] = await pool.query(`SELECT * FROM credit_note_items WHERE credit_id = ?`, [id]);
        res.json({ ...cn, items });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Emitir nota de crédito (cambiar a issued)
export const issueCreditNote = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(
            `UPDATE credit_notes SET status='issued' WHERE id=? AND user_id=?`, [id, req.user.id]
        );
        res.json({ message: 'Nota de crédito emitida' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Eliminar nota de crédito
export const deleteCreditNote = async (req, res) => {
    const { id } = req.params;
    try {
        const [[cn]] = await pool.query(
            `SELECT status FROM credit_notes WHERE id=? AND user_id=? AND is_deleted=0`, [id, req.user.id]
        );
        if (!cn) return res.status(404).json({ message: 'No encontrada' });
        if (cn.status === 'issued')
            return res.status(400).json({ message: 'No se puede eliminar una nota de crédito emitida' });
        await pool.query(`UPDATE credit_notes SET is_deleted=1, deleted_at=NOW() WHERE id=?`, [id]);
        res.json({ message: 'Nota de crédito eliminada' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};