import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

const addInterval = (date, frequency) => {
    const d = new Date(date);
    switch (frequency) {
        case 'weekly':    d.setDate(d.getDate() + 7);    break;
        case 'monthly':   d.setMonth(d.getMonth() + 1);  break;
        case 'quarterly': d.setMonth(d.getMonth() + 3);  break;
        case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString().split('T')[0];
};

// Crear factura recurrente
export const createRecurring = async (req, res) => {
    const { client_id, project_id, frequency, next_date, end_date, notes, items } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [client] = await conn.query(
            `SELECT id FROM clients WHERE id=? AND user_id=? AND is_deleted=0`, [client_id, req.user.id]
        );
        if (client.length === 0) throw new Error('Cliente no válido');

        let subtotal = 0, taxTotal = 0;
        for (const item of (items || [])) {
            const sub = Number(item.quantity) * Number(item.unit_price);
            subtotal += sub;
            taxTotal += Math.round(sub * Number(item.tax_rate ?? 21) / 100 * 100) / 100;
        }

        const [result] = await conn.query(
            `INSERT INTO recurring_invoices
               (user_id, client_id, project_id, frequency, next_date, end_date, notes,
                subtotal_amount, tax_amount, total_amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, client_id, project_id || null, frequency, next_date, end_date || null,
             notes, subtotal, taxTotal, subtotal + taxTotal]
        );
        const recurringId = result.insertId;

        for (const item of (items || [])) {
            const sub       = Number(item.quantity) * Number(item.unit_price);
            const taxRate   = Number(item.tax_rate ?? 21);
            const taxAmount = Math.round(sub * taxRate / 100 * 100) / 100;
            await conn.query(
                `INSERT INTO recurring_invoice_items
                   (recurring_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [recurringId, item.description, item.quantity, item.unit_price, taxRate, sub, taxAmount, sub + taxAmount]
            );
        }

        await conn.commit();
        res.status(201).json({ message: 'Factura recurrente creada', recurringId });
    } catch (err) {
        await conn.rollback();
        res.status(400).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// Listar recurrentes
export const getRecurring = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT r.*, c.name AS client_name FROM recurring_invoices r
             JOIN clients c ON c.id = r.client_id
             WHERE r.user_id = ? AND c.is_deleted = 0
             ORDER BY r.next_date ASC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Actualizar estado (pause/resume/finish)
export const updateRecurringStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active','paused','finished'].includes(status))
        return res.status(400).json({ message: 'Estado no válido' });
    try {
        await pool.query(
            `UPDATE recurring_invoices SET status=? WHERE id=? AND user_id=?`, [status, id, req.user.id]
        );
        res.json({ message: 'Estado actualizado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Eliminar recurrente
export const deleteRecurring = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`DELETE FROM recurring_invoices WHERE id=? AND user_id=?`, [id, req.user.id]);
        res.json({ message: 'Factura recurrente eliminada' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Obtener recurrente con sus líneas
export const getRecurringById = async (req, res) => {
    const { id } = req.params;
    try {
        const [[rec]] = await pool.query(
            `SELECT r.*, c.name AS client_name FROM recurring_invoices r
             JOIN clients c ON c.id = r.client_id
             WHERE r.id=? AND r.user_id=?`, [id, req.user.id]
        );
        if (!rec) return res.status(404).json({ message: 'No encontrada' });
        const [items] = await pool.query(
            `SELECT * FROM recurring_invoice_items WHERE recurring_id=?`, [id]
        );
        res.json({ ...rec, items });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Función para ejecutar como cron job (llamar desde un script externo o endpoint admin)
 * Genera facturas automáticas para todas las recurrentes con next_date <= hoy
 */
export const processRecurringInvoices = async (req, res) => {
    const conn = await pool.getConnection();
    let generated = 0;
    try {
        await conn.beginTransaction();
        const [due] = await conn.query(
            `SELECT r.*, u.id AS owner_id FROM recurring_invoices r
             JOIN users u ON u.id = r.user_id
             WHERE r.status = 'active' AND r.next_date <= CURDATE()
               AND (r.end_date IS NULL OR r.end_date >= CURDATE())`
        );

        for (const rec of due) {
            const year = new Date().getFullYear();
            let [cfgRows] = await conn.query(`SELECT * FROM invoice_settings WHERE user_id=?`, [rec.owner_id]);
            if (cfgRows.length === 0) {
                await conn.query(
                    `INSERT INTO invoice_settings (user_id, prefix, next_number, padding, current_year) VALUES (?, 'FAC', 1, 4, ?)`,
                    [rec.owner_id, year]
                );
                [cfgRows] = await conn.query(`SELECT * FROM invoice_settings WHERE user_id=?`, [rec.owner_id]);
            }
            const cfg    = cfgRows[0];
            const seq    = cfg.next_number;
            const number = `${cfg.prefix}-${year}-${String(seq).padStart(cfg.padding, '0')}`;
            await conn.query(`UPDATE invoice_settings SET next_number=next_number+1 WHERE user_id=?`, [rec.owner_id]);

            const dueDate = addInterval(rec.next_date, rec.frequency);
            const [invResult] = await conn.query(
                `INSERT INTO invoices (user_id, client_id, project_id, invoice_number, invoice_seq, invoice_year,
                  issue_date, due_date, status, notes, subtotal_amount, tax_amount, total_amount)
                 VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, 'draft', ?, ?, ?, ?)`,
                [rec.owner_id, rec.client_id, rec.project_id, number, seq, year,
                 dueDate, rec.notes, rec.subtotal_amount, rec.tax_amount, rec.total_amount]
            );
            const invId = invResult.insertId;

            const [items] = await conn.query(
                `SELECT * FROM recurring_invoice_items WHERE recurring_id=?`, [rec.id]
            );
            for (const item of items) {
                await conn.query(
                    `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate, subtotal, tax_amount, total)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [invId, item.description, item.quantity, item.unit_price, item.tax_rate, item.subtotal, item.tax_amount, item.total]
                );
            }

            // Actualizar next_date o finalizar
            const nextDate = addInterval(rec.next_date, rec.frequency);
            const finished = rec.end_date && nextDate > rec.end_date;
            await conn.query(
                `UPDATE recurring_invoices SET next_date=?, status=? WHERE id=?`,
                [nextDate, finished ? 'finished' : 'active', rec.id]
            );
            await logActivity({ userId: rec.owner_id, entity: 'invoice', entityId: invId, action: 'created' });
            generated++;
        }

        await conn.commit();
        res.json({ message: `${generated} facturas generadas` });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};