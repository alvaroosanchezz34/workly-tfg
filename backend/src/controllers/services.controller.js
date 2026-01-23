import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

// Crear servicio
export const createService = async (req, res) => {
  const { name, default_rate, unit } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO services
       (user_id, name, default_rate, unit)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, name, default_rate, unit]
    );

    await logActivity({
      userId: req.user.id,
      entity: 'service',
      entityId: result.insertId,
      action: 'created',
    });

    res.status(201).json({
      message: 'Servicio creado',
      serviceId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener servicios del usuario (NO eliminados)
export const getServices = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM services
       WHERE user_id = ?
       AND is_deleted = 0
       ORDER BY name ASC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener servicio por ID (NO eliminado)
export const getServiceById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM services
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Servicio no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar servicio (solo si NO está eliminado)
export const updateService = async (req, res) => {
  const { id } = req.params;
  const { name, default_rate, unit } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE services
       SET name = ?, default_rate = ?, unit = ?
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
      [name, default_rate, unit, id, req.user.id]
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

// Eliminar servicio (SOFT DELETE)
export const deleteService = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `UPDATE services
       SET is_deleted = 1,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
      [req.user.id, id, req.user.id]
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

    res.json({ message: 'Servicio eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
