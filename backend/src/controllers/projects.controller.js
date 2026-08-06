import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';
import { resourceScope } from '../utils/scope.js';

// Crear proyecto
export const createProject = async (req, res) => {
    const {
        client_id,
        title,
        description,
        status,
        start_date,
        end_date,
        budget,
    } = req.body;

    try {
        const scope = resourceScope(req);
        // Comprobar que el cliente está dentro del ámbito del usuario y NO está eliminado
        const [client] = await pool.query(
            `SELECT id
       FROM clients
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 0`,
            [client_id, ...scope.params]
        );

        if (client.length === 0) {
            return res.status(403).json({ message: 'Cliente no válido' });
        }

        const [result] = await pool.query(
            `INSERT INTO projects
       (user_id, company_id, client_id, title, description, status, start_date, end_date, budget)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                req.user.company_id || null,
                client_id,
                title,
                description,
                status || 'pending',
                start_date,
                end_date,
                budget,
            ]
        );

        await logActivity({
            userId: req.user.id,
            entity: 'project',
            entityId: result.insertId,
            action: 'created',
        });

        res.status(201).json({
            message: 'Proyecto creado',
            projectId: result.insertId,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener proyectos del usuario (NO eliminados)
export const getProjects = async (req, res) => {
    const { search } = req.query;
    try {
        const scope  = resourceScope(req, 'p');
        let where    = `${scope.where} AND p.is_deleted = 0 AND c.is_deleted = 0`;
        const params = [...scope.params];
        if (search) {
            where += ` AND (p.title LIKE ? OR c.name LIKE ?)`;
            const like = `%${search}%`;
            params.push(like, like);
        }
        const [rows] = await pool.query(
            `SELECT p.*, c.name AS client_name
             FROM projects p
             JOIN clients c ON p.client_id = c.id
             WHERE ${where}
             ORDER BY p.created_at DESC`,
            params
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener proyecto por ID (NO eliminado)
export const getProjectById = async (req, res) => {
    const { id } = req.params;

    try {
        const scope = resourceScope(req);
        const [rows] = await pool.query(
            `SELECT *
       FROM projects
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 0`,
            [id, ...scope.params]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar proyecto (solo si NO está eliminado)
export const updateProject = async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        status,
        start_date,
        end_date,
        budget,
    } = req.body;

    try {
        const scope = resourceScope(req);
        const [result] = await pool.query(
            `UPDATE projects
       SET title = ?, description = ?, status = ?, start_date = ?, end_date = ?, budget = ?
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 0`,
            [
                title,
                description,
                status,
                start_date,
                end_date,
                budget,
                id,
                ...scope.params,
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        }

        await logActivity({
            userId: req.user.id,
            entity: 'project',
            entityId: id,
            action: 'updated',
        });

        res.json({ message: 'Proyecto actualizado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Eliminar proyecto (SOFT DELETE)
export const deleteProject = async (req, res) => {
    const { id } = req.params;

    try {
        const scope = resourceScope(req);
        const [result] = await pool.query(
            `UPDATE projects
       SET is_deleted = 1,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 0`,
            [req.user.id, id, ...scope.params]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        }

        await logActivity({
            userId: req.user.id,
            entity: 'project',
            entityId: id,
            action: 'deleted',
        });

        res.json({ message: 'Proyecto eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
