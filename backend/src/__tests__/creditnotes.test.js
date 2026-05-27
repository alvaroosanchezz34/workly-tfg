/**
 * Tests: CreditNotes Controller
 * Cubre: GET/POST/DELETE /api/credit-notes
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

describe('CreditNotes - GET /api/credit-notes', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve lista de notas de crédito', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[
                { id: 1, credit_number: 'RC-2026-0001', total_amount: 121,  status: 'issued' },
                { id: 2, credit_number: 'RC-2026-0002', total_amount: 60.5, status: 'draft'  },
            ]]);

        const res = await request(app).get('/api/credit-notes').set(AUTH);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].credit_number).toBe('RC-2026-0001');
    });

    test('200 - lista vacía', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]);

        const res = await request(app).get('/api/credit-notes').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });

    test('401 - sin token', async () => {
        const res = await request(app).get('/api/credit-notes');
        expect(res.status).toBe(401);
    });
});

describe('CreditNotes - GET /api/credit-notes/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve nota con items', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 1, credit_number: 'RC-2026-0001', user_id: 1 }]])
            .mockResolvedValueOnce([[{ id: 1, description: 'Devolución', total: 121 }]]);

        const res = await request(app).get('/api/credit-notes/1').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.credit_number).toBe('RC-2026-0001');
    });

    test('404 - nota no encontrada', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]); // no existe

        const res = await request(app).get('/api/credit-notes/999').set(AUTH);

        expect(res.status).toBe(404);
    });
});

describe('CreditNotes - POST /api/credit-notes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockQuery.mockResolvedValueOnce(USER);
        mockConn.query
            .mockResolvedValueOnce([[{ id: 10, total_amount: 242 }]]) // factura válida
            .mockResolvedValueOnce([[{ seq: 1 }]])                     // getNextCreditNumber
            .mockResolvedValueOnce([{ insertId: 3 }])                 // INSERT credit_note
            .mockResolvedValueOnce([{}])                              // INSERT item
            .mockResolvedValueOnce([{}]);                             // UPDATE totales
    });

    test('201 - nota de crédito creada', async () => {
        const res = await request(app)
            .post('/api/credit-notes').set(AUTH)
            .send({
                invoice_id: 10,
                issue_date: '2026-05-20',
                reason: 'Error en factura',
                items: [{ description: 'Devolución parcial', quantity: 1, unit_price: 100, tax_rate: 21 }],
            });

        expect(res.status).toBe(201);
        expect(res.body.creditId).toBe(3);
    });

    test('404 - factura no encontrada', async () => {
        jest.clearAllMocks();
        mockConn.query.mockReset(); // reset connection mock independently
        mockQuery.mockResolvedValueOnce(USER);
        mockConn.query.mockResolvedValueOnce([[]]); // factura no existe

        const res = await request(app)
            .post('/api/credit-notes').set(AUTH)
            .send({ invoice_id: 999, issue_date: '2026-05-20', reason: 'Error', items: [] });

        expect(res.status).toBe(404);
    });
});

describe('CreditNotes - DELETE /api/credit-notes/:id', () => {
    beforeEach(() => { mockQuery.mockReset(); mockConn.query.mockReset(); });

    test('200 - nota eliminada', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 1, user_id: 1 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app).delete('/api/credit-notes/1').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/eliminad/i);
    });

    test('404 - nota no existe', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]); // SELECT status → no encontrada → 404

        const res = await request(app).delete('/api/credit-notes/999').set(AUTH);

        expect(res.status).toBe(404);
    });
});