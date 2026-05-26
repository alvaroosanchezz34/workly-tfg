/**
 * Tests: Services Controller
 * Cubre: GET/POST/PUT/DELETE /api/services
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery },
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

describe('Services - GET /api/services', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve catálogo de servicios del usuario', async () => {
        mockQuery.mockResolvedValueOnce([[
            { id: 1, name: 'Desarrollo web', default_rate: 60.00, unit: 'hora' },
            { id: 2, name: 'Diseño UI',      default_rate: 50.00, unit: 'hora' },
        ]]);

        const res = await request(app).get('/api/services').set(AUTH);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].name).toBe('Desarrollo web');
    });

    test('200 - lista vacía si no hay servicios', async () => {
        mockQuery.mockResolvedValueOnce([[]]);

        const res = await request(app).get('/api/services').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });

    test('401 - sin token', async () => {
        const res = await request(app).get('/api/services');
        expect(res.status).toBe(401);
    });
});

describe('Services - POST /api/services', () => {
    beforeEach(() => jest.clearAllMocks());

    test('201 - servicio creado correctamente', async () => {
        mockQuery.mockResolvedValueOnce([{ insertId: 7 }]);

        const res = await request(app)
            .post('/api/services').set(AUTH)
            .send({ name: 'Consultoría SEO', default_rate: 75.00, unit: 'hora' });

        expect(res.status).toBe(201);
        expect(res.body.id).toBe(7);
    });

    test('400 - nombre vacío', async () => {
        const res = await request(app)
            .post('/api/services').set(AUTH)
            .send({ default_rate: 50 });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/nombre/i);
    });

    test('201 - sin tarifa ni unidad (campos opcionales)', async () => {
        mockQuery.mockResolvedValueOnce([{ insertId: 8 }]);

        const res = await request(app)
            .post('/api/services').set(AUTH)
            .send({ name: 'Servicio sin tarifa' });

        expect(res.status).toBe(201);
    });
});

describe('Services - PUT /api/services/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - servicio actualizado', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .put('/api/services/1').set(AUTH)
            .send({ name: 'Desarrollo fullstack', default_rate: 80, unit: 'hora' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/actualizado/i);
    });

    test('400 - nombre vacío al actualizar', async () => {
        const res = await request(app)
            .put('/api/services/1').set(AUTH)
            .send({ default_rate: 80 });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/nombre/i);
    });

    test('404 - servicio no encontrado', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

        const res = await request(app)
            .put('/api/services/999').set(AUTH)
            .send({ name: 'Inexistente', default_rate: 40, unit: 'hora' });

        expect(res.status).toBe(404);
    });
});

describe('Services - DELETE /api/services/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - servicio eliminado (soft delete)', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app).delete('/api/services/1').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/eliminado/i);
    });

    test('404 - servicio no existe', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

        const res = await request(app).delete('/api/services/999').set(AUTH);

        expect(res.status).toBe(404);
    });
});