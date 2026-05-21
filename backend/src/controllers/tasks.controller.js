// backend/src/controllers/tasks.controller.js
import { pool } from '../config/db.js';

// GET /api/projects/:projectId/tasks
export const getTasks = async (req, res) => {
    const { projectId } = req.params;
    try {
        // Verificar que el proyecto pertenece al usuario
        const [[project]] = await pool.query(
            `SELECT id FROM projects WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            [projectId, req.user.id]
        );
        if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });

        const [tasks] = await pool.query(
            `SELECT t.*, u.name AS assigned_name
             FROM tasks t
             LEFT JOIN users u ON u.id = t.assigned_to
             WHERE t.project_id = ?
             ORDER BY t.position ASC, t.created_at ASC`,
            [projectId]
        );
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/projects/:projectId/tasks
export const createTask = async (req, res) => {
    const { projectId } = req.params;
    const { title, description, status, priority, due_date, assigned_to } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: 'El título es obligatorio' });

    try {
        const [[project]] = await pool.query(
            `SELECT id FROM projects WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            [projectId, req.user.id]
        );
        if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });

        // Posición al final de la columna
        const [[{ maxPos }]] = await pool.query(
            `SELECT COALESCE(MAX(position), 0) AS maxPos FROM tasks WHERE project_id = ? AND status = ?`,
            [projectId, status || 'todo']
        );

        const [result] = await pool.query(
            `INSERT INTO tasks (project_id, user_id, title, description, status, priority, due_date, assigned_to, position)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [projectId, req.user.id, title.trim(), description || null,
             status || 'todo', priority || 'medium', due_date || null,
             assigned_to || null, maxPos + 1]
        );
        res.status(201).json({ message: 'Tarea creada', taskId: result.insertId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/projects/:projectId/tasks/:taskId
export const updateTask = async (req, res) => {
    const { projectId, taskId } = req.params;
    const { title, description, status, priority, due_date, assigned_to, position } = req.body;

    try {
        const [[task]] = await pool.query(
            `SELECT t.id FROM tasks t
             JOIN projects p ON p.id = t.project_id
             WHERE t.id = ? AND t.project_id = ? AND p.user_id = ?`,
            [taskId, projectId, req.user.id]
        );
        if (!task) return res.status(404).json({ message: 'Tarea no encontrada' });

        await pool.query(
            `UPDATE tasks SET
                title       = COALESCE(?, title),
                description = COALESCE(?, description),
                status      = COALESCE(?, status),
                priority    = COALESCE(?, priority),
                due_date    = ?,
                assigned_to = ?,
                position    = COALESCE(?, position)
             WHERE id = ?`,
            [title?.trim() || null, description ?? null, status || null,
             priority || null, due_date || null, assigned_to || null,
             position ?? null, taskId]
        );
        res.json({ message: 'Tarea actualizada' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/projects/:projectId/tasks/:taskId
export const deleteTask = async (req, res) => {
    const { projectId, taskId } = req.params;
    try {
        const [[task]] = await pool.query(
            `SELECT t.id FROM tasks t
             JOIN projects p ON p.id = t.project_id
             WHERE t.id = ? AND t.project_id = ? AND p.user_id = ?`,
            [taskId, projectId, req.user.id]
        );
        if (!task) return res.status(404).json({ message: 'Tarea no encontrada' });

        await pool.query(`DELETE FROM tasks WHERE id = ?`, [taskId]);
        res.json({ message: 'Tarea eliminada' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/projects/:projectId/tasks/:taskId/move
// Cambia el status (columna) y la posición al hacer drag & drop
export const moveTask = async (req, res) => {
    const { projectId, taskId } = req.params;
    const { status, position } = req.body;

    try {
        const [[task]] = await pool.query(
            `SELECT t.id FROM tasks t
             JOIN projects p ON p.id = t.project_id
             WHERE t.id = ? AND t.project_id = ? AND p.user_id = ?`,
            [taskId, projectId, req.user.id]
        );
        if (!task) return res.status(404).json({ message: 'Tarea no encontrada' });

        await pool.query(
            `UPDATE tasks SET status = ?, position = ? WHERE id = ?`,
            [status, position ?? 0, taskId]
        );
        res.json({ message: 'Tarea movida' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
