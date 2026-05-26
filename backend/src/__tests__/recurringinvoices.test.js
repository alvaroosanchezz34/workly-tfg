/**
 * Tests: RecurringInvoices Controller
 * Cubre: GET/POST/PUT/DELETE /api/invoices/recurring
 */

import { jest } from '@jest/globals';

const mockConn = {
    query:           jest.fn(),
    beginTransaction: jest.fn(),
    commit:          jest.fn(),
    rollback:        jest.fn(),
    release:         jest.fn(),
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

const VALID_BODY = {
    client_id: 1,
    frequency: 'monthly',
    next_date: '2026-06-01',
    items: [{ description: 'Mantenimiento web', quantity: 1, unit_price: 200, tax_rate: 21 }],
};

describe('RecurringInvoices - GET /api/invoices/recurring', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve lista de plantillas recurrentes', async () => {
        mockQuery.mockResolvedValueOnce([[
            { id: 1, frequency: 'monthly', total_amount: 242, client_name: 'Empresa A', status: 'active' },
            { id: 2, frequency: 'yearly',  total_amount: 500, client_name: 'Empresa B', status: 'paused' },
        ]]);

        const res = await request(app).get('/api/invoices/recurring').set(AUTH);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].frequency).toBe('monthly');
    });

    test('200 - lista vacía si no hay recurrentes', async () => {
        mockQuery.mockResolvedValueOnce([[]]);

        const res = await request(app).get('/api/invoices/recurring').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });

    test('401 - sin token', async () => {
        const res = await request(app).get('/api/invoices/recurring');
        expect(res.status).toBe(401);
    });
});

describe('RecurringInvoices - POST /api/invoices/recurring', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockConn.query
            .mockResolvedValueOnce([[{ id: 1 }]])   // cliente válido
            .mockResolvedValueOnce([{ insertId: 5 }]) // INSERT recurring
            .mockResolvedValueOnce([{}]);             // INSERT item
    });

    test('201 - plantilla creada correctamente', async () => {
        const res = await request(app)
            .post('/api/invoices/recurring').set(AUTH)
            .send(VALID_BODY);

        expect(res.status).toBe(201);
        expect(res.body.recurringId).toBe(5);
    });

    test('400 - cliente no válido', async () => {
        jest.clearAllMocks();
        mockConn.query.mockResolvedValueOnce([[]]); // cliente no encontrado

        const res = await request(app)
            .post('/api/invoices/recurring').set(AUTH)
            .send({ ...VALID_BODY, client_id: 999 });

        expect(res.status).toBe(400);
    });
});

describe('RecurringInvoices - PUT /api/invoices/recurring/:id (pausa/activa)', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - cambia estado a paused', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1, user_id: 1, status: 'active' }]]) // existe
            .mockResolvedValueOnce([{ affectedRows: 1 }]);                        // UPDATE

        const res = await request(app)
            .put('/api/invoices/recurring/1').set(AUTH)
            .send({ status: 'paused' });

        expect(res.status).toBe(200);
    });

    test('404 - plantilla no encontrada', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // no existe

        const res = await request(app)
            .put('/api/invoices/recurring/999').set(AUTH)
            .send({ status: 'paused' });

        expect(res.status).toBe(404);
    });
});

describe('RecurringInvoices - DELETE /api/invoices/recurring/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - plantilla eliminada (soft delete)', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1, user_id: 1 }]])  // existe
            .mockResolvedValueOnce([{ affectedRows: 1 }]);      // UPDATE is_deleted

        const res = await request(app).delete('/api/invoices/recurring/1').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/eliminad/i);
    });

    test('404 - plantilla no existe', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // no encontrada

        const res = await request(app).delete('/api/invoices/recurring/999').set(AUTH);

        expect(res.status).toBe(404);
    });
});