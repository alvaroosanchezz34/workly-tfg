// Bitácora interna de facturas. Solo se inserta y se lee.
// No hay actualización ni borrado: es el rastro de borrador, emisión, rectificación y anulación.

const ALLOWED = new Set([
    'draft_created',
    'draft_updated',
    'draft_deleted',
    'issued',
    'voided',
    'rectification_opened',
    'payment_recorded',
    'payment_removed',
    'collection_status_changed',
]);

export const appendInvoiceEvent = async (executor, { invoiceId, issuerKey, userId, action, payload }) => {
    if (!ALLOWED.has(action)) {
        const err = new Error(`Acción de factura no reconocida: ${action}`);
        err.statusCode = 500;
        throw err;
    }
    await executor.query(
        `INSERT INTO invoice_events (invoice_id, issuer_key, user_id, action, payload)
         VALUES (?, ?, ?, ?, ?)`,
        [
            invoiceId,
            issuerKey || null,
            userId || null,
            action,
            payload == null ? null : JSON.stringify(payload),
        ]
    );
};

export const listInvoiceEvents = async (executor, invoiceId) => {
    const [rows] = await executor.query(
        `SELECT id, invoice_id, issuer_key, user_id, action, payload, created_at
         FROM invoice_events
         WHERE invoice_id = ?
         ORDER BY id ASC`,
        [invoiceId]
    );
    return rows.map(row => ({
        ...row,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    }));
};
