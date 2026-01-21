import { pool } from '../config/db.js';

// Crear proyecto
export const createProject = async (req, res) => {
    const {
        client_id,
        title,
        description,
        status,
        start_date,
        end_date,
        budget
    } = req.body;

    try {
        // comprobar que el cliente pertenece al usuario
        const [client] = await pool.query(
            'SELECT id FROM clients WHERE id = ? AND user_id = ?',
            [client_id, req.user.id]
        );

        if (client.length === 0) {
            return res.status(403).json({ message: 'Cliente no válido' });
        }

        const [result] = await pool.query(
            `INSERT INTO projects
      (user_id, client_id, title, description, status, start_date, end_date, budget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                client_id,
                title,
                description,
                status || 'pending',
                start_date,
                end_date,
                budget
            ]
        );

        res.status(201).json({
            message: 'Proyecto creado',
            projectId: result.insertId
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener proyectos del usuario
export const getProjects = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT p.*, c.name AS client_name
       FROM projects p
       JOIN clients c ON p.client_id = c.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener proyecto por ID
export const getProjectById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            'SELECT * FROM projects WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar proyecto
export const updateProject = async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        status,
        start_date,
        end_date,
        budget
    } = req.body;

    try {
        await pool.query(
            `UPDATE projects
       SET title = ?, description = ?, status = ?, start_date = ?, end_date = ?, budget = ?
       WHERE id = ? AND user_id = ?`,
            [
                title,
                description,
                status,
                start_date,
                end_date,
                budget,
                id,
                req.user.id
            ]
        );

        res.json({ message: 'Proyecto actualizado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Eliminar proyecto
export const deleteProject = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query(
            'DELETE FROM projects WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        res.json({ message: 'Proyecto eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
