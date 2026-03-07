import { pool } from '../config/db.js';

// FIX: try/catch para que un fallo en el log nunca rompa la operación principal
export const logActivity = async ({
    userId,
    entity,
    entityId,
    action,
}) => {
    try {
        await pool.query(
            `INSERT INTO activity_logs (user_id, entity, entity_id, action)
             VALUES (?, ?, ?, ?)`,
            [userId, entity, entityId, action]
        );
    } catch (err) {
        // El log nunca debe interrumpir el flujo principal
        console.error('[activityLogger] Error al registrar actividad:', err.message);
    }
};