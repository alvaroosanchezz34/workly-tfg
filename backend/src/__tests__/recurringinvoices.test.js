/**
 * Tests: RecurringInvoices Controller
 * Ruta real: /api/recurring-invoices (no /api/invoices/recurring)
 */

import { jest } from '@jest/globals';

const mockConn = {
    query:            jest.fn(),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit:           jest.fn().mockResolvedValue(undefined),
    rollback:         jest.fn().mockResolvedValue(undefined),
    release:          jest.fn(),
};
const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery, getConnection: jest.fn().mockResolvedValue(mockConn) },
}));
jest.unstable_mockModule('../utils/activityLogger.js', () => ({
    logActivity: jest.fn().mockResolvedValue(undefined),
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        sign:   jest.fn().mockReturnValue('mock_token'),
        verify: jest.fn().mockReturnValue({ id: 1, role: 'user' }),
    },
}));

const { default: request } = await import('supertest');
const { default: app }     = await import('../app.js');

const AUTH = { Authorization: 'Bearer mock_token' };
const USER = [[{ id: 1, name: 'Koke', email: 'koke@test.com', role: 'user', plan: 'pro', plan_status: 'active', company_id: null }]];

const VALID_BODY = {
    client_id: 1,
    frequency: 'monthly',
    next_date: '2026-06-01',
    items: [{ description: 'Mantenimiento web', quantity: 1, unit_price: 200, tax_rate: 21 }],
};

describe('RecurringInvoices - GET /api/recurring-invoices', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve lista de plantillas recurrentes', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[
                { id: 1, frequency: 'monthly', total_amount: 242, client_name: 'Empresa A', status: 'active' },
                { id: 2, frequency: 'yearly',  total_amount: 500, client_name: 'Empresa B', status: 'paused' },
            ]]);

        const res = await request(app).get('/api/recurring-invoices').set(AUTH);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
    });

    test('200 - lista vacía', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]);

        const res = await request(app).get('/api/recurring-invoices').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });

    test('401 - sin token', async () => {
        const res = await request(app).get('/api/recurring-invoices');
        expect(res.status).toBe(401);
    });
});

describe('RecurringInvoices - POST /api/recurring-invoices', () => {
    beforeEach(() => {
        mockQuery.mockReset();
        mockConn.query.mockReset();
        mockConn.beginTransaction.mockResolvedValue(undefined);
        mockConn.commit.mockResolvedValue(undefined);
        mockConn.rollback.mockResolvedValue(undefined);
        mockQuery.mockResolvedValueOnce(USER);
        mockConn.query
            .mockResolvedValueOnce([[{ id: 1 }]])     // cliente válido
            .mockResolvedValueOnce([{ insertId: 5 }]) // INSERT recurring
            .mockResolvedValueOnce([{}]);              // INSERT item
    });

    test('201 - plantilla creada correctamente', async () => {
        const res = await request(app)
            .post('/api/recurring-invoices').set(AUTH)
            .send(VALID_BODY);

        expect(res.status).toBe(201);
        expect(res.body.recurringId).toBe(5);
    });

    test('400 - cliente no válido', async () => {
        mockQuery.mockReset();
        mockConn.query.mockReset();
        mockConn.beginTransaction.mockResolvedValue(undefined);
        mockConn.commit.mockResolvedValue(undefined);
        mockConn.rollback.mockResolvedValue(undefined);
        mockQuery.mockResolvedValueOnce(USER);
        mockConn.query.mockResolvedValueOnce([[]]); // cliente no encontrado → catch → 400

        const res = await request(app)
            .post('/api/recurring-invoices').set(AUTH)
            .send({ ...VALID_BODY, client_id: 999 });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/cliente/i);
    });
});

describe('RecurringInvoices - PUT /api/recurring-invoices/:id', () => {
    beforeEach(() => mockQuery.mockReset());

    test('200 - cambia estado a paused', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE directo (sin SELECT previo)

        const res = await request(app)
            .patch('/api/recurring-invoices/1/status').set(AUTH)
            .send({ status: 'paused' });

        expect(res.status).toBe(200);
    });

    test('400 - estado no válido', async () => {
        mockQuery.mockResolvedValueOnce(USER);

        const res = await request(app)
            .patch('/api/recurring-invoices/1/status').set(AUTH)
            .send({ status: 'estado_invalido' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/no válido/i);
    });
});

describe('RecurringInvoices - DELETE /api/recurring-invoices/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - plantilla eliminada', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE directo (sin SELECT previo)

        const res = await request(app).delete('/api/recurring-invoices/1').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/eliminad/i);
    });

    test('401 - sin token', async () => {
        const res = await request(app).delete('/api/recurring-invoices/1');
        expect(res.status).toBe(401);
    });
});