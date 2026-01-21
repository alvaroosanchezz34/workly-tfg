import { pool } from '../config/db.js';

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

        res.status(201).json({
            message: 'Gasto creado',
            expenseId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener gastos del usuario
export const getExpenses = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC',
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener gasto por ID
export const getExpenseById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            'SELECT * FROM expenses WHERE id = ? AND user_id = ?',
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

// Actualizar gasto
export const updateExpense = async (req, res) => {
    const { id } = req.params;
    const { category, description, amount, date, receipt_url } = req.body;

    try {
        await pool.query(
            `UPDATE expenses
       SET category = ?, description = ?, amount = ?, date = ?, receipt_url = ?
       WHERE id = ? AND user_id = ?`,
            [category, description, amount, date, receipt_url, id, req.user.id]
        );

        res.json({ message: 'Gasto actualizado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Eliminar gasto
export const deleteExpense = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            'DELETE FROM expenses WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        res.json({ message: 'Gasto eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
