import { VerifactuProvider } from './VerifactuProvider.js';
import { producerConfig, verifactuEnv } from './config.js';
import { prepareAlta, prepareAnulacion } from './prepare.js';
import { buildQrUrl, LEGEND } from './qr.js';
import { buildRegFactuXml } from './xml.js';
import { validateVerifactuXml } from './validateXml.js';
import {
    certificateAvailable, loadRepresentation, lockChain, saveRecord, updateChainHead,
} from './records.js';

const fail = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const cabeceraFor = (registro, representation) => {
    const obligado = {
        nombre: String(registro.issuer?.legalName || registro.issuerLegalName || '').trim().slice(0, 120),
        nif: String(registro.issuer?.taxId || registro.issuerTaxId || '').trim().toUpperCase(),
    };
    if (representation?.mode !== 'platform_representation') {
        return { obligado, representante: null, senderKey: obligado.nif };
    }
    const nif = String(representation.representative_tax_id || '').trim().toUpperCase();
    const nombre = String(representation.representative_name || '').trim().slice(0, 120);
    if (nif.length !== 9 || !nombre) {
        throw fail(400, 'El envío por representante necesita el nombre y el NIF de quien tiene el apoderamiento. Ese modo exige un poder registrado ante la AEAT; el certificado propio del autónomo no lo necesita.');
    }
    return {
        obligado,
        representante: { nombre, nif },
        senderKey: `platform:${nif}`,
    };
};

const persist = async (conn, prepared, meta) => {
    const xml = buildRegFactuXml({ cabecera: prepared.payload.cabecera, registros: [prepared.payload] });
    await validateVerifactuXml(xml);
    const hasCert = await certificateAvailable(conn, meta.senderKey);
    const status = hasCert ? 'queued' : 'pending_certificate';
    const recordId = await saveRecord(conn, {
        invoiceId: meta.invoiceId,
        issuerTaxId: meta.issuerTaxId,
        senderKey: meta.senderKey,
        operation: prepared.payload.operation,
        xml,
        huella: prepared.huella,
        previousHuella: prepared.previousHuella,
        numSerie: prepared.numSerie,
        fechaExpedicion: prepared.fechaExpedicion,
        tipoFactura: prepared.tipoFactura || null,
        cuotaTotal: prepared.cuotaTotal || null,
        importeTotal: prepared.importeTotal || null,
        fechaHora: prepared.fechaHora,
        status,
        subsanacion: prepared.payload.subsanacion || null,
        rechazoPrevio: prepared.payload.rechazoPrevio || null,
        payload: prepared.payload,
    });
    await updateChainHead(conn, meta.issuerTaxId, {
        huella: prepared.huella,
        numSerie: prepared.numSerie,
        fechaExpedicion: prepared.fechaExpedicion,
        fechaHora: prepared.fechaHora,
        recordId,
    });
    return { recordId, status };
};

export class AeatVerifactuProvider extends VerifactuProvider {
    async registrarAlta(registro) {
        if (!registro?.conn) throw fail(500, 'El registro de alta necesita la transacción de emisión');
        const producer = producerConfig();
        const nif = String(registro.issuer?.taxId || '').trim().toUpperCase();
        if (nif.length !== 9) throw fail(400, 'El NIF del emisor tiene que tener 9 caracteres');
        const representation = await loadRepresentation(registro.conn, nif);
        const cabecera = cabeceraFor(registro, representation);
        const chain = await lockChain(registro.conn, nif);
        const prepared = prepareAlta({
            registro,
            chain,
            producer,
            cabecera,
            now: registro.now,
        });
        const saved = await persist(registro.conn, prepared, {
            invoiceId: registro.invoiceId,
            issuerTaxId: nif,
            senderKey: cabecera.senderKey,
        });
        return {
            status: saved.status,
            externalId: String(saved.recordId),
            qrUrl: buildQrUrl({
                nif,
                numserie: prepared.numSerie,
                fecha: prepared.fechaExpedicion,
                importe: prepared.importeTotal,
                env: verifactuEnv(),
            }),
            legend: LEGEND,
        };
    }

    async anular(registro) {
        if (!registro?.conn) throw fail(500, 'La anulación necesita la transacción de la factura');
        const producer = producerConfig();
        const nif = String(registro.issuerTaxId || registro.issuer?.taxId || '').trim().toUpperCase();
        const representation = await loadRepresentation(registro.conn, nif);
        const cabecera = cabeceraFor({
            ...registro,
            issuer: {
                legalName: registro.issuerLegalName || registro.issuer?.legalName,
                taxId: nif,
            },
        }, representation);
        const chain = await lockChain(registro.conn, nif);
        const prepared = prepareAnulacion({
            registro: { ...registro, issuerTaxId: nif },
            chain,
            producer,
            cabecera,
            now: registro.now,
        });
        const saved = await persist(registro.conn, prepared, {
            invoiceId: registro.invoiceId,
            issuerTaxId: nif,
            senderKey: cabecera.senderKey,
        });
        return {
            status: saved.status,
            externalId: String(saved.recordId),
            qrUrl: null,
            legend: null,
        };
    }

    async obtenerQr(registro) {
        const nif = registro?.issuer?.taxId || registro?.issuerTaxId;
        if (!nif || !registro?.invoiceNumber) return { qrUrl: null, legend: null };
        const { fechaAeat } = await import('./dates.js');
        const fecha = registro.fechaExpedicion || (registro.issueDate ? fechaAeat(registro.issueDate) : null);
        if (!fecha || !registro.importeTotal) return { qrUrl: null, legend: LEGEND };
        return {
            qrUrl: buildQrUrl({
                nif,
                numserie: registro.invoiceNumber,
                fecha,
                importe: registro.importeTotal,
                env: verifactuEnv(),
            }),
            legend: LEGEND,
        };
    }

    async obtenerEstado(idExterno) {
        const { pool } = await import('../../config/db.js');
        const [[row]] = await pool.query(
            `SELECT status, csv, codigo_error, descripcion_error, estado_registro
             FROM verifactu_records WHERE id = ?`,
            [idExterno]
        );
        if (!row) return { status: 'unknown', externalId: idExterno == null ? null : String(idExterno) };
        return {
            status: row.status,
            externalId: String(idExterno),
            csv: row.csv,
            codigoError: row.codigo_error,
            descripcionError: row.descripcion_error,
            estadoRegistro: row.estado_registro,
        };
    }
}

export { LEGEND };
