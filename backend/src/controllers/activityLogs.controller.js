import { pool } from '../config/db.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';

export const getActivityLogs = async (req, res) => {
    const { entity, action } = req.query;
    const { page, pageSize, limit, offset } = getPagination(req.query, 50);

    try {
        let where  = `WHERE al.user_id = ?`;
        const params = [req.user.id];

        if (entity) { where += ` AND al.entity = ?`; params.push(entity); }
        if (action) { where += ` AND al.action = ?`; params.push(action); }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM activity_logs al ${where}`, params
        );

        const [rows] = await pool.query(
            `SELECT al.id, al.entity, al.entity_id, al.action, al.created_at,
                    u.name AS user_name
             FROM activity_logs al
             JOIN users u ON al.user_id = u.id
             ${where}
             ORDER BY al.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json(paginatedResponse(rows, total, page, pageSize));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};