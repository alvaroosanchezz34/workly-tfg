import { buildRegFactuXml } from './xml.js';
import { validateVerifactuXml } from './validateXml.js';
import { platformCertConfigured } from './secrets.js';

export const lockChain = async (conn, issuerTaxId) => {
    const numero = `WK-${issuerTaxId}`.slice(0, 100);
    await conn.query(
        `INSERT INTO verifactu_chain (issuer_tax_id, numero_instalacion)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE issuer_tax_id = issuer_tax_id`,
        [issuerTaxId, numero]
    );
    const [[row]] = await conn.query(
        `SELECT issuer_tax_id, last_huella, last_num_serie, last_fecha_expedicion, last_fecha_hora, numero_instalacion
         FROM verifactu_chain WHERE issuer_tax_id = ? FOR UPDATE`,
        [issuerTaxId]
    );
    return row;
};

export const loadRepresentation = async (conn, issuerTaxId) => {
    const [[row]] = await conn.query(
        `SELECT mode, representative_name, representative_tax_id, apoderamiento_ref
         FROM verifactu_representation WHERE issuer_tax_id = ?`,
        [issuerTaxId]
    );
    if (!row) return { mode: 'own_certificate', representative_name: null, representative_tax_id: null, apoderamiento_ref: null };
    return row;
};

export const issuerCertExists = async (conn, issuerTaxId) => {
    const [[row]] = await conn.query(
        `SELECT id FROM verifactu_certificates WHERE scope = 'issuer' AND issuer_tax_id = ? LIMIT 1`,
        [issuerTaxId]
    );
    return Boolean(row);
};

export const platformCertExists = async (conn) => {
    if (platformCertConfigured()) return true;
    const [[row]] = await conn.query(
        `SELECT id FROM verifactu_certificates WHERE scope = 'platform' LIMIT 1`
    );
    return Boolean(row);
};

export const certificateAvailable = async (conn, senderKey) => {
    if (String(senderKey).startsWith('platform:')) return platformCertExists(conn);
    return issuerCertExists(conn, senderKey);
};

export const saveRecord = async (conn, record) => {
    const [result] = await conn.query(
        `INSERT INTO verifactu_records
           (invoice_id, issuer_tax_id, sender_key, operation, xml, huella, previous_huella,
            num_serie, fecha_expedicion, tipo_factura, cuota_total, importe_total, fecha_hora,
            status, attempts, subsanacion, rechazo_previo, payload_json)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)`,
        [
            record.invoiceId,
            record.issuerTaxId,
            record.senderKey,
            record.operation,
            record.xml,
            record.huella,
            record.previousHuella,
            record.numSerie,
            record.fechaExpedicion,
            record.tipoFactura || null,
            record.cuotaTotal || null,
            record.importeTotal || null,
            record.fechaHora,
            record.status,
            record.subsanacion || null,
            record.rechazoPrevio || null,
            JSON.stringify(record.payload),
        ]
    );
    return result.insertId;
};

export const updateChainHead = async (conn, issuerTaxId, head) => {
    await conn.query(
        `UPDATE verifactu_chain
         SET last_huella = ?, last_num_serie = ?, last_fecha_expedicion = ?, last_fecha_hora = ?, last_record_id = ?
         WHERE issuer_tax_id = ?`,
        [head.huella, head.numSerie, head.fechaExpedicion, head.fechaHora, head.recordId, issuerTaxId]
    );
};

const payloadOf = row => {
    if (!row?.payload_json) return null;
    return typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json;
};

export const rebuildRecordXml = async (row, flags) => {
    const payload = payloadOf(row);
    if (!payload) {
        const err = new Error('El registro no tiene datos para rehacer el XML');
        err.statusCode = 500;
        throw err;
    }
    if (row.operation === 'anulacion') {
        payload.rechazoPrevio = flags.rechazoPrevio || 'N';
    } else {
        payload.subsanacion = flags.subsanacion || 'N';
        payload.rechazoPrevio = flags.rechazoPrevio || 'N';
    }
    const xml = buildRegFactuXml({ cabecera: payload.cabecera, registros: [payload] });
    if (!xml.includes(row.huella)) {
        const err = new Error('La nueva versión del XML no conserva la huella. No se reenvía.');
        err.statusCode = 409;
        throw err;
    }
    await validateVerifactuXml(xml);
    return { xml, payload };
};

export const queueRecordUpdate = async (conn, id, { xml, payload, status = 'queued' }) => {
    await conn.query(
        `UPDATE verifactu_records
         SET xml = ?, payload_json = ?, status = ?, next_attempt_at = NULL,
             subsanacion = ?, rechazo_previo = ?, codigo_error = NULL, descripcion_error = NULL
         WHERE id = ?`,
        [
            xml,
            JSON.stringify(payload),
            status,
            payload.subsanacion || null,
            payload.rechazoPrevio || null,
            id,
        ]
    );
};
