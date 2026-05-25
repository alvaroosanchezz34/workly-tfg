/**
 * Tests: TimeTracking Controller
 * Cubre: GET /api/time, GET /api/time/active, POST /api/time/start,
 *        POST /api/time/stop, PUT /api/time/:id, DELETE /api/time/:id
 */

import { jest } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery, getConnection: jest.fn() },
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        sign:   jest.fn().mockReturnValue('mock_token'),
        verify: jest.fn().mockImplementation((token, secret, cb) => {
            cb(null, { id: 1, email: 'koke@test.com', role: 'admin' });
        }),
    },
}));

// ── Imports ───────────────────────────────────────────────────────────────────
const { default: request } = await import('supertest');
const { default: app }     = await import('../app.js');

const AUTH = { Authorization: 'Bearer mock_token' };

// ── GET /api/time ─────────────────────────────────────────────────────────────
describe('TimeTracking - GET /api/time', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve entradas y totales', async () => {
        mockQuery.mockResolvedValueOnce([[
            { id: 1, description: 'Reunión cliente', elapsed: 3600, earned: 50, project_name: 'Workly' },
            { id: 2, description: 'Desarrollo API',  elapsed: 7200, earned: 100, project_name: 'Workly' },
        ]]);
        mockQuery.mockResolvedValueOnce([[
            { total_seconds: 10800, total_earned: 150 }
        ]]);

        const res = await request(app)
            .get('/api/time')
            .set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('entries');
        expect(res.body).toHaveProperty('totals');
        expect(res.body.entries).toHaveLength(2);
        expect(res.body.totals.total_seconds).toBe(10800);
    });

    test('200 - lista vacía si no hay entradas', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // entries
        mockQuery.mockResolvedValueOnce([[{ total_seconds: 0, total_earned: 0 }]]); // totals

        const res = await request(app)
            .get('/api/time')
            .set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.entries).toHaveLength(0);
    });

    test('401 - sin autenticación', async () => {
        const res = await request(app).get('/api/time');
        expect(res.status).toBe(401);
    });
});

// ── GET /api/time/active ──────────────────────────────────────────────────────
describe('TimeTracking - GET /api/time/active', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve entrada activa', async () => {
        mockQuery.mockResolvedValueOnce([[
            { id: 5, description: 'Tarea en curso', stopped_at: null, project_name: 'Workly' }
        ]]);

        const res = await request(app)
            .get('/api/time/active')
            .set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).not.toBeNull();
        expect(res.body.id).toBe(5);
    });

    test('200 - null si no hay temporizador activo', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // no hay activo

        const res = await request(app)
            .get('/api/time/active')
            .set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toBeNull();
    });
});

// ── POST /api/time/start ──────────────────────────────────────────────────────
describe('TimeTracking - POST /api/time/start', () => {
    beforeEach(() => jest.clearAllMocks());

    test('201 - inicia temporizador correctamente', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]); // parar anterior (no había)
        mockQuery.mockResolvedValueOnce([{ insertId: 10 }]);    // INSERT nuevo

        const res = await request(app)
            .post('/api/time/start')
            .set(AUTH)
            .send({
                project_id:  1,
                description: 'Implementando tests',
                hourly_rate: 50,
                billable:    1,
            });

        expect(res.status).toBe(201);
        expect(res.body.entryId).toBe(10);
    });

    test('201 - para temporizador anterior antes de crear uno nuevo', async () => {
        // Simula que había un temporizador activo que se para
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE anterior
        mockQuery.mockResolvedValueOnce([{ insertId: 11 }]);    // INSERT nuevo

        const res = await request(app)
            .post('/api/time/start')
            .set(AUTH)
            .send({ description: 'Nueva sesión' });

        expect(res.status).toBe(201);
        // Se llamó primero a UPDATE (parar anterior) y luego a INSERT
        expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    test('201 - sin project_id ni hourly_rate (campos opcionales)', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);
        mockQuery.mockResolvedValueOnce([{ insertId: 12 }]);

        const res = await request(app)
            .post('/api/time/start')
            .set(AUTH)
            .send({ description: 'Trabajo sin proyecto' });

        expect(res.status).toBe(201);
    });
});

// ── POST /api/time/stop ───────────────────────────────────────────────────────
describe('TimeTracking - POST /api/time/stop', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - para el temporizador activo', async () => {
        // Simula entrada activa
        mockQuery.mockResolvedValueOnce([[
            { id: 5, started_at: new Date(Date.now() - 3600000), stopped_at: null }
        ]]);
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE

        const res = await request(app)
            .post('/api/time/stop')
            .set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/parado|detenido|stopped/i);
    });

    test('404 - no hay temporizador activo', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // sin entrada activa

        const res = await request(app)
            .post('/api/time/stop')
            .set(AUTH);

        expect(res.status).toBe(404);
    });
});

// ── PUT /api/time/:id ─────────────────────────────────────────────────────────
describe('TimeTracking - PUT /api/time/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - actualiza descripción y rate', async () => {
        mockQuery.mockResolvedValueOnce([[{ id: 5, user_id: 1 }]]); // entrada existe
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);      // UPDATE

        const res = await request(app)
            .put('/api/time/5')
            .set(AUTH)
            .send({ description: 'Descripción corregida', hourly_rate: 60 });

        expect(res.status).toBe(200);
    });

    test('404 - entrada no pertenece al usuario', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // no encontrada

        const res = await request(app)
            .put('/api/time/999')
            .set(AUTH)
            .send({ description: 'Cambio' });

        expect(res.status).toBe(404);
    });
});

// ── DELETE /api/time/:id ──────────────────────────────────────────────────────
describe('TimeTracking - DELETE /api/time/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - entrada eliminada', async () => {
        mockQuery.mockResolvedValueOnce([[{ id: 5, user_id: 1 }]]); // existe
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);      // DELETE

        const res = await request(app)
            .delete('/api/time/5')
            .set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/eliminada/i);
    });

    test('404 - entrada no existe', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // no encontrada

        const res = await request(app)
            .delete('/api/time/999')
            .set(AUTH);

        expect(res.status).toBe(404);
    });
});
