/**
 * Tests: ActivityLogs Controller
 * Cubre: GET /api/activity
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery },
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

describe('ActivityLogs - GET /api/activity', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve logs paginados', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ total: 3 }]])
            .mockResolvedValueOnce([[
                { id: 1, entity: 'invoice', action: 'created',  user_name: 'Koke', created_at: new Date() },
                { id: 2, entity: 'client',  action: 'updated',  user_name: 'Koke', created_at: new Date() },
                { id: 3, entity: 'project', action: 'deleted',  user_name: 'Koke', created_at: new Date() },
            ]]);

        const res = await request(app).get('/api/activity').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(3);
        expect(res.body.pagination.total).toBe(3);
    });

    test('200 - lista vacía si no hay actividad', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ total: 0 }]])
            .mockResolvedValueOnce([[]]);

        const res = await request(app).get('/api/activity').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(0);
    });

    test('200 - filtra por entidad', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ total: 1 }]])
            .mockResolvedValueOnce([[
                { id: 1, entity: 'invoice', action: 'created', user_name: 'Koke', created_at: new Date() },
            ]]);

        const res = await request(app)
            .get('/api/activity?entity=invoice')
            .set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.data[0].entity).toBe('invoice');
    });

    test('200 - filtra por acción', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ total: 1 }]])
            .mockResolvedValueOnce([[
                { id: 3, entity: 'project', action: 'deleted', user_name: 'Koke', created_at: new Date() },
            ]]);

        const res = await request(app)
            .get('/api/activity?action=deleted')
            .set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.data[0].action).toBe('deleted');
    });

    test('401 - sin token', async () => {
        const res = await request(app).get('/api/activity');
        expect(res.status).toBe(401);
    });
});