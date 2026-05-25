/**
 * Tests: Tasks Controller
 * Cubre: GET/POST/PUT/DELETE/PATCH /api/projects/:projectId/tasks
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
const PROJECT_ID = '10';

// Helper: simula que el proyecto pertenece al usuario
const mockProjectOwned = () =>
    mockQuery.mockResolvedValueOnce([[{ id: 10 }]]);

// ── GET /api/projects/:projectId/tasks ────────────────────────────────────────
describe('Tasks - GET /api/projects/:projectId/tasks', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve lista de tareas', async () => {
        mockProjectOwned();
        mockQuery.mockResolvedValueOnce([[
            { id: 1, title: 'Diseñar UI', status: 'todo', priority: 'high', position: 0, assigned_name: null },
            { id: 2, title: 'Backend API', status: 'in_progress', priority: 'medium', position: 0, assigned_name: null },
        ]]);

        const res = await request(app)
            .get(`/api/projects/${PROJECT_ID}/tasks`)
            .set(AUTH);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].title).toBe('Diseñar UI');
    });

    test('404 - proyecto no encontrado', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // proyecto no existe

        const res = await request(app)
            .get(`/api/projects/999/tasks`)
            .set(AUTH);

        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/no encontrado/i);
    });

    test('401 - sin token', async () => {
        const res = await request(app).get(`/api/projects/${PROJECT_ID}/tasks`);
        expect(res.status).toBe(401);
    });
});

// ── POST /api/projects/:projectId/tasks ───────────────────────────────────────
describe('Tasks - POST /api/projects/:projectId/tasks', () => {
    beforeEach(() => jest.clearAllMocks());

    test('201 - tarea creada correctamente', async () => {
        mockProjectOwned();
        mockQuery.mockResolvedValueOnce([[{ maxPos: 2 }]]); // posición actual
        mockQuery.mockResolvedValueOnce([{ insertId: 42 }]); // INSERT

        const res = await request(app)
            .post(`/api/projects/${PROJECT_ID}/tasks`)
            .set(AUTH)
            .send({ title: 'Nueva tarea', priority: 'high', status: 'todo' });

        expect(res.status).toBe(201);
        expect(res.body.taskId).toBe(42);
    });

    test('400 - título vacío', async () => {
        const res = await request(app)
            .post(`/api/projects/${PROJECT_ID}/tasks`)
            .set(AUTH)
            .send({ title: '   ', priority: 'medium' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/título/i);
    });

    test('201 - usa valores por defecto (status=todo, priority=medium)', async () => {
        mockProjectOwned();
        mockQuery.mockResolvedValueOnce([[{ maxPos: 0 }]]);
        mockQuery.mockResolvedValueOnce([{ insertId: 5 }]);

        const res = await request(app)
            .post(`/api/projects/${PROJECT_ID}/tasks`)
            .set(AUTH)
            .send({ title: 'Tarea mínima' });

        expect(res.status).toBe(201);
        expect(res.body.taskId).toBe(5);
    });

    test('404 - proyecto no pertenece al usuario', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // proyecto no encontrado

        const res = await request(app)
            .post(`/api/projects/${PROJECT_ID}/tasks`)
            .set(AUTH)
            .send({ title: 'Tarea', priority: 'low' });

        expect(res.status).toBe(404);
    });
});

// ── PUT /api/projects/:projectId/tasks/:taskId ────────────────────────────────
describe('Tasks - PUT /api/projects/:projectId/tasks/:taskId', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - tarea actualizada', async () => {
        mockQuery.mockResolvedValueOnce([[{ id: 1 }]]); // tarea existe
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE

        const res = await request(app)
            .put(`/api/projects/${PROJECT_ID}/tasks/1`)
            .set(AUTH)
            .send({ title: 'Título actualizado', priority: 'urgent' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/actualizada/i);
    });

    test('404 - tarea no encontrada', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // tarea no existe

        const res = await request(app)
            .put(`/api/projects/${PROJECT_ID}/tasks/999`)
            .set(AUTH)
            .send({ title: 'Cambio' });

        expect(res.status).toBe(404);
    });
});

// ── DELETE /api/projects/:projectId/tasks/:taskId ─────────────────────────────
describe('Tasks - DELETE /api/projects/:projectId/tasks/:taskId', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - tarea eliminada', async () => {
        mockQuery.mockResolvedValueOnce([[{ id: 1 }]]); // tarea existe
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE

        const res = await request(app)
            .delete(`/api/projects/${PROJECT_ID}/tasks/1`)
            .set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/eliminada/i);
    });

    test('404 - tarea no existe', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // tarea no encontrada

        const res = await request(app)
            .delete(`/api/projects/${PROJECT_ID}/tasks/999`)
            .set(AUTH);

        expect(res.status).toBe(404);
    });
});

// ── PATCH /api/projects/:projectId/tasks/:taskId/move ─────────────────────────
describe('Tasks - PATCH /api/projects/:projectId/tasks/:taskId/move', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - tarea movida a otra columna', async () => {
        mockQuery.mockResolvedValueOnce([[{ id: 1 }]]); // tarea existe
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE

        const res = await request(app)
            .patch(`/api/projects/${PROJECT_ID}/tasks/1/move`)
            .set(AUTH)
            .send({ status: 'in_progress', position: 2 });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/movida/i);
    });

    test('200 - position 0 por defecto si no se envía', async () => {
        mockQuery.mockResolvedValueOnce([[{ id: 1 }]]);
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .patch(`/api/projects/${PROJECT_ID}/tasks/1/move`)
            .set(AUTH)
            .send({ status: 'done' });

        expect(res.status).toBe(200);
    });

    test('404 - tarea no existe al mover', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // no encontrada

        const res = await request(app)
            .patch(`/api/projects/${PROJECT_ID}/tasks/999/move`)
            .set(AUTH)
            .send({ status: 'done', position: 0 });

        expect(res.status).toBe(404);
    });
});
