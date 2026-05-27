/**
 * Tests: ActivityLogs Controller
 * Ruta real: GET /api/activity-logs
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery, getConnection: jest.fn() },
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        sign:   jest.fn().mockReturnValue('mock_token'),
        verify: jest.fn().mockReturnValue({ id: 1, role: 'admin' }),
    },
}));

const { default: request } = await import('supertest');
const { default: app }     = await import('../app.js');

const AUTH = { Authorization: 'Bearer mock_token' };
const USER = [[{ id: 1, name: 'Koke', email: 'koke@test.com', role: 'admin', plan: 'pro', plan_status: 'active', company_id: null }]];

describe('ActivityLogs - GET /api/activity-logs', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve logs paginados', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ total: 3 }]])
            .mockResolvedValueOnce([[
                { id: 1, entity: 'invoice', action: 'created',  user_name: 'Koke', created_at: new Date() },
                { id: 2, entity: 'client',  action: 'updated',  user_name: 'Koke', created_at: new Date() },
                { id: 3, entity: 'project', action: 'deleted',  user_name: 'Koke', created_at: new Date() },
            ]]);

        const res = await request(app).get('/api/activity-logs').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(3);
        expect(res.body.pagination.total).toBe(3);
    });

    test('200 - lista vacía si no hay actividad', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ total: 0 }]])
            .mockResolvedValueOnce([[]]);

        const res = await request(app).get('/api/activity-logs').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    test('200 - filtra por entidad', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ total: 1 }]])
            .mockResolvedValueOnce([[
                { id: 1, entity: 'invoice', action: 'created', user_name: 'Koke', created_at: new Date() },
            ]]);

        const res = await request(app).get('/api/activity-logs?entity=invoice').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.data[0].entity).toBe('invoice');
    });

    test('200 - filtra por acción', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ total: 1 }]])
            .mockResolvedValueOnce([[
                { id: 3, entity: 'project', action: 'deleted', user_name: 'Koke', created_at: new Date() },
            ]]);

        const res = await request(app).get('/api/activity-logs?action=deleted').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.data[0].action).toBe('deleted');
    });

    test('401 - sin token', async () => {
        const res = await request(app).get('/api/activity-logs');
        expect(res.status).toBe(401);
    });
});