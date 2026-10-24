const SF = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd';
const SFLR = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd';

const esc = value => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const sf = (name, value) => `<sf:${name}>${esc(value)}</sf:${name}>`;

const block = (name, inner) => `<sf:${name}>${inner}</sf:${name}>`;

const sistemaXml = sistema => [
    block('SistemaInformatico', [
        sf('NombreRazon', sistema.nombreRazon),
        sf('NIF', sistema.nif),
        sf('NombreSistemaInformatico', sistema.nombreSistema),
        sf('IdSistemaInformatico', sistema.idSistema),
        sf('Version', sistema.version),
        sf('NumeroInstalacion', sistema.numeroInstalacion),
        sf('TipoUsoPosibleSoloVerifactu', 'S'),
        sf('TipoUsoPosibleMultiOT', 'S'),
        sf('IndicadorMultiplesOT', 'S'),
    ].join('')),
].join('');

const encadenamientoXml = encadenamiento => {
    if (encadenamiento.primerRegistro) {
        return block('Encadenamiento', sf('PrimerRegistro', 'S'));
    }
    return block('Encadenamiento', block('RegistroAnterior', [
        sf('IDEmisorFactura', encadenamiento.idEmisor),
        sf('NumSerieFactura', encadenamiento.numSerie),
        sf('FechaExpedicionFactura', encadenamiento.fechaExpedicion),
        sf('Huella', encadenamiento.huella),
    ].join('')));
};

const detalleXml = detalle => block('DetalleDesglose', [
    sf('Impuesto', detalle.impuesto || '01'),
    sf('ClaveRegimen', detalle.claveRegimen || '01'),
    sf('CalificacionOperacion', detalle.calificacion || 'S1'),
    sf('TipoImpositivo', detalle.tipo),
    sf('BaseImponibleOimporteNoSujeto', detalle.base),
    sf('CuotaRepercutida', detalle.cuota),
    detalle.tipoRecargo ? sf('TipoRecargoEquivalencia', detalle.tipoRecargo) : '',
    detalle.cuotaRecargo ? sf('CuotaRecargoEquivalencia', detalle.cuotaRecargo) : '',
].join(''));

const idFacturaXml = (idEmisor, numSerie, fecha, names) => block('IDFactura', [
    sf(names.emisor, idEmisor),
    sf(names.serie, numSerie),
    sf(names.fecha, fecha),
].join(''));

export const registroAltaXml = payload => {
    const rectificada = (payload.facturasRectificadas || []).map(factura => block('IDFacturaRectificada', [
        sf('IDEmisorFactura', factura.idEmisor),
        sf('NumSerieFactura', factura.numSerie),
        sf('FechaExpedicionFactura', factura.fechaExpedicion),
    ].join(''))).join('');
    const rectificacion = payload.importeRectificacion
        ? block('ImporteRectificacion', [
            sf('BaseRectificada', payload.importeRectificacion.base),
            sf('CuotaRectificada', payload.importeRectificacion.cuota),
            payload.importeRectificacion.cuotaRecargo
                ? sf('CuotaRecargoRectificado', payload.importeRectificacion.cuotaRecargo)
                : '',
        ].join(''))
        : '';
    const destinatario = payload.destinatario
        ? block('Destinatarios', block('IDDestinatario', [
            sf('NombreRazon', payload.destinatario.nombre),
            sf('NIF', payload.destinatario.nif),
        ].join('')))
        : '';
    return block('RegistroAlta', [
        sf('IDVersion', '1.0'),
        idFacturaXml(payload.idEmisor, payload.numSerie, payload.fechaExpedicion, {
            emisor: 'IDEmisorFactura',
            serie: 'NumSerieFactura',
            fecha: 'FechaExpedicionFactura',
        }),
        sf('NombreRazonEmisor', payload.nombreEmisor),
        sf('Subsanacion', payload.subsanacion || 'N'),
        sf('RechazoPrevio', payload.rechazoPrevio || 'N'),
        sf('TipoFactura', payload.tipoFactura),
        payload.tipoRectificativa ? sf('TipoRectificativa', payload.tipoRectificativa) : '',
        rectificada ? block('FacturasRectificadas', rectificada) : '',
        rectificacion,
        sf('DescripcionOperacion', payload.descripcion),
        destinatario,
        block('Desglose', payload.desglose.map(detalleXml).join('')),
        sf('CuotaTotal', payload.cuotaTotal),
        sf('ImporteTotal', payload.importeTotal),
        encadenamientoXml(payload.encadenamiento),
        sistemaXml(payload.sistema),
        sf('FechaHoraHusoGenRegistro', payload.fechaHora),
        sf('TipoHuella', '01'),
        sf('Huella', payload.huella),
    ].join(''));
};

export const registroAnulacionXml = payload => block('RegistroAnulacion', [
    sf('IDVersion', '1.0'),
    idFacturaXml(payload.idEmisor, payload.numSerie, payload.fechaExpedicion, {
        emisor: 'IDEmisorFacturaAnulada',
        serie: 'NumSerieFacturaAnulada',
        fecha: 'FechaExpedicionFacturaAnulada',
    }),
    sf('RechazoPrevio', payload.rechazoPrevio || 'N'),
    encadenamientoXml(payload.encadenamiento),
    sistemaXml(payload.sistema),
    sf('FechaHoraHusoGenRegistro', payload.fechaHora),
    sf('TipoHuella', '01'),
    sf('Huella', payload.huella),
].join(''));

const cabeceraXml = cabecera => {
    const representante = cabecera.representante
        ? block('Representante', [
            sf('NombreRazon', cabecera.representante.nombre),
            sf('NIF', cabecera.representante.nif),
        ].join(''))
        : '';
    return `<sfLR:Cabecera>${block('ObligadoEmision', [
        sf('NombreRazon', cabecera.obligado.nombre),
        sf('NIF', cabecera.obligado.nif),
    ].join(''))}${representante}</sfLR:Cabecera>`;
};

export const buildRegFactuXml = ({ cabecera, registros }) => {
    const body = registros.map(registro => {
        const inner = registro.operation === 'anulacion'
            ? registroAnulacionXml(registro)
            : registroAltaXml(registro);
        return `<sfLR:RegistroFactura>${inner}</sfLR:RegistroFactura>`;
    }).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>`
        + `<sfLR:RegFactuSistemaFacturacion xmlns:sfLR="${SFLR}" xmlns:sf="${SF}">`
        + `${cabeceraXml(cabecera)}${body}`
        + `</sfLR:RegFactuSistemaFacturacion>`;
};

export const extractElement = (xml, tag) => {
    const match = String(xml).match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>[\\s\\S]*?</(?:\\w+:)?${tag}>`));
    if (!match) {
        const err = new Error(`No se encontró ${tag} en el XML guardado`);
        err.statusCode = 500;
        throw err;
    }
    return match[0];
};

export const buildBatchXml = records => {
    const cabecera = extractElement(records[0].xml, 'Cabecera');
    const registros = records.map(record => extractElement(record.xml, 'RegistroFactura')).join('');
    return `<?xml version="1.0" encoding="UTF-8"?>`
        + `<sfLR:RegFactuSistemaFacturacion xmlns:sfLR="${SFLR}" xmlns:sf="${SF}">`
        + `${cabecera}${registros}`
        + `</sfLR:RegFactuSistemaFacturacion>`;
};

export const NS = { SF, SFLR };
