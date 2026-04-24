// backend/src/middlewares/company.middleware.js
import { pool } from '../config/db.js';

/**
 * Resuelve el contexto de empresa del usuario autenticado.
 * Añade req.company y req.companyRole a la request.
 * Debe usarse DESPUÉS de authenticate.
 */
export const resolveCompany = async (req, res, next) => {
    const userId = req.user.id;
    try {
        // Buscar la membresía activa del usuario
        const [[member]] = await pool.query(
            `SELECT cm.company_id, cm.role AS company_role, c.status AS company_status
             FROM company_members cm
             JOIN companies c ON c.id = cm.company_id
             WHERE cm.user_id = ? AND cm.status = 'active' AND c.status = 'active'
             LIMIT 1`,
            [userId]
        );

        if (member) {
            req.company     = { id: member.company_id };
            req.companyRole = member.company_role; // 'admin' | 'technician'
        } else {
            // Usuario sin empresa — trabaja en modo personal (company_id = NULL)
            req.company     = null;
            req.companyRole = null;
        }
        next();
    } catch (err) {
        res.status(500).json({ message: 'Error al resolver empresa: ' + err.message });
    }
};

/**
 * Middleware que exige que el usuario sea admin de su empresa.
 * Usar después de resolveCompany.
 */
export const requireCompanyAdmin = (req, res, next) => {
    if (req.companyRole !== 'admin' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Se requieren permisos de administrador de empresa' });
    }
    next();
};

/**
 * Helper: devuelve el WHERE clause adecuado según el rol.
 * Admin de empresa ve TODO lo de la empresa.
 * Técnico solo ve lo suyo (user_id = él mismo).
 */
export const getCompanyScope = (req, tableAlias = '') => {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    if (!req.company) {
        // Modo personal
        return { where: `${prefix}user_id = ?`, params: [req.user.id] };
    }
    if (req.companyRole === 'admin' || req.user.role === 'admin') {
        // Admin ve toda la empresa
        return { where: `${prefix}company_id = ?`, params: [req.company.id] };
    }
    // Técnico: solo lo suyo dentro de la empresa
    return {
        where: `${prefix}company_id = ? AND ${prefix}user_id = ?`,
        params: [req.company.id, req.user.id],
    };
};