import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';


// Crear cliente
export const createClient = async (req, res) => {
    const { name, email, phone, company, notes, document } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO clients 
      (user_id, name, email, phone, company, notes, document)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, name, email, phone, company, notes, document]
        );
        await logActivity({
            userId: req.user.id,
            entity: 'client',
            entityId: result.insertId,
            action: 'created',
        });
        res.status(201).json({
            message: 'Cliente creado',
            clientId: result.insertId,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener todos los clientes del usuario (NO borrados)
export const getClients = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT *
       FROM clients
       WHERE user_id = ?
       AND is_deleted = 0
       ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener cliente por ID
export const getClientById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT *
       FROM clients
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
            [id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar cliente
export const updateClient = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, company, notes, document } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE clients
       SET name = ?, email = ?, phone = ?, company = ?, notes = ?, document = ?
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
            [name, email, phone, company, notes, document, id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        await logActivity({
            userId: req.user.id,
            entity: 'client',
            entityId: id,
            action: 'updated',
        });
        res.json({ message: 'Cliente actualizado' });


    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Eliminar cliente (SOFT DELETE)
export const deleteClient = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            `UPDATE clients
       SET is_deleted = 1,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
            [req.user.id, id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        await logActivity({
            userId: req.user.id,
            entity: 'client',
            entityId: id,
            action: 'deleted',
        });

        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener clientes eliminados
export const getDeletedClients = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT *
       FROM clients
       WHERE user_id = ?
       AND is_deleted = 1
       ORDER BY deleted_at DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Restaurar cliente
export const restoreClient = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            `UPDATE clients
       SET is_deleted = 0,
           deleted_at = NULL,
           deleted_by = NULL
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 1`,
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        await logActivity({
            userId: req.user.id,
            entity: 'client',
            entityId: id,
            action: 'restored',
        });

        res.json({ message: 'Cliente restaurado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
