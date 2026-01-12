import { pool } from '../config/db.js';

// Crear cliente
export const createClient = async (req, res) => {
    const { name, email, phone, company, notes, document } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO clients (user_id, name, email, phone, company, notes, document)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, name, email, phone, company, notes, document]
        );

        res.status(201).json({
            message: 'Cliente creado',
            clientId: result.insertId,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener todos los clientes del usuario
export const getClients = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM clients WHERE user_id = ? ORDER BY created_at DESC',
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
            'SELECT * FROM clients WHERE id = ? AND user_id = ?',
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
        await pool.query(
            `UPDATE clients
            SET name = ?, email = ?, phone = ?, company = ?, notes = ?, document = ?
            WHERE id = ? AND user_id = ?`,
            [name, email, phone, company, notes, document, id, req.user.id]
        );

        res.json({ message: 'Cliente actualizado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Eliminar cliente
export const deleteClient = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            'DELETE FROM clients WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        res.json({ message: 'Cliente eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
