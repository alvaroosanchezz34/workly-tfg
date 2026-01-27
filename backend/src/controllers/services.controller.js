import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

// Obtener servicios
export const getServices = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT *
     FROM services
     WHERE user_id = ? AND is_deleted = 0
     ORDER BY id DESC`,
    [req.user.id]
  );
  res.json(rows);
};

// Crear servicio
export const createService = async (req, res) => {
  const { name, default_rate, unit } = req.body;

  const [result] = await pool.query(
    `INSERT INTO services (user_id, name, default_rate, unit)
     VALUES (?, ?, ?, ?)`,
    [req.user.id, name, default_rate, unit]
  );

  await logActivity({
    userId: req.user.id,
    entity: 'service',
    entityId: result.insertId,
    action: 'created',
  });

  res.status(201).json({ id: result.insertId });
};

// Actualizar servicio
export const updateService = async (req, res) => {
  const { id } = req.params;
  const { name, default_rate, unit } = req.body;

  await pool.query(
    `UPDATE services
     SET name = ?, default_rate = ?, unit = ?
     WHERE id = ? AND user_id = ?`,
    [name, default_rate, unit, id, req.user.id]
  );

  await logActivity({
    userId: req.user.id,
    entity: 'service',
    entityId: id,
    action: 'updated',
  });

  res.json({ message: 'Servicio actualizado' });
};

// Soft delete
export const deleteService = async (req, res) => {
  const { id } = req.params;

  await pool.query(
    `UPDATE services
     SET is_deleted = 1,
         deleted_at = NOW(),
         deleted_by = ?
     WHERE id = ? AND user_id = ?`,
    [req.user.id, id, req.user.id]
  );

  await logActivity({
    userId: req.user.id,
    entity: 'service',
    entityId: id,
    action: 'deleted',
  });

  res.json({ message: 'Servicio eliminado' });
};
