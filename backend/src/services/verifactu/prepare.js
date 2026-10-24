import { fechaAeat, fechaHoraMadrid } from './dates.js';
import { huellaAlta, huellaAnulacion } from './hash.js';
import { importe, sumImportes, tipoImpositivo } from './money.js';

const fail = (message) => {
    const err = new Error(message);
    err.statusCode = 400;
    return err;
};

const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export const mapTipoFactura = registro => {
    const simplified = registro.invoiceKind === 'simplified';
    const rectificativa = registro.invoiceType === 'rectificativa';
    if (!rectificativa) return simplified ? 'F2' : 'F1';
    const code = String(registro.rectificationCode || '').trim().toUpperCase();
    if (simplified) {
        if (code && code !== 'R5') throw fail('Una rectificativa de factura simplificada se envía como R5');
        return 'R5';
    }
    if (!code) return 'R1';
    if (!['R1', 'R2', 'R3', 'R4'].includes(code)) throw fail('El tipo de rectificativa tiene que ser R1, R2, R3 o R4');
    return code;
};

const lineAmount = (line, key, fallback) => {
    if (line[key] != null && line[key] !== '') return Number(line[key]);
    return fallback(line);
};

export const buildDesglose = lines => {
    if (!Array.isArray(lines) || lines.length === 0) throw fail('La factura no tiene líneas para el desglose');
    const groups = new Map();
    for (const line of lines) {
        const tipo = tipoImpositivo(line.tax_rate ?? 0);
        const reRate = Number(line.equivalence_surcharge_rate || 0);
        const key = `${tipo}|${reRate}`;
        const base = lineAmount(line, 'subtotal', row => Number(row.quantity) * Number(row.unit_price));
        const cuota = lineAmount(line, 'tax_amount', () => 0);
        const recargo = lineAmount(line, 'equivalence_surcharge_amount', () => 0);
        const current = groups.get(key) || { tipo, reRate, base: 0, cuota: 0, recargo: 0 };
        current.base += base;
        current.cuota += cuota;
        current.recargo += recargo;
        groups.set(key, current);
    }
    if (groups.size > 12) throw fail('El desglose tiene más de 12 tipos impositivos. La AEAT admite como máximo 12.');
    return [...groups.values()].map(group => ({
        impuesto: '01',
        claveRegimen: '01',
        calificacion: 'S1',
        tipo: group.tipo,
        base: importe(group.base),
        cuota: importe(group.cuota),
        tipoRecargo: group.reRate > 0 ? tipoImpositivo(group.reRate) : null,
        cuotaRecargo: group.reRate > 0 ? importe(group.recargo) : null,
    }));
};

const needsDestinatario = tipoFactura => tipoFactura === 'F1' || /^R[1-4]$/.test(tipoFactura);

const destinatarioDe = (registro, tipoFactura) => {
    if (!needsDestinatario(tipoFactura)) return null;
    const nif = clip(registro.customer?.taxId, 9).toUpperCase();
    const nombre = clip(registro.customer?.legalName, 120);
    if (nif.length !== 9) throw fail('La factura completa necesita un NIF de cliente de 9 caracteres para el registro de alta');
    if (nombre.length < 1) throw fail('La factura completa necesita el nombre del cliente para el registro de alta');
    return { nif, nombre };
};

const sistemaDe = (producer, chain) => ({
    nombreRazon: producer.name,
    nif: producer.nif,
    nombreSistema: producer.systemName,
    idSistema: producer.systemId,
    version: producer.version,
    numeroInstalacion: clip(chain.numero_instalacion, 100),
});

const encadenamientoDe = (chain, idEmisor) => {
    if (!chain?.last_huella) return { primerRegistro: true };
    return {
        primerRegistro: false,
        idEmisor,
        numSerie: chain.last_num_serie,
        fechaExpedicion: chain.last_fecha_expedicion,
        huella: chain.last_huella,
    };
};

const descripcionDe = registro => {
    const fromLines = (registro.lines || []).map(line => line.description).filter(Boolean).join('. ');
    const text = clip(registro.description || fromLines || 'Operación', 500);
    return text || 'Operación';
};

export const prepareAlta = ({ registro, chain, producer, cabecera, now }) => {
    const tipoFactura = mapTipoFactura(registro);
    const idEmisor = clip(registro.issuer.taxId, 9).toUpperCase();
    const numSerie = clip(registro.invoiceNumber, 60);
    const fechaExpedicion = fechaAeat(registro.issueDate);
    const fechaHora = registro.fechaHora || fechaHoraMadrid(now || new Date());
    if (!numSerie) throw fail('Falta el número de factura');
    const desglose = buildDesglose(registro.lines);
    const cuotaTotal = sumImportes(desglose.flatMap(row => [row.cuota, row.cuotaRecargo || 0]));
    const importeTotal = sumImportes(desglose.flatMap(row => [row.base, row.cuota, row.cuotaRecargo || 0]));
    const encadenamiento = encadenamientoDe(chain, idEmisor);
    const previous = encadenamiento.primerRegistro ? '' : encadenamiento.huella;
    const { huella, cadena } = huellaAlta({
        idEmisor,
        numSerie,
        fechaExpedicion,
        tipoFactura,
        cuotaTotal,
        importeTotal,
        huellaAnterior: previous,
        fechaHora,
    });
    const rectificativa = tipoFactura.startsWith('R');
    let tipoRectificativa = null;
    let facturasRectificadas = [];
    let importeRectificacion = null;
    if (rectificativa) {
        tipoRectificativa = registro.rectificationMethod === 'substitution' ? 'S' : 'I';
        const original = registro.rectified;
        if (!original?.invoice_number) throw fail('La rectificativa tiene que identificar la factura original');
        facturasRectificadas = [{
            idEmisor: clip(original.issuer_tax_id || idEmisor, 9).toUpperCase(),
            numSerie: clip(original.invoice_number, 60),
            fechaExpedicion: fechaAeat(original.issue_date),
        }];
        if (tipoRectificativa === 'S') {
            importeRectificacion = {
                base: importe(original.subtotal_amount),
                cuota: importe(original.tax_amount),
                cuotaRecargo: Number(original.equivalence_surcharge_amount) ? importe(original.equivalence_surcharge_amount) : null,
            };
        }
    }
    const payload = {
        operation: 'alta',
        cabecera,
        idEmisor,
        nombreEmisor: clip(registro.issuer.legalName, 120),
        numSerie,
        fechaExpedicion,
        tipoFactura,
        tipoRectificativa,
        facturasRectificadas,
        importeRectificacion,
        descripcion: descripcionDe(registro),
        destinatario: destinatarioDe(registro, tipoFactura),
        desglose,
        cuotaTotal,
        importeTotal,
        encadenamiento,
        sistema: sistemaDe(producer, chain),
        fechaHora,
        huella,
        subsanacion: registro.subsanacion || 'N',
        rechazoPrevio: registro.rechazoPrevio || 'N',
    };
    if (!payload.nombreEmisor) throw fail('Falta el nombre del emisor');
    return { payload, huella, cadena, previousHuella: previous || null, numSerie, fechaExpedicion, cuotaTotal, importeTotal, fechaHora, tipoFactura };
};

export const prepareAnulacion = ({ registro, chain, producer, cabecera, now }) => {
    const idEmisor = clip(registro.issuerTaxId || registro.issuer?.taxId, 9).toUpperCase();
    const numSerie = clip(registro.invoiceNumber, 60);
    const fechaExpedicion = fechaAeat(registro.issueDate);
    const fechaHora = registro.fechaHora || fechaHoraMadrid(now || new Date());
    const nombre = clip(registro.issuer?.legalName || registro.issuerLegalName, 120);
    if (idEmisor.length !== 9) throw fail('La anulación necesita el NIF del emisor');
    if (!numSerie) throw fail('La anulación necesita el número de la factura');
    if (!nombre) throw fail('La anulación necesita el nombre del emisor');
    const encadenamiento = encadenamientoDe(chain, idEmisor);
    const previous = encadenamiento.primerRegistro ? '' : encadenamiento.huella;
    const { huella, cadena } = huellaAnulacion({
        idEmisor,
        numSerie,
        fechaExpedicion,
        huellaAnterior: previous,
        fechaHora,
    });
    const payload = {
        operation: 'anulacion',
        cabecera: {
            ...cabecera,
            obligado: { nombre, nif: idEmisor },
        },
        idEmisor,
        numSerie,
        fechaExpedicion,
        encadenamiento,
        sistema: sistemaDe(producer, chain),
        fechaHora,
        huella,
        rechazoPrevio: registro.rechazoPrevio || 'N',
    };
    return { payload, huella, cadena, previousHuella: previous || null, numSerie, fechaExpedicion, fechaHora };
};

export const flagsForResubmit = record => {
    const incorrecto = record.status === 'incorrecto' || record.estado_registro === 'Incorrecto';
    const conErrores = record.status === 'aceptado_con_errores' || record.estado_registro === 'AceptadoConErrores';
    if (record.operation === 'anulacion') {
        return { rechazoPrevio: incorrecto ? 'S' : 'N' };
    }
    if (incorrecto) return { subsanacion: 'S', rechazoPrevio: 'S' };
    if (conErrores) return { subsanacion: 'S', rechazoPrevio: 'N' };
    return {
        subsanacion: record.subsanacion || 'N',
        rechazoPrevio: record.rechazo_previo || 'N',
    };
};
