const cents = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) {
        const err = new Error('Importe no numérico');
        err.statusCode = 400;
        throw err;
    }
    return Math.round((n + Number.EPSILON) * 100);
};

// AEAT ImporteSgn12.2: siempre dos decimales para que el XML y el QR coincidan.
export const importe = value => {
    const c = cents(value);
    const sign = c < 0 ? '-' : '';
    const abs = Math.abs(c);
    const whole = Math.trunc(abs / 100);
    const frac = String(abs % 100).padStart(2, '0');
    return `${sign}${whole}.${frac}`;
};

export const sumImportes = values => importe(values.reduce((acc, value) => acc + cents(value), 0) / 100);

// Tipo2.2: sin ceros a la derecha (21, 5.2, 5.25).
export const tipoImpositivo = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n >= 1000) {
        const err = new Error('Tipo impositivo no válido');
        err.statusCode = 400;
        throw err;
    }
    const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
    return rounded.toFixed(2).replace(/\.?0+$/, '');
};
