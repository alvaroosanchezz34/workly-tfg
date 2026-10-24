import { pool } from '../../config/db.js';
import { endpointFor } from './config.js';
import { buildBatchXml } from './xml.js';
import { decryptBuffer, decryptText, platformMaterialFromEnv } from './secrets.js';
import { mapEstadoRegistro, sendRegFactu } from './soap.js';

export const MAX_RECORDS_PER_SEND = 1000;
export const MAX_ATTEMPTS = 8;

// La AEAT pide esperar TiempoEsperaEnvio segundos desde el envío anterior,
// salvo que la cola llegue al máximo de registros por envío: manda lo que ocurra antes.
export const shouldSend = ({ pendingCount, lastSentAt, waitSeconds, now, maxRecords = MAX_RECORDS_PER_SEND }) => {
    if (!pendingCount) return false;
    const wait = Number(waitSeconds) || 0;
    if (!lastSentAt || wait <= 0) return true;
    const elapsed = (now.getTime() - new Date(lastSentAt).getTime()) / 1000;
    if (elapsed >= wait) return true;
    return pendingCount >= maxRecords;
};

const placeholders = ids => ids.map(() => '?').join(',');

export const resolveCertificate = async (senderKey, query) => {
    if (String(senderKey).startsWith('platform:')) {
        const fromEnv = platformMaterialFromEnv();
        if (fromEnv) return fromEnv;
        const [[row]] = await query(
            `SELECT pfx_cipher, passphrase_cipher FROM verifactu_certificates WHERE scope = 'platform' LIMIT 1`
        );
        if (!row) return null;
        return {
            pfx: decryptBuffer(row.pfx_cipher),
            passphrase: decryptText(row.passphrase_cipher),
            certKind: (process.env.VERIFACTU_CERT_KIND || 'personal').toLowerCase() === 'sello' ? 'sello' : 'personal',
        };
    }
    const [[row]] = await query(
        `SELECT pfx_cipher, passphrase_cipher FROM verifactu_certificates WHERE scope = 'issuer' AND issuer_tax_id = ? LIMIT 1`,
        [senderKey]
    );
    if (!row) return null;
    return {
        pfx: decryptBuffer(row.pfx_cipher),
        passphrase: decryptText(row.passphrase_cipher),
        certKind: 'personal',
    };
};

const groupBySender = rows => {
    const groups = new Map();
    for (const row of rows) {
        const list = groups.get(row.sender_key) || [];
        list.push(row);
        groups.set(row.sender_key, list);
    }
    return groups;
};

const applyTransportError = async (query, batch, now, error) => {
    for (const record of batch) {
        const attempts = Number(record.attempts || 0) + 1;
        const delay = Math.min(3600, 30 * (2 ** Math.min(attempts, 8)));
        const status = attempts >= MAX_ATTEMPTS ? 'error_tecnico' : 'queued';
        const next = status === 'queued' ? new Date(now.getTime() + delay * 1000) : null;
        await query(
            `UPDATE verifactu_records
             SET status = ?, attempts = ?, next_attempt_at = ?, descripcion_error = ?
             WHERE id = ?`,
            [status, attempts, next, String(error.message || 'Error técnico').slice(0, 1500), record.id]
        );
        await query(
            `UPDATE invoices SET verifactu_status = ?, verifactu_external_id = ? WHERE id = ?`,
            [status, String(record.id), record.invoice_id]
        );
    }
};

const applyResponse = async (query, senderKey, batch, response, now) => {
    await query(
        `INSERT INTO verifactu_sender_state (sender_key, last_sent_at, wait_seconds)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE last_sent_at = VALUES(last_sent_at), wait_seconds = VALUES(wait_seconds)`,
        [senderKey, now, Number(response.tiempoEsperaEnvio) || 0]
    );
    for (const record of batch) {
        const line = (response.lineas || []).find(item => item.numSerie === record.num_serie && item.fecha === record.fecha_expedicion);
        let status = 'error_tecnico';
        let codigo = null;
        let descripcion = 'La AEAT no devolvió esta factura en la respuesta';
        let estadoRegistro = null;
        if (line) {
            estadoRegistro = line.estadoRegistro;
            status = mapEstadoRegistro(line.estadoRegistro);
            codigo = line.codigoError;
            descripcion = line.descripcionError;
        } else if (response.estadoEnvio === 'Incorrecto') {
            status = 'incorrecto';
            descripcion = 'Envío rechazado';
        }
        await query(
            `UPDATE verifactu_records
             SET status = ?, csv = ?, estado_envio = ?, estado_registro = ?, codigo_error = ?,
                 descripcion_error = ?, sent_at = ?, attempts = attempts + 1, next_attempt_at = NULL
             WHERE id = ?`,
            [
                status,
                response.csv || null,
                response.estadoEnvio || null,
                estadoRegistro,
                codigo,
                descripcion ? String(descripcion).slice(0, 1500) : null,
                now,
                record.id,
            ]
        );
        await query(
            `UPDATE invoices SET verifactu_status = ?, verifactu_external_id = ? WHERE id = ?`,
            [status, String(record.id), record.invoice_id]
        );
    }
};

export const processDueSubmissions = async ({
    query = (...args) => pool.query(...args),
    transport,
    now = new Date(),
    resolveTls = resolveCertificate,
} = {}) => {
    const [pending] = await query(
        `SELECT id, invoice_id, issuer_tax_id, sender_key, operation, xml, num_serie, fecha_expedicion, attempts
         FROM verifactu_records
         WHERE status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
         ORDER BY id ASC
         LIMIT 5000`,
        [now]
    );
    const results = [];
    for (const [senderKey, records] of groupBySender(pending || [])) {
        const [[state]] = await query(
            `SELECT last_sent_at, wait_seconds FROM verifactu_sender_state WHERE sender_key = ?`,
            [senderKey]
        );
        if (!shouldSend({
            pendingCount: records.length,
            lastSentAt: state?.last_sent_at,
            waitSeconds: state?.wait_seconds,
            now,
        })) {
            results.push({ senderKey, sent: false, reason: 'espera' });
            continue;
        }
        const batch = records.slice(0, MAX_RECORDS_PER_SEND);
        const ids = batch.map(record => record.id);
        let tls;
        try {
            tls = await resolveTls(senderKey, query);
        } catch (err) {
            await applyTransportError(query, batch, now, err);
            results.push({ senderKey, sent: false, reason: 'error_tecnico' });
            continue;
        }
        if (!tls) {
            await query(
                `UPDATE verifactu_records SET status = 'pending_certificate' WHERE id IN (${placeholders(ids)})`,
                ids
            );
            for (const record of batch) {
                await query(
                    `UPDATE invoices SET verifactu_status = 'pending_certificate', verifactu_external_id = ? WHERE id = ?`,
                    [String(record.id), record.invoice_id]
                );
            }
            results.push({ senderKey, sent: false, reason: 'sin_certificado' });
            continue;
        }
        await query(
            `UPDATE verifactu_records SET status = 'sending' WHERE id IN (${placeholders(ids)})`,
            ids
        );
        try {
            const response = await sendRegFactu({
                xml: buildBatchXml(batch),
                pfx: tls.pfx,
                passphrase: tls.passphrase,
                transport,
                certKind: tls.certKind,
            });
            await applyResponse(query, senderKey, batch, response, now);
            results.push({ senderKey, sent: true, estadoEnvio: response.estadoEnvio, csv: response.csv });
        } catch (err) {
            await applyTransportError(query, batch, now, err);
            results.push({ senderKey, sent: false, reason: 'error_tecnico', message: err.message });
        }
    }
    return results;
};

export const startVerifactuWorker = () => {
    if (process.env.VERIFACTU_WORKER === '0') return;
    if ((process.env.VERIFACTU_PROVIDER || 'noop').toLowerCase() !== 'aeat') return;
    const timer = setInterval(() => {
        processDueSubmissions().catch(err => {
            console.error('[VeriFactu]', err.message);
        });
    }, Number(process.env.VERIFACTU_WORKER_MS || 30000));
    if (typeof timer.unref === 'function') timer.unref();
};

export { endpointFor };
