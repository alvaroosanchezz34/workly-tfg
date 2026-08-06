import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';
import { resourceScope } from '../utils/scope.js';

// Obtener servicios
export const getServices = async (req, res) => {
    try {
        const scope = resourceScope(req);
        const [rows] = await pool.query(
            `SELECT *
             FROM services
             WHERE ${scope.where} AND is_deleted = 0
             ORDER BY id DESC`,
            scope.params
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear servicio
export const createService = async (req, res) => {
    const { name, default_rate, unit } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'El nombre del servicio es obligatorio' });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO services (user_id, company_id, name, default_rate, unit)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, req.user.company_id || null, name, default_rate || null, unit || null]
        );

        await logActivity({
            userId: req.user.id,
            entity: 'service',
            entityId: result.insertId,
            action: 'created',
        });

        res.status(201).json({ id: result.insertId, message: 'Servicio creado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar servicio
export const updateService = async (req, res) => {
    const { id } = req.params;
    const { name, default_rate, unit } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'El nombre del servicio es obligatorio' });
    }

    try {
        const scope = resourceScope(req);
        const [result] = await pool.query(
            `UPDATE services
             SET name = ?, default_rate = ?, unit = ?
             WHERE id = ? AND ${scope.where} AND is_deleted = 0`,
            [name, default_rate || null, unit || null, id, ...scope.params]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        await logActivity({
            userId: req.user.id,
            entity: 'service',
            entityId: id,
            action: 'updated',
        });

        res.json({ message: 'Servicio actualizado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Soft delete
export const deleteService = async (req, res) => {
    const { id } = req.params;

    try {
        const scope = resourceScope(req);
        const [result] = await pool.query(
            `UPDATE services
             SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?
             WHERE id = ? AND ${scope.where} AND is_deleted = 0`,
            [req.user.id, id, ...scope.params]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Servicio no encontrado' });
        }

        await logActivity({
            userId: req.user.id,
            entity: 'service',
            entityId: id,
            action: 'deleted',
        });

        res.json({ message: 'Servicio eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};