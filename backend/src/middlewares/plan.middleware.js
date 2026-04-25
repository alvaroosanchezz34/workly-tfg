// backend/src/middlewares/plan.middleware.js
import { pool } from '../config/db.js';
import { getPlan, getLimit } from '../config/plans.js';

/**
 * Middleware que comprueba si el usuario puede usar una feature según su plan
 * Uso: router.post('/', authenticate, requireFeature('email_send'), controller)
 */
export const requireFeature = feature => async (req, res, next) => {
    const plan = getPlan(req.user?.plan || 'free');
    const allowed = plan.limits[feature];
    if (allowed === true || allowed === -1) return next();
    return res.status(403).json({
        message: `Esta funcionalidad requiere el plan Pro o superior.`,
        upgrade_required: true,
        feature,
        current_plan: req.user?.plan || 'free',
    });
};

/**
 * Middleware que comprueba si el usuario no ha superado el límite de un recurso
 * Uso: router.post('/', authenticate, checkLimit('clients'), controller)
 */
export const checkLimit = resource => async (req, res, next) => {
    const limit = getLimit(req.user, resource);
    if (limit === -1) return next(); // ilimitado

    const TABLE_MAP = {
        clients:  'clients',
        projects: 'projects',
        invoices: 'invoices',
        expenses: 'expenses',
        services: 'services',
    };

    const table = TABLE_MAP[resource];
    if (!table) return next();

    try {
        // Para facturas comprobamos solo el mes actual
        let countQuery = `SELECT COUNT(*) AS cnt FROM ${table} WHERE user_id = ? AND is_deleted = 0`;
        const params   = [req.user.id];

        if (resource === 'invoices') {
            countQuery += ` AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())`;
        }

        const [[{ cnt }]] = await pool.query(countQuery, params);

        if (cnt >= limit) {
            return res.status(403).json({
                message: `Has alcanzado el límite de ${limit} ${resource} en el plan Free. Actualiza a Pro para continuar.`,
                upgrade_required: true,
                resource,
                limit,
                current: cnt,
                current_plan: req.user?.plan || 'free',
            });
        }
        next();
    } catch (err) {
        next(); // En caso de error, no bloqueamos
    }
};