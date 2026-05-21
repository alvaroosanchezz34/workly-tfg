// backend/src/utils/paginate.js
// Helper reutilizable para paginación server-side
// Devuelve { limit, offset, page, pageSize } validados desde req.query

export const getPagination = (query, defaultPageSize = 20) => {
    const page     = Math.max(1, parseInt(query.page)     || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.limit) || defaultPageSize));
    const offset   = (page - 1) * pageSize;
    return { page, pageSize, limit: pageSize, offset };
};

// Construye el objeto de respuesta paginada estándar
export const paginatedResponse = (rows, total, page, pageSize) => ({
    data:       rows,
    pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    },
});