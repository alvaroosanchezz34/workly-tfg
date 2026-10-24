const SQL_HINT = /sql|ER_|You have an error|syntax|mysql|ECONNREFUSED|Duplicate entry/i;

export const publicErrorMessage = (err, status = 500) => {
    const raw = err?.message || 'Error interno del servidor';
    if (status < 500 && err?.statusCode && err.statusCode < 500 && !SQL_HINT.test(raw)) return raw;
    if (status < 500 && !SQL_HINT.test(raw) && process.env.NODE_ENV !== 'production') return raw;
    if (status >= 500 || SQL_HINT.test(raw)) return 'Error interno del servidor';
    return raw;
};
