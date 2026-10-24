/**
 * VeriFactu propio: huella oficial, XML contra los XSD de la AEAT,
 * QR, cola y respuestas simuladas. No llama a la AEAT.
 */

import { jest } from '@jest/globals';
import { huellaAlta, huellaAnulacion } from '../services/verifactu/hash.js';
import { fechaHoraMadrid } from '../services/verifactu/dates.js';
import { buildQrUrl } from '../services/verifactu/qr.js';
import { endpointFor } from '../services/verifactu/config.js';
import { prepareAlta, prepareAnulacion, flagsForResubmit } from '../services/verifactu/prepare.js';
import { buildRegFactuXml } from '../services/verifactu/xml.js';
import { validateVerifactuXml } from '../services/verifactu/validateXml.js';
import { parseAeatResponse, sendRegFactu } from '../services/verifactu/soap.js';
import { encryptText, decryptText } from '../services/verifactu/secrets.js';
import { rebuildRecordXml } from '../services/verifactu/records.js';
import { AeatVerifactuProvider } from '../services/verifactu/AeatVerifactuProvider.js';
import { processDueSubmissions, shouldSend } from '../services/verifactu/worker.js';

const H1 = '3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60';
const H2 = 'F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97';
const H3 = '177547C0D57AC74748561D054A9CEC14B4C4EA23D1BEFD6F2E69E3A388F90C68';

const producer = {
    name: 'Productor Demo SL',
    nif: 'B12345674',
    systemId: '01',
    version: '1.0.0',
    systemName: 'Workly',
};

const chainVacia = { last_huella: null, numero_instalacion: 'WK-12345678Z' };

const registroBase = {
    invoiceNumber: 'FAC-2026-0001',
    issueDate: '2026-03-01',
    invoiceKind: 'complete',
    invoiceType: 'normal',
    fechaHora: '2026-03-01T10:15:30+01:00',
    issuer: { legalName: 'Ana López', taxId: '12345678Z', fiscalAddress: 'Calle Mayor 1, Madrid' },
    customer: { legalName: 'Cliente Uno', taxId: 'X1234567L' },
    total: 1060,
    irpfAmount: 150,
    lines: [{
        description: 'Servicio A & B',
        quantity: 1,
        unit_price: 1000,
        tax_rate: 21,
        equivalence_surcharge_rate: 5.2,
        subtotal: 1000,
        tax_amount: 210,
        equivalence_surcharge_amount: 52,
    }],
};

const cabecera = {
    obligado: { nombre: 'Ana López', nif: '12345678Z' },
    representante: null,
};

describe('Huella oficial AEAT', () => {
    test('alta inicial, alta encadenada y anulación', () => {
        const alta1 = huellaAlta({
            idEmisor: '89890001K',
            numSerie: '12345678/G33',
            fechaExpedicion: '01-01-2024',
            tipoFactura: 'F1',
            cuotaTotal: '12.35',
            importeTotal: '123.45',
            huellaAnterior: '',
            fechaHora: '2024-01-01T19:20:30+01:00',
        });
        expect(alta1.huella).toBe(H1);

        const alta2 = huellaAlta({
            idEmisor: '89890001K',
            numSerie: '12345679/G34',
            fechaExpedicion: '01-01-2024',
            tipoFactura: 'F1',
            cuotaTotal: '12.35',
            importeTotal: '123.45',
            huellaAnterior: alta1.huella,
            fechaHora: '2024-01-01T19:20:35+01:00',
        });
        expect(alta2.huella).toBe(H2);

        const baja = huellaAnulacion({
            idEmisor: '89890001K',
            numSerie: '12345679/G34',
            fechaExpedicion: '01-01-2024',
            huellaAnterior: alta2.huella,
            fechaHora: '2024-01-01T19:20:40+01:00',
        });
        expect(baja.huella).toBe(H3);
    });

    test('recorta espacios de los campos antes de hashear', () => {
        const limpio = huellaAlta({
            idEmisor: '89890001K', numSerie: '12345678/G33', fechaExpedicion: '01-01-2024',
            tipoFactura: 'F1', cuotaTotal: '12.35', importeTotal: '123.45', huellaAnterior: '',
            fechaHora: '2024-01-01T19:20:30+01:00',
        });
        const sucio = huellaAlta({
            idEmisor: ' 89890001K ', numSerie: ' 12345678/G33 ', fechaExpedicion: '01-01-2024',
            tipoFactura: 'F1', cuotaTotal: '12.35', importeTotal: '123.45', huellaAnterior: '  ',
            fechaHora: '2024-01-01T19:20:30+01:00',
        });
        expect(sucio.huella).toBe(limpio.huella);
    });
});

describe('Fecha de Madrid y QR', () => {
    test('usa el offset de Madrid, invierno y verano', () => {
        expect(fechaHoraMadrid(new Date(Date.UTC(2024, 0, 1, 18, 20, 30)))).toBe('2024-01-01T19:20:30+01:00');
        expect(fechaHoraMadrid(new Date(Date.UTC(2024, 6, 1, 17, 20, 30)))).toBe('2024-07-01T19:20:30+02:00');
    });

    test('monta la URL de pruebas o de producción y codifica el número', () => {
        const testUrl = buildQrUrl({
            nif: '89890001K', numserie: 'A&B/1', fecha: '01-01-2024', importe: '241.40', env: 'test',
        });
        expect(testUrl.startsWith('https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?')).toBe(true);
        expect(testUrl).toContain('nif=89890001K');
        expect(testUrl).toContain('numserie=A%26B%2F1');
        expect(testUrl).toContain('fecha=01-01-2024');
        expect(testUrl).toContain('importe=241.40');
        const prod = buildQrUrl({ nif: '89890001K', numserie: '1', fecha: '01-01-2024', importe: '1.00', env: 'production' });
        expect(prod.startsWith('https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?')).toBe(true);
    });

    test('elige el host SOAP según entorno y tipo de certificado', () => {
        expect(endpointFor({ env: 'test', kind: 'personal' })).toBe('https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP');
        expect(endpointFor({ env: 'test', kind: 'sello' })).toBe('https://prewww10.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP');
        expect(endpointFor({ env: 'production', kind: 'personal' })).toBe('https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP');
        expect(endpointFor({ env: 'production', kind: 'sello' })).toBe('https://www10.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP');
    });
});

describe('XML de alta y anulación', () => {
    test('valida contra SuministroLR y no resta el IRPF del importe', async () => {
        const prepared = prepareAlta({ registro: registroBase, chain: chainVacia, producer, cabecera });
        expect(prepared.cuotaTotal).toBe('262.00');
        expect(prepared.importeTotal).toBe('1262.00');
        expect(prepared.payload.encadenamiento.primerRegistro).toBe(true);
        const xml = buildRegFactuXml({ cabecera, registros: [prepared.payload] });
        expect(xml).toContain('<sf:PrimerRegistro>S</sf:PrimerRegistro>');
        expect(xml).toContain('<sf:DescripcionOperacion>Servicio A &amp; B</sf:DescripcionOperacion>');
        expect(xml).toContain('<sf:TipoRecargoEquivalencia>5.2</sf:TipoRecargoEquivalencia>');
        expect(xml).not.toContain('1060');
        await validateVerifactuXml(xml);
    });

    test('encadena el alta siguiente y valida la anulación', async () => {
        const first = prepareAlta({ registro: registroBase, chain: chainVacia, producer, cabecera });
        const second = prepareAlta({
            registro: { ...registroBase, invoiceNumber: 'FAC-2026-0002', fechaHora: '2026-03-01T10:16:00+01:00' },
            chain: {
                last_huella: first.huella,
                last_num_serie: first.numSerie,
                last_fecha_expedicion: first.fechaExpedicion,
                numero_instalacion: 'WK-12345678Z',
            },
            producer,
            cabecera,
        });
        expect(second.cadena).toContain(`Huella=${first.huella}`);
        const xmlAlta = buildRegFactuXml({ cabecera, registros: [second.payload] });
        expect(xmlAlta).toContain(`<sf:Huella>${first.huella}</sf:Huella>`);
        await validateVerifactuXml(xmlAlta);

        const baja = prepareAnulacion({
            registro: {
                issuerTaxId: '12345678Z',
                issuerLegalName: 'Ana López',
                invoiceNumber: 'FAC-2026-0001',
                issueDate: '2026-03-01',
                fechaHora: '2026-03-01T10:20:00+01:00',
            },
            chain: {
                last_huella: second.huella,
                last_num_serie: second.numSerie,
                last_fecha_expedicion: second.fechaExpedicion,
                numero_instalacion: 'WK-12345678Z',
            },
            producer,
            cabecera,
        });
        const xmlBaja = buildRegFactuXml({ cabecera: baja.payload.cabecera, registros: [baja.payload] });
        expect(xmlBaja).toContain('<sf:RegistroAnulacion>');
        expect(xmlBaja).toContain('<sf:IDEmisorFacturaAnulada>12345678Z</sf:IDEmisorFacturaAnulada>');
        expect(xmlBaja).toContain(`<sf:Huella>${second.huella}</sf:Huella>`);
        await validateVerifactuXml(xmlBaja);
    });

    test('la factura simplificada no lleva destinatario y el representante sí va en la cabecera', async () => {
        const prepared = prepareAlta({
            registro: {
                ...registroBase,
                invoiceKind: 'simplified',
                invoiceNumber: 'F2-1',
                lines: [{
                    description: 'Ticket',
                    quantity: 1,
                    unit_price: 10,
                    tax_rate: 21,
                    subtotal: 10,
                    tax_amount: 2.1,
                    equivalence_surcharge_rate: 0,
                    equivalence_surcharge_amount: 0,
                }],
            },
            chain: chainVacia,
            producer,
            cabecera,
        });
        expect(prepared.tipoFactura).toBe('F2');
        const conRepresentante = {
            obligado: cabecera.obligado,
            representante: { nombre: 'Asesor SL', nif: 'B12345674' },
        };
        const xml = buildRegFactuXml({ cabecera: conRepresentante, registros: [prepared.payload] });
        expect(xml).not.toContain('Destinatarios');
        expect(xml).toContain('<sf:Representante>');
        await validateVerifactuXml(xml);
    });

    test('la rectificativa por sustitución cita la original', async () => {
        const prepared = prepareAlta({
            registro: {
                ...registroBase,
                invoiceType: 'rectificativa',
                rectificationMethod: 'substitution',
                rectificationCode: 'R1',
                rectified: {
                    invoice_number: 'FAC-2025-0009',
                    issue_date: '2025-12-01',
                    issuer_tax_id: '12345678Z',
                    subtotal_amount: 800,
                    tax_amount: 168,
                    equivalence_surcharge_amount: 0,
                },
            },
            chain: chainVacia,
            producer,
            cabecera,
        });
        expect(prepared.tipoFactura).toBe('R1');
        expect(prepared.payload.tipoRectificativa).toBe('S');
        const xml = buildRegFactuXml({ cabecera, registros: [prepared.payload] });
        expect(xml).toContain('<sf:NumSerieFactura>FAC-2025-0009</sf:NumSerieFactura>');
        expect(xml).toContain('<sf:BaseRectificada>800.00</sf:BaseRectificada>');
        await validateVerifactuXml(xml);
    });

    test('cambiar la subsanación no cambia la huella', async () => {
        const prepared = prepareAlta({ registro: registroBase, chain: chainVacia, producer, cabecera });
        const xml = buildRegFactuXml({ cabecera, registros: [prepared.payload] });
        const row = { operation: 'alta', huella: prepared.huella, payload_json: prepared.payload };
        const rebuilt = await rebuildRecordXml(row, { subsanacion: 'S', rechazoPrevio: 'S' });
        expect(rebuilt.payload.huella).toBe(prepared.huella);
        expect(rebuilt.xml).toContain('<sf:Subsanacion>S</sf:Subsanacion>');
        expect(rebuilt.xml).toContain('<sf:RechazoPrevio>S</sf:RechazoPrevio>');
        expect(rebuilt.xml).toContain(`<sf:Huella>${prepared.huella}</sf:Huella>`);
        expect(xml).not.toBe(rebuilt.xml);
    });
});

describe('Certificado y respuesta SOAP', () => {
    const previousKey = process.env.VERIFACTU_CERT_KEY;

    afterAll(() => {
        if (previousKey == null) delete process.env.VERIFACTU_CERT_KEY;
        else process.env.VERIFACTU_CERT_KEY = previousKey;
    });

    test('cifra y descifra sin dejar la clave en el texto', () => {
        process.env.VERIFACTU_CERT_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');
        const hidden = encryptText('clave-del-pfx');
        expect(hidden).not.toContain('clave-del-pfx');
        expect(decryptText(hidden)).toBe('clave-del-pfx');
    });

    test('lee CSV, tiempo de espera y el estado de cada línea', () => {
        const body = `
            <tikR:RespuestaRegFactuSistemaFacturacion>
              <tikR:CSV>CSV123</tikR:CSV>
              <tikR:TiempoEsperaEnvio>60</tikR:TiempoEsperaEnvio>
              <tikR:EstadoEnvio>ParcialmenteCorrecto</tikR:EstadoEnvio>
              <tikR:RespuestaLinea>
                <tik:IDEmisorFactura>12345678Z</tik:IDEmisorFactura>
                <tik:NumSerieFactura>FAC-1</tik:NumSerieFactura>
                <tik:FechaExpedicionFactura>01-03-2026</tik:FechaExpedicionFactura>
                <tik:EstadoRegistro>Correcto</tik:EstadoRegistro>
              </tikR:RespuestaLinea>
              <tikR:RespuestaLinea>
                <tik:NumSerieFactura>FAC-2</tik:NumSerieFactura>
                <tik:FechaExpedicionFactura>02-03-2026</tik:FechaExpedicionFactura>
                <tik:EstadoRegistro>AceptadoConErrores</tik:EstadoRegistro>
                <tik:CodigoErrorRegistro>2000</tik:CodigoErrorRegistro>
                <tik:DescripcionErrorRegistro>Aviso &amp; detalle</tik:DescripcionErrorRegistro>
              </tikR:RespuestaLinea>
              <tikR:RespuestaLinea>
                <tik:NumSerieFactura>FAC-3</tik:NumSerieFactura>
                <tik:FechaExpedicionFactura>03-03-2026</tik:FechaExpedicionFactura>
                <tik:EstadoRegistro>Incorrecto</tik:EstadoRegistro>
              </tikR:RespuestaLinea>
            </tikR:RespuestaRegFactuSistemaFacturacion>`;
        const parsed = parseAeatResponse(body);
        expect(parsed.csv).toBe('CSV123');
        expect(parsed.tiempoEsperaEnvio).toBe(60);
        expect(parsed.estadoEnvio).toBe('ParcialmenteCorrecto');
        expect(parsed.lineas.map(line => line.estadoRegistro)).toEqual(['Correcto', 'AceptadoConErrores', 'Incorrecto']);
        expect(parsed.lineas[1].descripcionError).toBe('Aviso & detalle');
    });

    test('no abre una conexión real con la AEAT', async () => {
        await expect(sendRegFactu({ xml: '<a/>', pfx: Buffer.from('x'), passphrase: '' })).rejects.toThrow(/No se llama a la AEAT/);
    });
});

describe('Cola de envío', () => {
    test('espera el tiempo de la AEAT salvo que la cola llegue a 1000', () => {
        const now = new Date('2026-03-01T12:00:00Z');
        expect(shouldSend({ pendingCount: 1, lastSentAt: null, waitSeconds: 60, now })).toBe(true);
        expect(shouldSend({
            pendingCount: 2,
            lastSentAt: new Date('2026-03-01T11:59:30Z'),
            waitSeconds: 60,
            now,
        })).toBe(false);
        expect(shouldSend({
            pendingCount: 1000,
            lastSentAt: new Date('2026-03-01T11:59:30Z'),
            waitSeconds: 60,
            now,
        })).toBe(true);
        expect(shouldSend({
            pendingCount: 1,
            lastSentAt: new Date('2026-03-01T11:58:00Z'),
            waitSeconds: 60,
            now,
        })).toBe(true);
    });

    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
        <sfLR:RegFactuSistemaFacturacion xmlns:sfLR="urn:lr" xmlns:sf="urn:sf">
          <sfLR:Cabecera><sf:NIF>12345678Z</sf:NIF></sfLR:Cabecera>
          <sfLR:RegistroFactura><sf:RegistroAlta/></sfLR:RegistroFactura>
        </sfLR:RegFactuSistemaFacturacion>`;

    const responseFor = (estadoRegistro, estadoEnvio = 'Correcto') => ({
        body: `<r>
            <CSV>CSV999</CSV><TiempoEsperaEnvio>45</TiempoEsperaEnvio><EstadoEnvio>${estadoEnvio}</EstadoEnvio>
            <RespuestaLinea>
              <NumSerieFactura>FAC-2026-0001</NumSerieFactura>
              <FechaExpedicionFactura>01-03-2026</FechaExpedicionFactura>
              <EstadoRegistro>${estadoRegistro}</EstadoRegistro>
              <CodigoErrorRegistro>1234</CodigoErrorRegistro>
              <DescripcionErrorRegistro>detalle</DescripcionErrorRegistro>
            </RespuestaLinea>
          </r>`,
    });

    const harness = (initial, transport) => {
        const state = { sender: null, updates: [], invoices: [] };
        const records = [{
            id: 4,
            invoice_id: 8,
            issuer_tax_id: '12345678Z',
            sender_key: '12345678Z',
            operation: 'alta',
            xml: sampleXml,
            num_serie: 'FAC-2026-0001',
            fecha_expedicion: '01-03-2026',
            attempts: 0,
            status: 'queued',
            ...initial,
        }];
        const query = async (sql, params) => {
            if (sql.includes("status = 'queued'")) return [records.filter(row => row.status === 'queued')];
            if (sql.includes('FROM verifactu_sender_state')) return [[state.sender].filter(Boolean)];
            if (sql.includes('INSERT INTO verifactu_sender_state')) {
                state.sender = { last_sent_at: params[1], wait_seconds: params[2] };
                return [{}];
            }
            if (sql.includes("status = 'sending'") || sql.includes('pending_certificate')) {
                state.updates.push(sql);
                return [{}];
            }
            if (sql.includes('UPDATE verifactu_records')) {
                state.updates.push({ sql, params });
                return [{}];
            }
            if (sql.includes('UPDATE invoices')) {
                state.invoices.push(params);
                return [{}];
            }
            throw new Error(`SQL no prevista: ${sql}`);
        };
        return { state, query, transport };
    };

    test('guarda CSV y tiempo de espera cuando la AEAT acepta', async () => {
        const now = new Date('2026-03-01T12:00:00Z');
        const box = harness({}, async () => responseFor('Correcto'));
        const result = await processDueSubmissions({ query: box.query, transport: box.transport, now, resolveTls: async () => ({ pfx: Buffer.from('a'), passphrase: 'b', certKind: 'personal' }) });
        expect(result[0].sent).toBe(true);
        expect(result[0].csv).toBe('CSV999');
        expect(box.state.sender.wait_seconds).toBe(45);
        const saved = box.state.updates.find(item => item.params);
        expect(saved.params[0]).toBe('correcto');
        expect(saved.params[1]).toBe('CSV999');
    });

    test('no envía si todavía no ha pasado el tiempo de espera', async () => {
        const now = new Date('2026-03-01T12:00:00Z');
        const box = harness({}, jest.fn());
        box.state.sender = { last_sent_at: new Date('2026-03-01T11:59:50Z'), wait_seconds: 60 };
        const result = await processDueSubmissions({ query: box.query, transport: box.transport, now, resolveTls: async () => ({ pfx: Buffer.from('a'), passphrase: '', certKind: 'personal' }) });
        expect(result[0]).toEqual({ senderKey: '12345678Z', sent: false, reason: 'espera' });
        expect(box.transport).not.toHaveBeenCalled();
    });

    test('marca aceptado con errores, incorrecto y reintento técnico', async () => {
        const now = new Date('2026-03-01T12:00:00Z');
        const tls = async () => ({ pfx: Buffer.from('a'), passphrase: '', certKind: 'personal' });
        const conErrores = harness({}, async () => responseFor('AceptadoConErrores', 'ParcialmenteCorrecto'));
        await processDueSubmissions({ query: conErrores.query, transport: conErrores.transport, now, resolveTls: tls });
        expect(conErrores.state.updates.find(item => item.params).params[0]).toBe('aceptado_con_errores');

        const incorrecto = harness({}, async () => responseFor('Incorrecto', 'Incorrecto'));
        await processDueSubmissions({ query: incorrecto.query, transport: incorrecto.transport, now, resolveTls: tls });
        expect(incorrecto.state.updates.find(item => item.params).params[0]).toBe('incorrecto');

        const caido = harness({}, async () => { throw new Error('red caída'); });
        await processDueSubmissions({ query: caido.query, transport: caido.transport, now, resolveTls: tls });
        const retry = caido.state.updates.find(item => item.params);
        expect(retry.params[0]).toBe('queued');
        expect(retry.params[1]).toBe(1);
    });

    test('propone subsanación según el estado anterior', () => {
        expect(flagsForResubmit({ operation: 'alta', status: 'incorrecto' })).toEqual({ subsanacion: 'S', rechazoPrevio: 'S' });
        expect(flagsForResubmit({ operation: 'alta', status: 'aceptado_con_errores' })).toEqual({ subsanacion: 'S', rechazoPrevio: 'N' });
        expect(flagsForResubmit({ operation: 'anulacion', status: 'incorrecto' })).toEqual({ rechazoPrevio: 'S' });
    });
});

describe('Proveedor AEAT dentro de la emisión', () => {
    const envBackup = {};

    beforeAll(() => {
        for (const key of ['VERIFACTU_PRODUCER_NAME', 'VERIFACTU_PRODUCER_NIF', 'VERIFACTU_SYSTEM_ID', 'VERIFACTU_ENV', 'VERIFACTU_PROVIDER']) {
            envBackup[key] = process.env[key];
        }
        process.env.VERIFACTU_PRODUCER_NAME = 'Productor Demo SL';
        process.env.VERIFACTU_PRODUCER_NIF = 'B12345674';
        process.env.VERIFACTU_SYSTEM_ID = '01';
        process.env.VERIFACTU_ENV = 'test';
        process.env.VERIFACTU_PROVIDER = 'aeat';
    });

    afterAll(() => {
        for (const [key, value] of Object.entries(envBackup)) {
            if (value == null) delete process.env[key];
            else process.env[key] = value;
        }
    });

    test('deja el QR y la leyenda y encadena el segundo registro', async () => {
        let chain = null;
        const saved = [];
        const conn = {
            query: async (sql, params) => {
                if (sql.includes('FROM verifactu_representation')) return [[]];
                if (sql.includes('INSERT INTO verifactu_chain')) {
                    if (!chain) {
                        chain = {
                            issuer_tax_id: params[0],
                            numero_instalacion: params[1],
                            last_huella: null,
                            last_num_serie: null,
                            last_fecha_expedicion: null,
                        };
                    }
                    return [{}];
                }
                if (sql.includes('FROM verifactu_chain')) return [[chain]];
                if (sql.includes('FROM verifactu_certificates')) return [[]];
                if (sql.includes('INSERT INTO verifactu_records')) {
                    saved.push({ xml: params[4], huella: params[5] });
                    return [{ insertId: saved.length }];
                }
                if (sql.includes('UPDATE verifactu_chain')) {
                    chain.last_huella = params[0];
                    chain.last_num_serie = params[1];
                    chain.last_fecha_expedicion = params[2];
                    return [{}];
                }
                throw new Error(`SQL no prevista: ${sql}`);
            },
        };
        const provider = new AeatVerifactuProvider();
        const alta = await provider.registrarAlta({ ...registroBase, invoiceId: 8, conn });
        expect(alta.status).toBe('pending_certificate');
        expect(alta.legend).toBe('VERI*FACTU');
        expect(alta.qrUrl).toContain('https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?');
        expect(alta.qrUrl).toContain('importe=1262.00');
        expect(saved[0].xml).toContain('<sf:PrimerRegistro>S</sf:PrimerRegistro>');

        const segunda = await provider.registrarAlta({
            ...registroBase,
            invoiceId: 9,
            invoiceNumber: 'FAC-2026-0002',
            fechaHora: '2026-03-01T10:16:00+01:00',
            conn,
        });
        expect(segunda.externalId).toBe('2');
        expect(saved[1].xml).toContain(`<sf:Huella>${saved[0].huella}</sf:Huella>`);
        expect(saved[1].huella).not.toBe(saved[0].huella);
    });

    test('exige los datos del productor antes de consumir el número', async () => {
        delete process.env.VERIFACTU_PRODUCER_NAME;
        const provider = new AeatVerifactuProvider();
        await expect(provider.registrarAlta({
            ...registroBase,
            invoiceId: 1,
            conn: { query: async () => { throw new Error('no debería consultar'); } },
        })).rejects.toThrow(/productor/i);
        process.env.VERIFACTU_PRODUCER_NAME = 'Productor Demo SL';
    });
});
