// backend/src/controllers/timeTracking.controller.js
import { pool } from '../config/db.js';

// ─────────────────────────────────────────────────────────────
// GET /api/time  — listar entradas del usuario
// ─────────────────────────────────────────────────────────────
export const getTimeEntries = async (req, res) => {
    const userId = req.user.id;
    const { project_id, date_from, date_to, limit = 50, offset = 0 } = req.query;

    try {
        let where  = `t.user_id = ?`;
        const params = [userId];

        if (project_id) { where += ` AND t.project_id = ?`;  params.push(project_id); }
        if (date_from)  { where += ` AND t.started_at >= ?`; params.push(date_from); }
        if (date_to)    { where += ` AND t.started_at <= ?`; params.push(date_to + ' 23:59:59'); }

        const [entries] = await pool.query(
            `SELECT t.*,
                    p.title AS project_name,
                    TIMESTAMPDIFF(SECOND, t.started_at, COALESCE(t.stopped_at, NOW())) AS elapsed,
                    ROUND(
                        TIMESTAMPDIFF(SECOND, t.started_at, COALESCE(t.stopped_at, NOW())) / 3600 * t.hourly_rate,
                        2
                    ) AS earned
             FROM time_entries t
             LEFT JOIN projects p ON p.id = t.project_id
             WHERE ${where}
             ORDER BY t.started_at DESC
             LIMIT ? OFFSET ?`,
            [...params, Number(limit), Number(offset)]
        );

        const [[totals]] = await pool.query(
            `SELECT
                COALESCE(SUM(CASE WHEN stopped_at IS NOT NULL THEN duration ELSE 0 END), 0) AS total_seconds,
                COALESCE(SUM(CASE WHEN stopped_at IS NOT NULL AND billable = 1
                    THEN duration / 3600 * hourly_rate ELSE 0 END), 0) AS total_earned
             FROM time_entries t WHERE ${where}`,
            params
        );

        res.json({ entries, totals });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/time/active  — entrada activa (si hay temporizador corriendo)
// ─────────────────────────────────────────────────────────────
export const getActiveEntry = async (req, res) => {
    try {
        const [[entry]] = await pool.query(
            `SELECT t.*, p.title AS project_name
             FROM time_entries t
             LEFT JOIN projects p ON p.id = t.project_id
             WHERE t.user_id = ? AND t.stopped_at IS NULL
             ORDER BY t.started_at DESC LIMIT 1`,
            [req.user.id]
        );
        res.json(entry || null);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/time/start  — iniciar temporizador
// ─────────────────────────────────────────────────────────────
export const startTimer = async (req, res) => {
    const { project_id, description, hourly_rate, billable = 1 } = req.body;
    const userId = req.user.id;

    try {
        // Solo puede haber un temporizador activo — para el anterior si existe
        await pool.query(
            `UPDATE time_entries
             SET stopped_at = NOW(),
                 duration   = TIMESTAMPDIFF(SECOND, started_at, NOW())
             WHERE user_id = ? AND stopped_at IS NULL`,
            [userId]
        );

        // Obtener tarifa del proyecto si no se especifica
        let rate = Number(hourly_rate) || 0;
        if (!rate && project_id) {
            const [[proj]] = await pool.query(
                `SELECT hourly_rate FROM projects WHERE id = ? AND user_id = ?`,
                [project_id, userId]
            );
            rate = Number(proj?.hourly_rate) || 0;
        }

        const [result] = await pool.query(
            `INSERT INTO time_entries (user_id, project_id, description, started_at, hourly_rate, billable)
             VALUES (?, ?, ?, NOW(), ?, ?)`,
            [userId, project_id || null, description || null, rate, billable ? 1 : 0]
        );

        const [[entry]] = await pool.query(
            `SELECT t.*, p.title AS project_name
             FROM time_entries t
             LEFT JOIN projects p ON p.id = t.project_id
             WHERE t.id = ?`,
            [result.insertId]
        );

        res.status(201).json(entry);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/time/:id/stop  — parar temporizador
// ─────────────────────────────────────────────────────────────
export const stopTimer = async (req, res) => {
    const { id } = req.params;
    try {
        const [[entry]] = await pool.query(
            `SELECT * FROM time_entries WHERE id = ? AND user_id = ? AND stopped_at IS NULL`,
            [id, req.user.id]
        );
        if (!entry) return res.status(404).json({ message: 'Entrada no encontrada o ya parada' });

        await pool.query(
            `UPDATE time_entries
             SET stopped_at = NOW(),
                 duration   = TIMESTAMPDIFF(SECOND, started_at, NOW())
             WHERE id = ?`,
            [id]
        );

        const [[updated]] = await pool.query(
            `SELECT t.*, p.title AS project_name,
                    ROUND(t.duration / 3600 * t.hourly_rate, 2) AS earned
             FROM time_entries t
             LEFT JOIN projects p ON p.id = t.project_id
             WHERE t.id = ?`,
            [id]
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/time/manual  — añadir entrada manual
// ─────────────────────────────────────────────────────────────
export const addManualEntry = async (req, res) => {
    const { project_id, description, date, hours, minutes = 0, hourly_rate = 0, billable = 1 } = req.body;

    if (!date || (!hours && !minutes)) {
        return res.status(400).json({ message: 'Fecha y duración son obligatorias' });
    }

    const totalSeconds = (Number(hours || 0) * 3600) + (Number(minutes || 0) * 60);
    const startedAt    = new Date(`${date}T09:00:00`);
    const stoppedAt    = new Date(startedAt.getTime() + totalSeconds * 1000);

    try {
        let rate = Number(hourly_rate) || 0;
        if (!rate && project_id) {
            const [[proj]] = await pool.query(
                `SELECT hourly_rate FROM projects WHERE id = ? AND user_id = ?`,
                [project_id, req.user.id]
            );
            rate = Number(proj?.hourly_rate) || 0;
        }

        const [result] = await pool.query(
            `INSERT INTO time_entries
             (user_id, project_id, description, started_at, stopped_at, duration, hourly_rate, billable)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, project_id || null, description || null,
             startedAt, stoppedAt, totalSeconds, rate, billable ? 1 : 0]
        );
        res.status(201).json({ message: 'Entrada añadida', entryId: result.insertId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/time/:id  — eliminar entrada
// ─────────────────────────────────────────────────────────────
export const deleteTimeEntry = async (req, res) => {
    const { id } = req.params;
    try {
        const [[entry]] = await pool.query(
            `SELECT id FROM time_entries WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );
        if (!entry) return res.status(404).json({ message: 'Entrada no encontrada' });

        await pool.query(`DELETE FROM time_entries WHERE id = ?`, [id]);
        res.json({ message: 'Entrada eliminada' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/time/stats  — estadísticas de productividad
// ─────────────────────────────────────────────────────────────
export const getTimeStats = async (req, res) => {
    const userId = req.user.id;
    try {
        // Horas por día esta semana
        const [byDay] = await pool.query(
            `SELECT
                DATE(started_at) AS day,
                COALESCE(SUM(duration), 0) AS seconds
             FROM time_entries
             WHERE user_id = ? AND stopped_at IS NOT NULL
               AND started_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             GROUP BY day ORDER BY day ASC`,
            [userId]
        );

        // Horas por proyecto este mes
        const [byProject] = await pool.query(
            `SELECT p.title AS project,
                    COALESCE(SUM(t.duration), 0) AS seconds,
                    COALESCE(SUM(CASE WHEN t.billable=1 THEN t.duration/3600*t.hourly_rate ELSE 0 END), 0) AS earned
             FROM time_entries t
             LEFT JOIN projects p ON p.id = t.project_id
             WHERE t.user_id = ? AND t.stopped_at IS NOT NULL
               AND YEAR(t.started_at) = YEAR(CURDATE())
               AND MONTH(t.started_at) = MONTH(CURDATE())
             GROUP BY t.project_id ORDER BY seconds DESC LIMIT 5`,
            [userId]
        );

        // Totales del mes
        const [[month]] = await pool.query(
            `SELECT
                COALESCE(SUM(duration), 0)            AS total_seconds,
                COALESCE(SUM(CASE WHEN billable=1 THEN duration/3600*hourly_rate ELSE 0 END), 0) AS total_earned,
                COUNT(*)                               AS total_entries,
                COALESCE(AVG(duration), 0)             AS avg_duration
             FROM time_entries
             WHERE user_id = ? AND stopped_at IS NOT NULL
               AND YEAR(started_at) = YEAR(CURDATE())
               AND MONTH(started_at) = MONTH(CURDATE())`,
            [userId]
        );

        res.json({ byDay, byProject, month });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
