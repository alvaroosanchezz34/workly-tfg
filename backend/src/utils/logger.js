const serialize = (level, message, extra = {}) => {
    const entry = {
        time: new Date().toISOString(),
        level,
        message: typeof message === 'string' ? message : message?.message || String(message),
        ...extra,
    };
    if (process.env.LOG_FORMAT === 'pretty' || (process.env.NODE_ENV !== 'production' && process.env.LOG_FORMAT !== 'json')) {
        const tail = extra && Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : '';
        return `[${entry.time}] ${level} ${entry.message}${tail}`;
    }
    return JSON.stringify(entry);
};

export const logger = {
    info: (message, extra) => console.log(serialize('info', message, extra)),
    warn: (message, extra) => console.warn(serialize('warn', message, extra)),
    error: (message, extra) => console.error(serialize('error', message, extra)),
};

export const reportError = (err, extra = {}) => {
    logger.error(err?.message || 'Error', {
        name: err?.name,
        ...extra,
    });
    const url = process.env.ERROR_WEBHOOK_URL;
    if (!url || process.env.JEST_WORKER_ID) return;
    const body = JSON.stringify({
        message: String(err?.message || 'Error').slice(0, 500),
        path: extra.path || null,
        time: new Date().toISOString(),
    });
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    }).catch(() => {});
};
