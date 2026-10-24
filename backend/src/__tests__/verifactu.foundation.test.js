/**
 * Cimientos de la fase 1 de VeriFactu: totales, NIF, numeración,
 * proveedor vacío, inmutabilidad, emisión, anulación y rectificativa.
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockConnection = {
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
};

jest.unstable_mockModule('../config/db.js', () => ({
    pool: {
        query: mockQuery,
        getConnection: jest.fn().mockResolvedValue(mockConnection),
    },
}));

jest.unstable_mockModule('../utils/activityLogger.js', () => ({
    logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../services/pdf.service.js', () => ({
    generateInvoicePDF: jest.fn(),
    generateInvoicePDFBuffer: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        verify: jest.fn().mockReturnValue({ id: 1, role: 'user' }),
        sign: jest.fn().mockReturnValue('mock_token'),
    },
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
const { priceItems, round2 } = await import('../services/invoicing/totals.js');
const { validateSpanishTaxId } = await import('../services/invoicing/taxId.js');
const {
    formatInvoiceNumber, normalizeSeriesCode, seriesYear, allocateInvoiceNumber, issuerKeyFor,
} = await import('../services/invoicing/numbering.js');
const { appendInvoiceEvent } = await import('../services/invoicing/invoiceEvents.js');
const { NoOpVerifactuProvider, VerifactuProvider, registerVerifactuProvider } = await import('../services/verifactu/index.js');

const AUTH = { Authorization: 'Bearer mock_token' };
const USER = [[{ id: 1, name: 'Koke', email: 'koke@test.com', role: 'user', plan: 'pro', plan_status: 'active', company_id: null }]];

const DRAFT = {
    id: 8,
    status: 'draft',
    issuer_key: 'user:1',
    client_name: 'Ana',
    client_company: null,
    client_document: '12345678Z',
    client_address: 'Calle Mayor 1, Madrid',
    client_deleted: 0,
    invoice_kind: 'complete',
    invoice_type: 'normal',
    rectification_method: null,
    rectifies_invoice_id: null,
    issue_date: '2026-03-01',
    subtotal_amount: 1000,
    tax_amount: 210,
    equivalence_surcharge_amount: 0,
    irpf_rate: 15,
    irpf_amount: 150,
    total_amount: 1060,
};

describe('Cálculo fiscal', () => {
    test('desglosa IVA, recargo e IRPF', () => {
        const priced = priceItems(
            [{ description: 'Servicio', quantity: 2, unit_price: 500, tax_rate: 21, equivalence_surcharge_rate: 5.2 }],
            15,
        );
        expect(priced.totals.subtotal_amount).toBe(1000);
        expect(priced.totals.tax_amount).toBe(210);
        expect(priced.totals.equivalence_surcharge_amount).toBe(52);
        expect(priced.totals.irpf_amount).toBe(150);
        expect(priced.totals.total_amount).toBe(1112);
        expect(round2(1.005)).toBe(1.01);
    });

    test('admite cantidad negativa para una rectificativa por diferencias', () => {
        const priced = priceItems([{ description: 'Ajuste', quantity: -1, unit_price: 100, tax_rate: 21 }], 0);
        expect(priced.totals.total_amount).toBe(-121);
    });

    test('rechaza una factura sin líneas', () => {
        expect(() => priceItems([], 0)).toThrow(/al menos/i);
    });
});

describe('NIF español', () => {
    test('acepta DNI, NIE y CIF con letra o dígito de control', () => {
        expect(validateSpanishTaxId('12345678-Z')).toMatchObject({ ok: true, value: '12345678Z', kind: 'nif' });
        expect(validateSpanishTaxId('X1234567L').ok).toBe(true);
        expect(validateSpanishTaxId('B12345674')).toMatchObject({ ok: true, kind: 'cif' });
    });

    test('rechaza un NIF con la letra mal', () => {
        expect(validateSpanishTaxId('12345678A').ok).toBe(false);
    });
});

describe('Numeración por emisor y serie', () => {
    test('el número es de la serie, y sin año si la serie no se reinicia', () => {
        expect(normalizeSeriesCode('fac-')).toBe('FAC');
        expect(seriesYear('2026-03-01', true)).toBe(2026);
        expect(seriesYear('2026-03-01', false)).toBe(0);
        expect(formatInvoiceNumber({ seriesCode: 'FAC', year: 2026, seq: 7, padding: 4 })).toBe('FAC-2026-0007');
        expect(formatInvoiceNumber({ seriesCode: 'FAC', year: 0, seq: 7, padding: 4 })).toBe('FAC-0007');
        expect(issuerKeyFor({ id: 4, company_id: 9 })).toBe('company:9');
        expect(issuerKeyFor({ id: 4, company_id: null })).toBe('user:4');
    });

    test('reserva el número con bloqueo y lo incrementa en la misma conexión', async () => {
        const calls = [];
        const conn = {
            query: async sql => {
                calls.push(sql);
                if (sql.includes('FOR UPDATE')) return [[{ id: 3, next_number: 7, padding: 4 }]];
                return [{}];
            },
        };
        const allocated = await allocateInvoiceNumber(conn, {
            issuerKey: 'user:1', seriesCode: 'FAC', padding: 4, year: 2026,
        });
        expect(allocated.number).toBe('FAC-2026-0007');
        expect(calls.some(sql => sql.includes('FOR UPDATE'))).toBe(true);
        expect(calls.some(sql => sql.includes('next_number = next_number + 1'))).toBe(true);
    });
});

describe('Proveedor VeriFactu', () => {
    test('el proveedor vacío no inventa QR ni leyenda', async () => {
        const provider = new NoOpVerifactuProvider();
        const alta = await provider.registrarAlta({ invoiceId: 1 });
        const qr = await provider.obtenerQr({ invoiceId: 1 });
        expect(alta).toMatchObject({ status: 'not_configured', qrUrl: null, legend: null, externalId: null });
        expect(qr).toEqual({ qrUrl: null, legend: null });
        await expect(new VerifactuProvider().registrarAlta({})).rejects.toThrow(/registrarAlta/);
    });

    test('la bitácora solo admite acciones conocidas', async () => {
        const executor = { query: jest.fn().mockResolvedValue([{}]) };
        await appendInvoiceEvent(executor, { invoiceId: 1, issuerKey: 'user:1', userId: 1, action: 'issued' });
        expect(executor.query).toHaveBeenCalledTimes(1);
        const sql = executor.query.mock.calls[0][0];
        expect(sql).toMatch(/INSERT INTO invoice_events/);
        expect(sql).not.toMatch(/UPDATE|DELETE/);
        await expect(appendInvoiceEvent(executor, { invoiceId: 1, action: 'edited' })).rejects.toThrow(/no reconocida/);
    });
});

describe('Emisión, anulación y rectificativa', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockConnection.query.mockReset();
        delete process.env.VERIFACTU_PROVIDER;
    });

    test('409 al editar una factura emitida', async () => {
        mockQuery.mockResolvedValueOnce(USER);
        mockConnection.query.mockResolvedValueOnce([[{ id: 8, status: 'sent', issuer_key: 'user:1' }]]);

        const res = await request(app).put('/api/invoices/8').set(AUTH).send({
            client_id: 1, issue_date: '2026-03-01', items: [{ description: 'Cambio', quantity: 1, unit_price: 10, tax_rate: 21 }],
        });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/rectificativa/i);
        expect(mockConnection.rollback).toHaveBeenCalled();
        expect(mockConnection.commit).not.toHaveBeenCalled();
    });

    test('400 si se emite sin perfil fiscal', async () => {
        mockQuery.mockResolvedValueOnce(USER);
        mockConnection.query
            .mockResolvedValueOnce([[DRAFT]])
            .mockResolvedValueOnce([[{ description: 'Servicio', quantity: 1, unit_price: 1000, tax_rate: 21, equivalence_surcharge_rate: 0, subtotal: 1000, tax_amount: 210, equivalence_surcharge_amount: 0, total: 1210 }]])
            .mockResolvedValueOnce([[]]);

        const res = await request(app).post('/api/invoices/8/issue').set(AUTH).send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/perfil fiscal/i);
        expect(mockConnection.rollback).toHaveBeenCalled();
    });

    test('emite con número correlativo y sin QR mientras el proveedor esté vacío', async () => {
        mockQuery.mockResolvedValueOnce(USER);
        mockConnection.query
            .mockResolvedValueOnce([[DRAFT]])
            .mockResolvedValueOnce([[{ description: 'Servicio', quantity: 1, unit_price: 1000, tax_rate: 21, equivalence_surcharge_rate: 0, subtotal: 1000, tax_amount: 210, equivalence_surcharge_amount: 0, total: 1210 }]])
            .mockResolvedValueOnce([[{ legal_name: 'Ana López', tax_id: '12345678Z', fiscal_address: 'Calle Mayor 1, Madrid' }]])
            .mockResolvedValueOnce([[{ prefix: 'FAC', padding: 4, reset_yearly: 1 }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id: 1, next_number: 3, padding: 4 }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}]);

        const res = await request(app).post('/api/invoices/8/issue').set(AUTH).send({});
        expect(res.status).toBe(200);
        expect(res.body.invoice_number).toBe('FAC-2026-0003');
        expect(res.body.verifactu_status).toBe('not_configured');
        expect(res.body.verifactu_qr_url).toBeNull();
        expect(res.body.verifactu_legend).toBeNull();
        expect(mockConnection.commit).toHaveBeenCalled();
    });

    test('anula una factura emitida y no reutiliza el borrador', async () => {
        mockQuery.mockResolvedValueOnce(USER);
        mockConnection.query
            .mockResolvedValueOnce([[{ id: 8, status: 'sent', invoice_number: 'FAC-2026-0003', issuer_key: 'user:1', issuer_tax_id: '12345678Z', series_code: 'FAC', issue_date: '2026-03-01' }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}]);

        const res = await request(app).post('/api/invoices/8/void').set(AUTH).send({ reason: 'Error de cliente' });
        expect(res.status).toBe(200);
        expect(res.body.invoice_number).toBe('FAC-2026-0003');

        mockQuery.mockResolvedValueOnce(USER);
        mockConnection.query.mockResolvedValueOnce([[{ id: 8, status: 'draft' }]]);
        const draft = await request(app).post('/api/invoices/8/void').set(AUTH).send({ reason: 'No procede' });
        expect(draft.status).toBe(400);
    });

    test('abre una rectificativa por sustitución como borrador nuevo', async () => {
        mockQuery.mockResolvedValueOnce(USER);
        mockConnection.query
            .mockResolvedValueOnce([[{ ...DRAFT, status: 'sent', invoice_number: 'FAC-2026-0003', irpf_rate: 15, due_date: '2026-04-01', client_id: 2, invoice_kind: 'complete' }]])
            .mockResolvedValueOnce([[{ description: 'Servicio', quantity: 1, unit_price: 1000, tax_rate: 21, equivalence_surcharge_rate: 0 }]])
            .mockResolvedValueOnce([{ insertId: 15 }])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}]);

        const res = await request(app).post('/api/invoices/8/rectify').set(AUTH).send({ method: 'substitution' });
        expect(res.status).toBe(201);
        expect(res.body.invoiceId).toBe(15);
        expect(res.body.method).toBe('substitution');
        expect(res.body.message).toMatch(/sustitución/i);
    });

    test('si el proveedor falla, no se confirma el número', async () => {
        registerVerifactuProvider('boom', () => ({
            registrarAlta: async () => { throw new Error('proveedor caído'); },
            anular: async () => { throw new Error('proveedor caído'); },
            obtenerQr: async () => ({ qrUrl: null, legend: null }),
            obtenerEstado: async () => ({ status: 'error' }),
        }));
        process.env.VERIFACTU_PROVIDER = 'boom';
        mockQuery.mockResolvedValueOnce(USER);
        mockConnection.query
            .mockResolvedValueOnce([[DRAFT]])
            .mockResolvedValueOnce([[{ description: 'Servicio', quantity: 1, unit_price: 1000, tax_rate: 21, equivalence_surcharge_rate: 0, subtotal: 1000, tax_amount: 210, equivalence_surcharge_amount: 0, total: 1210 }]])
            .mockResolvedValueOnce([[{ legal_name: 'Ana López', tax_id: '12345678Z', fiscal_address: 'Calle Mayor 1, Madrid' }]])
            .mockResolvedValueOnce([[{ prefix: 'FAC', padding: 4, reset_yearly: 1 }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ id: 1, next_number: 4, padding: 4 }]])
            .mockResolvedValueOnce([{}]);

        const res = await request(app).post('/api/invoices/8/issue').set(AUTH).send({});
        expect(res.status).toBe(500);
        expect(mockConnection.rollback).toHaveBeenCalled();
        expect(mockConnection.commit).not.toHaveBeenCalled();
    });
});
