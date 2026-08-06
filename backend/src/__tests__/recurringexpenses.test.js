/**
 * Tests: RecurringExpenses Controller
 * Ruta real: /api/recurring-expenses
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery, getConnection: jest.fn() },
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

const VALID_BODY = { category: 'software', description: 'Suscripción SaaS', amount: 29.99, frequency: 'monthly', next_date: '2026-06-01' };

describe('RecurringExpenses - POST /api/recurring-expenses', () => {
    beforeEach(() => jest.clearAllMocks());

    test('201 - crea gasto recurrente', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ insertId: 10 }]);

        const res = await request(app).post('/api/recurring-expenses').set(AUTH).send(VALID_BODY);

        expect(res.status).toBe(201);
        expect(res.body.recurringExpenseId).toBe(10);
    });

    test('400 - falta importe/fecha', async () => {
        mockQuery.mockResolvedValueOnce(USER);

        const res = await request(app).post('/api/recurring-expenses').set(AUTH).send({ frequency: 'monthly' });

        expect(res.status).toBe(400);
    });

    test('400 - frecuencia no válida', async () => {
        mockQuery.mockResolvedValueOnce(USER);

        const res = await request(app).post('/api/recurring-expenses').set(AUTH).send({ ...VALID_BODY, frequency: 'daily' });

        expect(res.status).toBe(400);
    });

    test('401 - sin auth', async () => {
        const res = await request(app).post('/api/recurring-expenses').send(VALID_BODY);
        expect(res.status).toBe(401);
    });
});

describe('RecurringExpenses - GET /api/recurring-expenses', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - lista gastos recurrentes', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 1, category: 'software', amount: 29.99, frequency: 'monthly' }]]);

        const res = await request(app).get('/api/recurring-expenses').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });
});

describe('RecurringExpenses - PATCH /api/recurring-expenses/:id/status', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - pausa el gasto recurrente', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app).patch('/api/recurring-expenses/1/status').set(AUTH).send({ status: 'paused' });

        expect(res.status).toBe(200);
    });

    test('400 - estado no válido', async () => {
        mockQuery.mockResolvedValueOnce(USER);

        const res = await request(app).patch('/api/recurring-expenses/1/status').set(AUTH).send({ status: 'bogus' });

        expect(res.status).toBe(400);
    });

    test('404 - no encontrado', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ affectedRows: 0 }]);

        const res = await request(app).patch('/api/recurring-expenses/999/status').set(AUTH).send({ status: 'paused' });

        expect(res.status).toBe(404);
    });
});

describe('RecurringExpenses - DELETE /api/recurring-expenses/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - elimina gasto recurrente', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app).delete('/api/recurring-expenses/1').set(AUTH);

        expect(res.status).toBe(200);
    });

    test('404 - no encontrado', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ affectedRows: 0 }]);

        const res = await request(app).delete('/api/recurring-expenses/999').set(AUTH);

        expect(res.status).toBe(404);
    });
});
