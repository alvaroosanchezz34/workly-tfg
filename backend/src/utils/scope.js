// backend/src/utils/scope.js
// Ámbito de visibilidad de un recurso (cliente, proyecto, factura, gasto, presupuesto...)
// según si el usuario trabaja en modo personal o dentro de una empresa.
// Se basa en req.user.company_id / req.user.role, ya resueltos por authenticate,
// así que no requiere ninguna consulta adicional a la BD.
//
// - Sin empresa (company_id null): solo ve/gestiona lo suyo (user_id).
// - Admin de empresa (role 'company_admin' o 'admin'): ve/gestiona todo lo de la empresa.
// - Técnico de empresa: solo ve/gestiona lo suyo dentro de la empresa.
export const resourceScope = (req, alias = '') => {
    const prefix = alias ? `${alias}.` : '';
    if (!req.user.company_id) {
        return { where: `${prefix}user_id = ?`, params: [req.user.id] };
    }
    if (req.user.role === 'company_admin' || req.user.role === 'admin') {
        return { where: `${prefix}company_id = ?`, params: [req.user.company_id] };
    }
    return {
        where: `${prefix}company_id = ? AND ${prefix}user_id = ?`,
        params: [req.user.company_id, req.user.id],
    };
};
