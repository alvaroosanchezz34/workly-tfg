// EXPENSES CONTROLLER
import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import { resourceScope } from '../utils/scope.js';

// Crear gasto
export const createExpense = async (req, res) => {
    const { category, description, amount, date, receipt_url } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO expenses
       (user_id, company_id, category, description, amount, date, receipt_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, req.user.company_id || null, category, description, amount, date, receipt_url]
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

// Obtener gastos del usuario (NO eliminados) — paginado
export const getExpenses = async (req, res) => {
    const { category, date_from, date_to } = req.query;
    const { page, pageSize, limit, offset } = getPagination(req.query);

    try {
        const scope  = resourceScope(req);
        let where    = `WHERE ${scope.where} AND is_deleted = 0`;
        const params = [...scope.params];

        if (category)  { where += ` AND category = ?`;   params.push(category); }
        if (date_from) { where += ` AND date >= ?`;       params.push(date_from); }
        if (date_to)   { where += ` AND date <= ?`;       params.push(date_to); }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM expenses ${where}`, params
        );
        const [rows] = await pool.query(
            `SELECT * FROM expenses ${where} ORDER BY date DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json(paginatedResponse(rows, total, page, pageSize));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener gasto por ID (NO eliminado)
export const getExpenseById = async (req, res) => {
    const { id } = req.params;

    try {
        const scope = resourceScope(req);
        const [rows] = await pool.query(
            `SELECT *
       FROM expenses
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 0`,
            [id, ...scope.params]
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
        const scope = resourceScope(req);
        const [result] = await pool.query(
            `UPDATE expenses
       SET category = ?, description = ?, amount = ?, date = ?, receipt_url = ?
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 0`,
            [category, description, amount, date, receipt_url, id, ...scope.params]
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
        const scope = resourceScope(req);
        const [result] = await pool.query(
            `UPDATE expenses
       SET is_deleted = 1,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 0`,
            [req.user.id, id, ...scope.params]
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