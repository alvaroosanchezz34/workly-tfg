import { pool } from '../config/db.js';

// Obtener activity logs del usuario
export const getActivityLogs = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
         al.id,
         al.entity,
         al.entity_id,
         al.action,
         al.created_at,
         u.name AS user_name
       FROM activity_logs al
       JOIN users u ON al.user_id = u.id
       WHERE al.user_id = ?
       ORDER BY al.created_at DESC
       LIMIT 100`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
