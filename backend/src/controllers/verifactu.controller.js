import { readFile } from 'fs/promises';
import path from 'path';
import tls from 'tls';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';
import { issuerKeyFor } from '../services/invoicing/numbering.js';
import { assertSpanishTaxId } from '../services/invoicing/taxId.js';
import { certKind, producerReady, verifactuEnv } from '../services/verifactu/config.js';
import { flagsForResubmit } from '../services/verifactu/prepare.js';
import { queueRecordUpdate, rebuildRecordXml } from '../services/verifactu/records.js';
import { encryptBuffer, encryptText, platformCertConfigured } from '../services/verifactu/secrets.js';
import { resourceScope } from '../utils/scope.js';

const declaracionPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../docs/DECLARACION_RESPONSABLE_BORRADOR.md'
);

const sendError = (res, err) => {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Error interno del servidor' });
};

const fail = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const assertCanManage = req => {
    if (req.user.company_id && req.user.role !== 'company_admin' && req.user.role !== 'admin') {
        throw fail(403, 'Solo un administrador de la empresa puede configurar VeriFactu');
    }
};

const loadProfile = async req => {
    const issuerKey = issuerKeyFor(req.user);
    const [[profile]] = await pool.query(
        `SELECT legal_name, tax_id, fiscal_address FROM issuer_profiles WHERE issuer_key = ?`,
        [issuerKey]
    );
    return { issuerKey, profile };
};

const requireProfile = async req => {
    const loaded = await loadProfile(req);
    if (!loaded.profile?.tax_id) throw fail(400, 'Completa el perfil fiscal del emisor antes de configurar VeriFactu');
    return loaded;
};

export const getVerifactuSettings = async (req, res) => {
    try {
        const { profile } = await loadProfile(req);
        const taxId = profile?.tax_id || null;
        let representation = null;
        let certificate = null;
        let platformRow = null;
        if (taxId) {
            const [[rep]] = await pool.query(
                `SELECT mode, representative_name, representative_tax_id, apoderamiento_ref
                 FROM verifactu_representation WHERE issuer_tax_id = ?`,
                [taxId]
            );
            representation = rep || null;
            const [[cert]] = await pool.query(
                `SELECT id, label, created_at FROM verifactu_certificates WHERE scope = 'issuer' AND issuer_tax_id = ?`,
                [taxId]
            );
            certificate = cert || null;
        }
        if (req.user.role === 'admin') {
            const [[row]] = await pool.query(
                `SELECT id, label, created_at FROM verifactu_certificates WHERE scope = 'platform' LIMIT 1`
            );
            platformRow = row || null;
        }
        res.json({
            provider: (process.env.VERIFACTU_PROVIDER || 'noop').toLowerCase(),
            env: verifactuEnv(),
            certKind: certKind(),
            producerConfigured: producerReady(),
            issuerTaxId: taxId,
            issuerName: profile?.legal_name || '',
            mode: representation?.mode || 'own_certificate',
            representativeName: representation?.representative_name || '',
            representativeTaxId: representation?.representative_tax_id || '',
            apoderamientoRef: representation?.apoderamiento_ref || '',
            hasCertificate: Boolean(certificate),
            certificateLabel: certificate?.label || '',
            platformCertificateConfigured: platformCertConfigured() || Boolean(platformRow),
            platformCertificateLabel: platformRow?.label || '',
            legal: {
                ownCertificate: 'El autónomo o la empresa envía con su certificado. No hace falta apoderamiento.',
                platformRepresentation: 'Hace falta un poder (apoderamiento) del cliente a favor de quien tiene el certificado de la plataforma, registrado ante la AEAT. Sin ese poder la AEAT rechaza el envío.',
            },
        });
    } catch (err) {
        sendError(res, err);
    }
};

export const saveVerifactuSettings = async (req, res) => {
    try {
        assertCanManage(req);
        const { profile } = await requireProfile(req);
        const mode = req.body.mode === 'platform_representation' ? 'platform_representation' : 'own_certificate';
        let representativeName = String(req.body.representativeName || req.body.representative_name || '').trim();
        let representativeTaxId = String(req.body.representativeTaxId || req.body.representative_tax_id || '').trim();
        const apoderamientoRef = String(req.body.apoderamientoRef || req.body.apoderamiento_ref || '').trim().slice(0, 120);
        if (mode === 'platform_representation') {
            if (representativeName.length < 3) throw fail(400, 'Indica el nombre de quien representa a este emisor');
            representativeTaxId = assertSpanishTaxId(representativeTaxId);
            if (!apoderamientoRef) throw fail(400, 'Indica la referencia del apoderamiento. Este modo exige un poder ante la AEAT.');
        } else {
            representativeName = '';
            representativeTaxId = '';
        }
        await pool.query(
            `INSERT INTO verifactu_representation
               (issuer_tax_id, mode, representative_name, representative_tax_id, apoderamiento_ref)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               mode = VALUES(mode),
               representative_name = VALUES(representative_name),
               representative_tax_id = VALUES(representative_tax_id),
               apoderamiento_ref = VALUES(apoderamiento_ref)`,
            [profile.tax_id, mode, representativeName || null, representativeTaxId || null, apoderamientoRef || null]
        );
        res.json({
            message: mode === 'platform_representation'
                ? 'Modo representante guardado. Recuerda que el poder tiene que existir ante la AEAT.'
                : 'Modo certificado propio guardado',
            mode,
        });
    } catch (err) {
        sendError(res, err);
    }
};

const decodePfx = body => {
    const b64 = String(body.pfxBase64 || '').trim();
    if (!b64) throw fail(400, 'Adjunta el certificado en PFX');
    if (b64.length > 1_500_000) throw fail(400, 'El certificado es demasiado grande');
    const pfx = Buffer.from(b64, 'base64');
    if (pfx.length < 32) throw fail(400, 'El PFX no es válido');
    return pfx;
};

const releasePending = async (senderKey) => {
    await pool.query(
        `UPDATE invoices i
         JOIN verifactu_records r ON r.invoice_id = i.id
         SET i.verifactu_status = 'queued'
         WHERE r.status = 'pending_certificate' AND r.sender_key = ?`,
        [senderKey]
    );
    await pool.query(
        `UPDATE verifactu_records
         SET status = 'queued', next_attempt_at = NULL
         WHERE status = 'pending_certificate' AND sender_key = ?`,
        [senderKey]
    );
};

export const uploadCertificate = async (req, res) => {
    try {
        assertCanManage(req);
        const scope = req.body.scope === 'platform' ? 'platform' : 'issuer';
        if (scope === 'platform' && req.user.role !== 'admin') {
            throw fail(403, 'Solo el administrador de la plataforma puede guardar el certificado representante');
        }
        const pfx = decodePfx(req.body);
        const passphrase = String(req.body.passphrase ?? '');
        try {
            tls.createSecureContext({ pfx, passphrase });
        } catch {
            throw fail(400, 'No se pudo abrir el certificado. Revisa el fichero PFX y la contraseña.');
        }
        const label = String(req.body.label || 'Certificado').trim().slice(0, 120);
        const cipher = encryptBuffer(pfx);
        const passCipher = encryptText(passphrase);
        let owner = 'PLATFORM';
        let senderKey = null;
        if (scope === 'issuer') {
            const { profile } = await requireProfile(req);
            owner = profile.tax_id;
            senderKey = profile.tax_id;
        }
        await pool.query(
            `INSERT INTO verifactu_certificates
               (scope, issuer_tax_id, label, pfx_cipher, passphrase_cipher, created_by)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               label = VALUES(label),
               pfx_cipher = VALUES(pfx_cipher),
               passphrase_cipher = VALUES(passphrase_cipher),
               created_by = VALUES(created_by)`,
            [scope, owner, label, cipher, passCipher, req.user.id]
        );
        if (scope === 'issuer' && senderKey) await releasePending(senderKey);
        if (scope === 'platform') {
            const [rows] = await pool.query(
                `SELECT DISTINCT sender_key FROM verifactu_records
                 WHERE status = 'pending_certificate' AND sender_key LIKE 'platform:%'`
            );
            for (const row of rows) await releasePending(row.sender_key);
        }
        res.json({ message: 'Certificado guardado cifrado. No se vuelve a mostrar.', scope, label });
    } catch (err) {
        sendError(res, err);
    }
};

export const deleteCertificate = async (req, res) => {
    try {
        assertCanManage(req);
        const scope = req.query.scope === 'platform' ? 'platform' : 'issuer';
        if (scope === 'platform') {
            if (req.user.role !== 'admin') throw fail(403, 'Solo el administrador de la plataforma puede borrar ese certificado');
            await pool.query(`DELETE FROM verifactu_certificates WHERE scope = 'platform'`);
            return res.json({ message: 'Certificado de la plataforma borrado' });
        }
        const { profile } = await requireProfile(req);
        await pool.query(
            `DELETE FROM verifactu_certificates WHERE scope = 'issuer' AND issuer_tax_id = ?`,
            [profile.tax_id]
        );
        res.json({ message: 'Certificado borrado' });
    } catch (err) {
        sendError(res, err);
    }
};

const recordSelect = `
    SELECT r.id, r.invoice_id, r.issuer_tax_id, r.sender_key, r.operation, r.num_serie, r.fecha_expedicion,
           r.tipo_factura, r.cuota_total, r.importe_total, r.huella, r.status, r.csv, r.estado_envio,
           r.estado_registro, r.codigo_error, r.descripcion_error, r.attempts, r.subsanacion, r.rechazo_previo,
           r.created_at, r.sent_at, i.invoice_number
    FROM verifactu_records r
    JOIN invoices i ON i.id = r.invoice_id
`;

export const listVerifactuRecords = async (req, res) => {
    try {
        const scope = resourceScope(req, 'i');
        const invoiceId = req.query.invoiceId ? Number(req.query.invoiceId) : null;
        const params = [...scope.params];
        let extra = '';
        if (invoiceId) {
            extra = ' AND r.invoice_id = ?';
            params.push(invoiceId);
        }
        const [rows] = await pool.query(
            `${recordSelect} WHERE ${scope.where}${extra} ORDER BY r.id DESC LIMIT 200`,
            params
        );
        res.json(rows);
    } catch (err) {
        sendError(res, err);
    }
};

export const getVerifactuRecord = async (req, res) => {
    try {
        const scope = resourceScope(req, 'i');
        const [[row]] = await pool.query(
            `SELECT r.*, i.invoice_number
             FROM verifactu_records r
             JOIN invoices i ON i.id = r.invoice_id
             WHERE r.id = ? AND ${scope.where}`,
            [req.params.id, ...scope.params]
        );
        if (!row) return res.status(404).json({ message: 'Registro no encontrado' });
        res.json(row);
    } catch (err) {
        sendError(res, err);
    }
};

export const resubmitVerifactuRecord = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        assertCanManage(req);
        await conn.beginTransaction();
        const scope = resourceScope(req, 'i');
        const [[row]] = await conn.query(
            `SELECT r.* FROM verifactu_records r
             JOIN invoices i ON i.id = r.invoice_id
             WHERE r.id = ? AND ${scope.where}
             FOR UPDATE`,
            [req.params.id, ...scope.params]
        );
        if (!row) throw fail(404, 'Registro no encontrado');
        if (row.status === 'correcto') throw fail(409, 'Este registro ya está aceptado');
        if (row.status === 'sending') throw fail(409, 'Este registro se está enviando ahora');
        const suggested = flagsForResubmit(row);
        const rechazoPrevio = String(req.body?.rechazoPrevio || suggested.rechazoPrevio || 'N').toUpperCase();
        const subsanacion = String(req.body?.subsanacion || suggested.subsanacion || 'N').toUpperCase();
        if (!['S', 'N'].includes(rechazoPrevio) || (row.operation === 'alta' && !['S', 'N'].includes(subsanacion))) {
            throw fail(400, 'Subsanación y rechazo previo solo pueden ser S o N');
        }
        const rebuilt = await rebuildRecordXml(row, {
            subsanacion: row.operation === 'alta' ? subsanacion : null,
            rechazoPrevio,
        });
        await queueRecordUpdate(conn, row.id, rebuilt);
        await conn.query(
            `UPDATE invoices SET verifactu_status = 'queued', verifactu_external_id = ? WHERE id = ?`,
            [String(row.id), row.invoice_id]
        );
        await conn.commit();
        res.json({
            message: 'Registro puesto otra vez en la cola. La huella no cambia.',
            id: row.id,
            subsanacion: rebuilt.payload.subsanacion || null,
            rechazoPrevio: rebuilt.payload.rechazoPrevio || null,
        });
    } catch (err) {
        await conn.rollback();
        sendError(res, err);
    } finally {
        conn.release();
    }
};

export const getDeclaracionResponsable = async (_req, res) => {
    try {
        const markdown = await readFile(declaracionPath, 'utf8');
        res.json({
            draft: true,
            title: 'DECLARACIÓN RESPONSABLE DEL SISTEMA INFORMÁTICO DE FACTURACIÓN',
            markdown,
        });
    } catch (err) {
        sendError(res, err);
    }
};
