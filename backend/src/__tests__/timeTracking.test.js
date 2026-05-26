/**
 * Tests: Tasks Controller
 * Cubre: GET/POST/PUT/DELETE /api/projects/:projectId/tasks
 *        PATCH /api/projects/:projectId/tasks/:taskId/move
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery },
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
const PID  = '10';

describe('Tasks - GET /api/projects/:id/tasks', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve lista de tareas del proyecto', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 10 }]])
            .mockResolvedValueOnce([[
                { id: 1, title: 'Diseñar UI',  status: 'todo',        priority: 'high',   position: 0 },
                { id: 2, title: 'Backend API', status: 'in_progress', priority: 'medium', position: 0 },
            ]]);
        const res = await request(app).get(`/api/projects/${PID}/tasks`).set(AUTH);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].title).toBe('Diseñar UI');
    });

    test('401 - sin token', async () => {
        const res = await request(app).get(`/api/projects/${PID}/tasks`);
        expect(res.status).toBe(401);
    });

    test('404 - proyecto no pertenece al usuario', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // proyecto no encontrado
        const res = await request(app).get(`/api/projects/999/tasks`).set(AUTH);
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/no encontrado/i);
    });
});

describe('Tasks - POST /api/projects/:id/tasks', () => {
    beforeEach(() => jest.clearAllMocks());

    test('201 - tarea creada correctamente', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 10 }]])
            .mockResolvedValueOnce([[{ maxPos: 2 }]])
            .mockResolvedValueOnce([{ insertId: 42 }]);
        const res = await request(app)
            .post(`/api/projects/${PID}/tasks`).set(AUTH)
            .send({ title: 'Nueva tarea', priority: 'high', status: 'todo' });
        expect(res.status).toBe(201);
        expect(res.body.taskId).toBe(42);
    });

    test('400 - título vacío', async () => {
        const res = await request(app)
            .post(`/api/projects/${PID}/tasks`).set(AUTH)
            .send({ title: '   ', priority: 'medium' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/título/i);
    });

    test('201 - usa valores por defecto (status=todo, priority=medium)', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 10 }]])
            .mockResolvedValueOnce([[{ maxPos: 0 }]])
            .mockResolvedValueOnce([{ insertId: 5 }]);
        const res = await request(app)
            .post(`/api/projects/${PID}/tasks`).set(AUTH)
            .send({ title: 'Tarea mínima' });
        expect(res.status).toBe(201);
        expect(res.body.taskId).toBe(5);
    });

    test('404 - proyecto no encontrado al crear', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // proyecto no existe
        const res = await request(app)
            .post(`/api/projects/${PID}/tasks`).set(AUTH)
            .send({ title: 'Tarea', priority: 'low' });
        expect(res.status).toBe(404);
    });
});

describe('Tasks - PUT /api/projects/:id/tasks/:taskId', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - tarea actualizada', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);
        const res = await request(app)
            .put(`/api/projects/${PID}/tasks/1`).set(AUTH)
            .send({ title: 'Título actualizado', priority: 'urgent' });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/actualizada/i);
    });

    test('404 - tarea no encontrada', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // no existe
        const res = await request(app)
            .put(`/api/projects/${PID}/tasks/999`).set(AUTH)
            .send({ title: 'Cambio' });
        expect(res.status).toBe(404);
    });

    test('401 - sin autenticación', async () => {
        const res = await request(app)
            .put(`/api/projects/${PID}/tasks/1`)
            .send({ title: 'Sin token' });
        expect(res.status).toBe(401);
    });
});

describe('Tasks - DELETE /api/projects/:id/tasks/:taskId', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - tarea eliminada', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);
        const res = await request(app).delete(`/api/projects/${PID}/tasks/1`).set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/eliminada/i);
    });

    test('404 - tarea no existe', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // no encontrada
        const res = await request(app).delete(`/api/projects/${PID}/tasks/999`).set(AUTH);
        expect(res.status).toBe(404);
    });
});

describe('Tasks - PATCH /api/projects/:id/tasks/:taskId/move', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - tarea movida a otra columna', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);
        const res = await request(app)
            .patch(`/api/projects/${PID}/tasks/1/move`).set(AUTH)
            .send({ status: 'in_progress', position: 2 });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/movida/i);
    });

    test('200 - position 0 por defecto si no se envía', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);
        const res = await request(app)
            .patch(`/api/projects/${PID}/tasks/1/move`).set(AUTH)
            .send({ status: 'done' });
        expect(res.status).toBe(200);
    });

    test('404 - tarea no existe al mover', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // no encontrada
        const res = await request(app)
            .patch(`/api/projects/${PID}/tasks/999/move`).set(AUTH)
            .send({ status: 'done', position: 0 });
        expect(res.status).toBe(404);
    });
});