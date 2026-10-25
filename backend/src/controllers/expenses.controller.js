// EXPENSES CONTROLLER
import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import { resourceScope } from '../utils/scope.js';
import { getLimit } from '../config/plans.js';

// Acepta 'YYYY-MM-DD' o 'DD/MM/YYYY' (formato español habitual en CSV exportados de Excel)
const normalizeDate = raw => {
    if (!raw) return null;
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return null;
};

// Crear gasto
export const createExpense = async (req, res) => {
    const { category, description, amount, date, receipt_url, receipt_image } = req.body;
    const photo = receipt_image ? String(receipt_image) : null;
    if (photo && (!/^data:image\/(png|jpeg);base64,/.test(photo) || photo.length > 180000)) {
        return res.status(400).json({ message: 'La foto del ticket tiene que ser JPG o PNG y pesar poco' });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO expenses
       (user_id, company_id, category, description, amount, date, receipt_url, receipt_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, req.user.company_id || null, category, description, amount, date, receipt_url, photo]
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
            `SELECT id, user_id, company_id, category, description, amount, date, receipt_url,
                    (receipt_image IS NOT NULL) AS has_receipt, created_at
             FROM expenses ${where} ORDER BY date DESC LIMIT ? OFFSET ?`,
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

// Importar gastos desde CSV (ya parseado a objetos por el frontend)
// body: { rows: [{ date, category, description, amount }, ...] }
export const importExpenses = async (req, res) => {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: 'No hay filas para importar' });
    if (rows.length > 500) return res.status(400).json({ message: 'Máximo 500 filas por importación' });

    try {
        const limit = getLimit(req.user, 'expenses');
        let allowed = rows;
        let overLimit = 0;
        if (limit !== -1) {
            const [[{ cnt }]] = await pool.query(
                `SELECT COUNT(*) AS cnt FROM expenses WHERE user_id = ? AND is_deleted = 0`, [req.user.id]
            );
            const remaining = Math.max(0, limit - cnt);
            allowed = rows.slice(0, remaining);
            overLimit = rows.length - allowed.length;
        }

        let imported = 0, invalid = 0;
        for (const row of allowed) {
            const date   = normalizeDate(row.date || row.fecha);
            const amount = Number(row.amount ?? row.importe ?? row.amount_eur);
            if (!date || !(amount > 0)) { invalid++; continue; }
            await pool.query(
                `INSERT INTO expenses (user_id, company_id, category, description, amount, date)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [req.user.id, req.user.company_id || null, row.category || row.categoria || 'otros',
                 row.description || row.descripcion || null, amount, date]
            );
            imported++;
        }

        res.status(201).json({
            message: `${imported} gasto(s) importado(s)` +
                (invalid ? `, ${invalid} fila(s) inválida(s) omitida(s) (fecha o importe incorrectos)` : '') +
                (overLimit ? `, ${overLimit} fila(s) omitida(s) por el límite del plan Free` : ''),
            imported, invalid, overLimit,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};