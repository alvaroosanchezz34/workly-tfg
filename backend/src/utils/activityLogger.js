import { pool } from '../config/db.js';

export const logActivity = async ({
    userId,
    entity,
    entityId,
    action,
}) => {
    await pool.query(
        `INSERT INTO activity_logs (user_id, entity, entity_id, action)
     VALUES (?, ?, ?, ?)`,
        [userId, entity, entityId, action]
    );
};
