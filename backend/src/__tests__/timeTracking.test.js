/**
 * Tests: TimeTracking Controller
 * Rutas reales:
 *   GET    /api/time
 *   GET    /api/time/active
 *   POST   /api/time/start
 *   PATCH  /api/time/:id/stop   (NO POST /api/time/stop)
 *   DELETE /api/time/:id
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

describe('TimeTracking - GET /api/time', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve entradas y totales', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[
                { id: 1, description: 'Reunión cliente', elapsed: 3600, earned: 50,  project_name: 'Workly' },
                { id: 2, description: 'Desarrollo API',  elapsed: 7200, earned: 100, project_name: 'Workly' },
            ]])
            .mockResolvedValueOnce([[{ total_seconds: 10800, total_earned: 150 }]]);

        const res = await request(app).get('/api/time').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('entries');
        expect(res.body).toHaveProperty('totals');
        expect(res.body.entries).toHaveLength(2);
    });

    test('200 - lista vacía si no hay entradas', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([[{ total_seconds: 0, total_earned: 0 }]]);

        const res = await request(app).get('/api/time').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.entries).toHaveLength(0);
    });

    test('401 - sin autenticación', async () => {
        const res = await request(app).get('/api/time');
        expect(res.status).toBe(401);
    });
});

describe('TimeTracking - GET /api/time/active', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve entrada activa', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 5, description: 'Tarea en curso', stopped_at: null, project_name: 'Workly' }]]);

        const res = await request(app).get('/api/time/active').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(5);
    });

    test('200 - null si no hay temporizador activo', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]); // sin entrada activa

        const res = await request(app).get('/api/time/active').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toBeNull();
    });
});

describe('TimeTracking - POST /api/time/start', () => {
    beforeEach(() => jest.clearAllMocks());

    test('201 - inicia temporizador correctamente', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)                              // authenticate
            .mockResolvedValueOnce([{ affectedRows: 0 }])            // UPDATE parar anterior
            .mockResolvedValueOnce([{ insertId: 10 }])               // INSERT nuevo
            .mockResolvedValueOnce([[{ id: 10, description: 'Implementando tests', started_at: new Date(), stopped_at: null, project_name: null }]]); // SELECT entry

        const res = await request(app)
            .post('/api/time/start').set(AUTH)
            .send({ description: 'Implementando tests', hourly_rate: 50, billable: 1 });

        expect(res.status).toBe(201);
        expect(res.body.id).toBe(10);
    });

    test('201 - sin project_id ni hourly_rate (campos opcionales)', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([{ affectedRows: 0 }])
            .mockResolvedValueOnce([{ insertId: 12 }])
            .mockResolvedValueOnce([[{ id: 12, description: null, started_at: new Date(), stopped_at: null }]]);

        const res = await request(app)
            .post('/api/time/start').set(AUTH)
            .send({ description: 'Trabajo sin proyecto' });

        expect(res.status).toBe(201);
    });
});

describe('TimeTracking - PATCH /api/time/:id/stop', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - para el temporizador activo', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 5, started_at: new Date(Date.now()-3600000), stopped_at: null, hourly_rate: 50, duration: 3600 }]]) // SELECT entry
            .mockResolvedValueOnce([{ affectedRows: 1 }])    // UPDATE stopped_at
            .mockResolvedValueOnce([[{ id: 5, duration: 3600, earned: 50, project_name: null }]]); // SELECT updated

        const res = await request(app).patch('/api/time/5/stop').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toBeTruthy(); // returns updated entry object
    });

    test('404 - entrada no existe', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]); // entry not found → 404

        const res = await request(app).patch('/api/time/999/stop').set(AUTH);

        expect(res.status).toBe(404);
    });
});

describe('TimeTracking - DELETE /api/time/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - entrada eliminada', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 5, user_id: 1 }]]) // existe
            .mockResolvedValueOnce([{ affectedRows: 1 }]);     // DELETE

        const res = await request(app).delete('/api/time/5').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/eliminad/i);
    });

    test('404 - entrada no existe', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]); // no encontrada

        const res = await request(app).delete('/api/time/999').set(AUTH);

        expect(res.status).toBe(404);
    });
});