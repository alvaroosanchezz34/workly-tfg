// Numeración correlativa por emisor y serie.
// El contador vive en invoice_series y se incrementa dentro de la misma
// transacción que graba la factura, con FOR UPDATE, para que dos emisiones
// a la vez no compartan número ni dejen un hueco si la transacción se deshace.

export const issuerKeyFor = user => {
    if (user?.company_id) return `company:${user.company_id}`;
    return `user:${user.id}`;
};

export const madridYear = (date = new Date()) => Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric' }).format(date)
);

export const seriesYear = (issueDate, resetYearly) => {
    if (!resetYearly) return 0;
    const raw = issueDate ? String(issueDate).slice(0, 10) : '';
    const match = raw.match(/^(\d{4})-/);
    return match ? Number(match[1]) : madridYear();
};

export const normalizeSeriesCode = prefix => {
    const code = String(prefix || 'FAC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    return code || 'FAC';
};

export const formatInvoiceNumber = ({ seriesCode, year, seq, padding }) => {
    const padded = String(seq).padStart(Number(padding) || 4, '0');
    if (!year) return `${seriesCode}-${padded}`;
    return `${seriesCode}-${year}-${padded}`;
};

export const allocateInvoiceNumber = async (conn, { issuerKey, seriesCode, padding, year }) => {
    const safePadding = Math.min(8, Math.max(3, Number(padding) || 4));
    await conn.query(
        `INSERT INTO invoice_series (issuer_key, series_code, year, next_number, padding)
         VALUES (?, ?, ?, 1, ?)
         ON DUPLICATE KEY UPDATE padding = VALUES(padding)`,
        [issuerKey, seriesCode, year, safePadding]
    );
    const [[row]] = await conn.query(
        `SELECT id, next_number, padding FROM invoice_series
         WHERE issuer_key = ? AND series_code = ? AND year = ?
         FOR UPDATE`,
        [issuerKey, seriesCode, year]
    );
    const seq = Number(row.next_number);
    await conn.query(`UPDATE invoice_series SET next_number = next_number + 1 WHERE id = ?`, [row.id]);
    const number = formatInvoiceNumber({
        seriesCode,
        year,
        seq,
        padding: row.padding || safePadding,
    });
    return { number, seq, year, seriesCode, padding: row.padding || safePadding };
};
