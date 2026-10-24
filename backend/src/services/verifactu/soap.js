import https from 'https';
import { endpointFor } from './config.js';

export const wrapSoap = regFactuXml => {
    const inner = String(regFactuXml).replace(/^\s*<\?xml[^?]*\?>\s*/, '');
    return `<?xml version="1.0" encoding="UTF-8"?>`
        + `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">`
        + `<soapenv:Body>${inner}</soapenv:Body>`
        + `</soapenv:Envelope>`;
};

const decodeXml = value => String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const textOf = (xml, tag) => {
    const match = String(xml).match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([^<]*)</(?:\\w+:)?${tag}>`));
    return match ? decodeXml(match[1].trim()) : null;
};

export const parseAeatResponse = body => {
    const xml = String(body || '');
    if (/<(?:\w+:)?Fault\b/.test(xml)) {
        const err = new Error(`La AEAT respondió con un error SOAP: ${textOf(xml, 'faultstring') || textOf(xml, 'faultcode') || 'Fault'}`);
        err.technical = true;
        throw err;
    }
    const lineas = xml.split(/<(?:\w+:)?RespuestaLinea\b[^>]*>/).slice(1).map(part => {
        const chunk = part.split(/<\/(?:\w+:)?RespuestaLinea>/)[0];
        return {
            nif: textOf(chunk, 'IDEmisorFactura'),
            numSerie: textOf(chunk, 'NumSerieFactura'),
            fecha: textOf(chunk, 'FechaExpedicionFactura'),
            estadoRegistro: textOf(chunk, 'EstadoRegistro'),
            codigoError: textOf(chunk, 'CodigoErrorRegistro'),
            descripcionError: textOf(chunk, 'DescripcionErrorRegistro'),
            tipoOperacion: textOf(chunk, 'TipoOperacion'),
        };
    });
    const tiempo = textOf(xml, 'TiempoEsperaEnvio');
    return {
        estadoEnvio: textOf(xml, 'EstadoEnvio'),
        csv: textOf(xml, 'CSV'),
        tiempoEsperaEnvio: tiempo ? Number(tiempo) : 0,
        lineas,
    };
};

export const mapEstadoRegistro = estado => {
    if (estado === 'Correcto') return 'correcto';
    if (estado === 'AceptadoConErrores') return 'aceptado_con_errores';
    if (estado === 'Incorrecto') return 'incorrecto';
    return 'error_tecnico';
};

export const httpsPost = ({ endpoint, envelope, pfx, passphrase }) => new Promise((resolve, reject) => {
    if (process.env.JEST_WORKER_ID) {
        reject(new Error('No se llama a la AEAT desde los tests'));
        return;
    }
    const url = new URL(endpoint);
    const body = Buffer.from(envelope, 'utf8');
    const req = https.request({
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        pfx,
        passphrase,
        rejectUnauthorized: true,
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'Content-Length': body.length,
            SOAPAction: '""',
        },
        timeout: 60000,
    }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
            const responseBody = Buffer.concat(chunks).toString('utf8');
            if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(`La AEAT respondió HTTP ${res.statusCode}`));
                return;
            }
            resolve({ statusCode: res.statusCode, body: responseBody });
        });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Tiempo de espera agotado al contactar con la AEAT')));
    req.write(body);
    req.end();
});

export const sendRegFactu = async ({ endpoint, xml, pfx, passphrase, transport, env, certKind }) => {
    const target = endpoint || endpointFor({ env, kind: certKind });
    const envelope = wrapSoap(xml);
    if (!transport && process.env.JEST_WORKER_ID) {
        throw new Error('No se llama a la AEAT desde los tests');
    }
    const fn = transport || httpsPost;
    const result = await fn({ endpoint: target, envelope, pfx, passphrase });
    return parseAeatResponse(result.body);
};
