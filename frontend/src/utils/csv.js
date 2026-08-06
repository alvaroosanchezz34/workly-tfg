// frontend/src/utils/csv.js
// Parser CSV mínimo (soporta campos entre comillas con comas y comillas escapadas "")
// sin depender de ninguna librería externa.

export function parseCSVRows(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    const pushField = () => { row.push(field); field = ''; };
    const pushRow = () => { pushField(); rows.push(row); row = []; };

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            pushField();
        } else if (c === '\n') {
            pushRow();
        } else if (c === '\r') {
            // ignorado, el salto de línea real lo maneja \n
        } else {
            field += c;
        }
    }
    if (field !== '' || row.length > 0) pushRow();

    // Descartar filas totalmente vacías (p.ej. línea final en blanco)
    return rows.filter(r => !(r.length === 1 && r[0] === ''));
}

// Convierte el CSV en objetos usando la primera fila como cabecera.
// Las cabeceras se normalizan a minúsculas y sin espacios sobrantes.
export function parseCSVToObjects(text) {
    const rows = parseCSVRows(text);
    if (rows.length === 0) return { headers: [], records: [] };
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const records = rows.slice(1).map(row =>
        Object.fromEntries(headers.map((h, i) => [h, (row[i] ?? '').trim()]))
    );
    return { headers, records };
}
