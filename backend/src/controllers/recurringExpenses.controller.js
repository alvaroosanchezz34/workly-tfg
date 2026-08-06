// backend/src/controllers/recurringExpenses.controller.js
import { pool } from '../config/db.js';
import { resourceScope } from '../utils/scope.js';

const addInterval = (date, frequency) => {
    const d = new Date(date);
    switch (frequency) {
        case 'weekly':    d.setDate(d.getDate() + 7);    break;
        case 'monthly':   d.setMonth(d.getMonth() + 1);  break;
        case 'quarterly': d.setMonth(d.getMonth() + 3);  break;
        case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
    }
    return d;
};

// Crear gasto recurrente
export const createRecurringExpense = async (req, res) => {
    const { category, description, amount, frequency, next_date, end_date } = req.body;
    if (!amount || !next_date) return res.status(400).json({ message: 'Importe y fecha de inicio son obligatorios' });
    if (!['weekly','monthly','quarterly','yearly'].includes(frequency)) return res.status(400).json({ message: 'Frecuencia no válida' });

    try {
        const [result] = await pool.query(
            `INSERT INTO recurring_expenses (user_id, company_id, category, description, amount, frequency, next_date, end_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, req.user.company_id || null, category || null, description || null, amount, frequency, next_date, end_date || null]
        );
        res.status(201).json({ message: 'Gasto recurrente creado', recurringExpenseId: result.insertId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Listar gastos recurrentes
export const getRecurringExpenses = async (req, res) => {
    try {
        const scope = resourceScope(req);
        const [rows] = await pool.query(
            `SELECT * FROM recurring_expenses WHERE ${scope.where} AND is_deleted = 0 ORDER BY next_date ASC`,
            scope.params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Cambiar estado (pausar/reanudar/finalizar)
export const updateRecurringExpenseStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active','paused','finished'].includes(status)) return res.status(400).json({ message: 'Estado no válido' });

    try {
        const scope = resourceScope(req);
        const [result] = await pool.query(
            `UPDATE recurring_expenses SET status = ? WHERE id = ? AND ${scope.where}`,
            [status, id, ...scope.params]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Estado actualizado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Eliminar (soft delete)
export const deleteRecurringExpense = async (req, res) => {
    const { id } = req.params;
    try {
        const scope = resourceScope(req);
        const [result] = await pool.query(
            `UPDATE recurring_expenses SET is_deleted = 1 WHERE id = ? AND ${scope.where}`,
            [id, ...scope.params]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Gasto recurrente eliminado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Procesar gastos recurrentes vencidos — llamado por el scheduler diario.
// Exportado también para poder testearlo/dispararlo manualmente si hace falta.
export const processRecurringExpenses = async () => {
    const [due] = await pool.query(
        `SELECT * FROM recurring_expenses
         WHERE status = 'active' AND next_date <= CURDATE() AND is_deleted = 0
           AND (end_date IS NULL OR end_date >= CURDATE())
         LIMIT 100`
    );

    let generated = 0;
    for (const rec of due) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            await conn.query(
                `INSERT INTO expenses (user_id, company_id, category, description, amount, date)
                 VALUES (?, ?, ?, ?, ?, CURDATE())`,
                [rec.user_id, rec.company_id, rec.category, rec.description || 'Gasto recurrente', rec.amount]
            );

            const nextDate = addInterval(rec.next_date, rec.frequency);
            const finished = rec.end_date && nextDate > new Date(rec.end_date);

            await conn.query(
                `UPDATE recurring_expenses SET next_date = ?, last_generated = NOW(), status = ? WHERE id = ?`,
                [nextDate.toISOString().split('T')[0], finished ? 'finished' : 'active', rec.id]
            );

            await conn.commit();
            generated++;
        } catch (err) {
            await conn.rollback();
            console.error(`[RecurringExpenses] Error procesando #${rec.id}:`, err.message);
        } finally {
            conn.release();
        }
    }
    return generated;
};
