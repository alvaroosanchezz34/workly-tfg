/**
 * Tests: Notifications Controller
 * Cubre: GET /api/notifications, PATCH /:id/read, PATCH /read-all
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
    pool: {
        query:         mockQuery,
        getConnection: jest.fn().mockResolvedValue(mockConnection),
    },
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

describe('Notifications - GET /api/notifications', () => {
    beforeEach(() => { jest.clearAllMocks(); mockConnection.query.mockReset(); });

    test('200 - sin notificaciones vivas, limpia y devuelve lista vacía', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)   // authenticate
            .mockResolvedValueOnce([[]])   // overdueInvoices
            .mockResolvedValueOnce([[]])   // dueSoonInvoices
            .mockResolvedValueOnce([[]])   // overdueProjects
            .mockResolvedValueOnce([[]]);  // SELECT final

        mockConnection.query
            .mockResolvedValueOnce([{}])   // delete stale invoice/overdue
            .mockResolvedValueOnce([{}])   // delete stale invoice/warning
            .mockResolvedValueOnce([{}]);  // delete stale project/overdue

        const res = await request(app).get('/api/notifications').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
        expect(mockConnection.commit).toHaveBeenCalled();
    });

    test('200 - genera notificación para factura vencida', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 5, invoice_number: 'FAC-2026-0005', client_name: 'Cliente X' }]])
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([[
                { id: 1, type: 'overdue', entity_type: 'invoice', entity_id: 5, title: 'Factura vencida', body: 'FAC-2026-0005 — Cliente X', link: '/invoices', is_read: 0, created_at: new Date() },
            ]]);

        mockConnection.query
            .mockResolvedValueOnce([{}]) // delete stale invoice/overdue
            .mockResolvedValueOnce([{}]) // delete stale invoice/warning
            .mockResolvedValueOnce([{}]) // delete stale project/overdue
            .mockResolvedValueOnce([{}]); // insert candidate

        const res = await request(app).get('/api/notifications').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].title).toBe('Factura vencida');
    });

    test('401 - sin token', async () => {
        const res = await request(app).get('/api/notifications');
        expect(res.status).toBe(401);
    });
});

describe('Notifications - PATCH /api/notifications/:id/read', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - marca como leída', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app).patch('/api/notifications/1/read').set(AUTH);

        expect(res.status).toBe(200);
    });

    test('404 - no encontrada', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ affectedRows: 0 }]);

        const res = await request(app).patch('/api/notifications/999/read').set(AUTH);

        expect(res.status).toBe(404);
    });
});

describe('Notifications - PATCH /api/notifications/read-all', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - marca todas como leídas', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ affectedRows: 3 }]);

        const res = await request(app).patch('/api/notifications/read-all').set(AUTH);

        expect(res.status).toBe(200);
    });
});
