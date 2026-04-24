/**
 * Tests: Quotes Controller
 * Cubre: CRUD presupuestos + conversión a factura
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockConnection = {
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    query:            jest.fn(),
    commit:           jest.fn().mockResolvedValue(undefined),
    rollback:         jest.fn().mockResolvedValue(undefined),
    release:          jest.fn(),
};

jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery, getConnection: jest.fn().mockResolvedValue(mockConnection) },
}));
jest.unstable_mockModule('../utils/activityLogger.js', () => ({ logActivity: jest.fn() }));
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: { verify: jest.fn().mockReturnValue({ id: 1, role: 'user' }), sign: jest.fn().mockReturnValue('mock') },
}));

const { default: request } = await import('supertest');
const { default: app }     = await import('../app.js');
const AUTH = { Authorization: 'Bearer mock' };

const QUOTE_PAYLOAD = {
    client_id:   1,
    issue_date:  '2025-01-01',
    expiry_date: '2025-01-31',
    notes:       'Presupuesto test',
    items: [{ description: 'Diseño', quantity: 2, unit_price: 500, tax_rate: 21 }],
};

describe('Quotes - POST /api/quotes', () => {
    beforeEach(() => { jest.clearAllMocks(); mockConnection.query.mockReset(); });

    test('201 - presupuesto creado', async () => {
        mockConnection.query
            .mockResolvedValueOnce([[{ id: 1 }]])    // cliente válido
            .mockResolvedValueOnce([[{ seq: 1 }]])   // getNextQuoteNumber count
            .mockResolvedValueOnce([{ insertId: 3 }]) // INSERT quote
            .mockResolvedValueOnce([{}])              // INSERT item
            .mockResolvedValueOnce([[]])              // recalc items SELECT
            .mockResolvedValueOnce([{}]);             // UPDATE totals

        const res = await request(app).post('/api/quotes').set(AUTH).send(QUOTE_PAYLOAD);
        expect(res.status).toBe(201);
        expect(res.body.quoteId).toBe(3);
        expect(res.body.quote_number).toMatch(/^PRE-/);
        expect(mockConnection.commit).toHaveBeenCalled();
    });

    test('400 - sin items', async () => {
        const res = await request(app).post('/api/quotes').set(AUTH).send({ ...QUOTE_PAYLOAD, items: [] });
        expect(res.status).toBe(400);
    });

    test('401 - sin auth', async () => {
        const res = await request(app).post('/api/quotes').send(QUOTE_PAYLOAD);
        expect(res.status).toBe(401);
    });
});

describe('Quotes - GET /api/quotes', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - lista presupuestos', async () => {
        mockQuery
            .mockResolvedValueOnce([{}]) // UPDATE expired
            .mockResolvedValueOnce([[{ id: 1, quote_number: 'PRE-2025-0001', status: 'draft', client_name: 'Empresa A' }]]);

        const res = await request(app).get('/api/quotes').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body[0].quote_number).toBe('PRE-2025-0001');
    });
});

describe('Quotes - POST /api/quotes/:id/convert', () => {
    beforeEach(() => { jest.clearAllMocks(); mockConnection.query.mockReset(); });

    test('201 - convierte presupuesto a factura', async () => {
        mockConnection.query
            .mockResolvedValueOnce([[{ id: 1, client_id: 1, project_id: null, issue_date: '2025-01-01', expiry_date: '2025-01-31', notes: 'Test', subtotal_amount: 1000, tax_amount: 210, total_amount: 1210, converted_to_invoice_id: null }]])
            .mockResolvedValueOnce([[{ prefix: 'FAC', next_number: 1, padding: 4, current_year: 2025 }]]) // settings
            .mockResolvedValueOnce([{}])   // UPDATE next_number
            .mockResolvedValueOnce([{ insertId: 7 }]) // INSERT invoice
            .mockResolvedValueOnce([[{ id: 1, description: 'Diseño', quantity: 2, unit_price: 500, tax_rate: 21, subtotal: 1000, tax_amount: 210, total: 1210 }]]) // quote items
            .mockResolvedValueOnce([{}])   // INSERT invoice item
            .mockResolvedValueOnce([{}]);  // UPDATE quote status

        const res = await request(app)
            .post('/api/quotes/1/convert')
            .set(AUTH)
            .send({ issue_date: '2025-01-10', due_date: '2025-02-10' });

        expect(res.status).toBe(201);
        expect(res.body.invoiceId).toBe(7);
        expect(res.body.invoice_number).toMatch(/^FAC-/);
        expect(mockConnection.commit).toHaveBeenCalled();
    });

    test('400 - presupuesto ya convertido', async () => {
        mockConnection.query.mockResolvedValueOnce([[{ id: 1, converted_to_invoice_id: 5 }]]);
        const res = await request(app).post('/api/quotes/1/convert').set(AUTH).send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/ya fue convertido/i);
    });

    test('404 - presupuesto no encontrado', async () => {
        mockConnection.query.mockResolvedValueOnce([[undefined]]);
        const res = await request(app).post('/api/quotes/999/convert').set(AUTH).send({});
        expect(res.status).toBe(404);
    });
});

describe('Quotes - DELETE /api/quotes/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - elimina presupuesto', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1 }]]) // SELECT
            .mockResolvedValueOnce([{}]);          // UPDATE is_deleted

        const res = await request(app).delete('/api/quotes/1').set(AUTH);
        expect(res.status).toBe(200);
    });

    test('404 - presupuesto no encontrado', async () => {
        mockQuery.mockResolvedValueOnce([[undefined]]);
        const res = await request(app).delete('/api/quotes/999').set(AUTH);
        expect(res.status).toBe(404);
    });
});