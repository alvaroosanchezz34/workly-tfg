// EXPENSES CONTROLLER
import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

// Crear gasto
export const createExpense = async (req, res) => {
    const { category, description, amount, date, receipt_url } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO expenses
       (user_id, category, description, amount, date, receipt_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.id, category, description, amount, date, receipt_url]
        );

        await logActivity({
            userId: req.user.id,
            entity: 'expense',
            entityId: result.insertId,
            action: 'created',
        });

        res.status(201).json({
            message: 'Gasto creado',
            expenseId: result.insertId,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener gastos del usuario (NO eliminados)
export const getExpenses = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT *
       FROM expenses
       WHERE user_id = ?
       AND is_deleted = 0
       ORDER BY date DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener gasto por ID (NO eliminado)
export const getExpenseById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT *
       FROM expenses
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
            [id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Gasto no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar gasto (solo si NO está eliminado)
export const updateExpense = async (req, res) => {
    const { id } = req.params;
    const { category, description, amount, date, receipt_url } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE expenses
       SET category = ?, description = ?, amount = ?, date = ?, receipt_url = ?
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
            [category, description, amount, date, receipt_url, id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Gasto no encontrado' });
        }

        await logActivity({
            userId: req.user.id,
            entity: 'expense',
            entityId: id,
            action: 'updated',
        });

        res.json({ message: 'Gasto actualizado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Eliminar gasto (SOFT DELETE)
export const deleteExpense = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            `UPDATE expenses
       SET is_deleted = 1,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
            [req.user.id, id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Gasto no encontrado' });
        }

        await logActivity({
            userId: req.user.id,
            entity: 'expense',
            entityId: id,
            action: 'deleted',
        });

        res.json({ message: 'Gasto eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
