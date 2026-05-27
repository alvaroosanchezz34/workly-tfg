/**
 * Tests: Tasks Controller
 * Cubre: GET/POST/PUT/DELETE /api/projects/:projectId/tasks
 *        PATCH /api/projects/:projectId/tasks/:taskId/move
 *
 * NOTA: El middleware authenticate hace una query a users antes de cada
 * petición autenticada. Se mockea como primera llamada en cada test.
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
const PID  = '10';

// El middleware authenticate hace: SELECT id,name,email,role,plan,plan_status,company_id FROM users WHERE id=?
// → devuelve el usuario mockeado. Es la PRIMERA query de cualquier ruta protegida.
const USER = [[{ id: 1, name: 'Koke', email: 'koke@test.com', role: 'user', plan: 'pro', plan_status: 'active', company_id: null }]];

describe('Tasks - GET /api/projects/:id/tasks', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve lista de tareas del proyecto', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)           // authenticate → usuario
            .mockResolvedValueOnce([[{ id: 10 }]]) // proyecto existe
            .mockResolvedValueOnce([[              // listado de tareas
                { id: 1, title: 'Diseñar UI',  status: 'todo',        priority: 'high',   position: 0, assigned_name: null },
                { id: 2, title: 'Backend API', status: 'in_progress', priority: 'medium', position: 0, assigned_name: null },
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
        mockQuery
            .mockResolvedValueOnce(USER)  // authenticate
            .mockResolvedValueOnce([[]]); // proyecto no encontrado

        const res = await request(app).get(`/api/projects/999/tasks`).set(AUTH);
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/no encontrado/i);
    });
});

describe('Tasks - POST /api/projects/:id/tasks', () => {
    beforeEach(() => jest.clearAllMocks());

    test('201 - tarea creada correctamente', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)            // authenticate
            .mockResolvedValueOnce([[{ id: 10 }]])  // proyecto existe
            .mockResolvedValueOnce([[{ maxPos: 2 }]]) // posición
            .mockResolvedValueOnce([{ insertId: 42 }]); // INSERT

        const res = await request(app)
            .post(`/api/projects/${PID}/tasks`).set(AUTH)
            .send({ title: 'Nueva tarea', priority: 'high', status: 'todo' });

        expect(res.status).toBe(201);
        expect(res.body.taskId).toBe(42);
    });

    test('400 - título vacío', async () => {
        mockQuery.mockResolvedValueOnce(USER); // authenticate

        const res = await request(app)
            .post(`/api/projects/${PID}/tasks`).set(AUTH)
            .send({ title: '   ', priority: 'medium' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/título/i);
    });

    test('201 - usa valores por defecto (status=todo, priority=medium)', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
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
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]); // proyecto no existe

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
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 1 }]])       // tarea existe
            .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE

        const res = await request(app)
            .put(`/api/projects/${PID}/tasks/1`).set(AUTH)
            .send({ title: 'Título actualizado', priority: 'urgent' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/actualizada/i);
    });

    test('404 - tarea no encontrada', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]); // no existe

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
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 1 }]])       // existe
            .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE

        const res = await request(app).delete(`/api/projects/${PID}/tasks/1`).set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/eliminada/i);
    });

    test('404 - tarea no existe', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]); // no encontrada

        const res = await request(app).delete(`/api/projects/${PID}/tasks/999`).set(AUTH);

        expect(res.status).toBe(404);
    });
});

describe('Tasks - PATCH /api/projects/:id/tasks/:taskId/move', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - tarea movida a otra columna', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 1 }]])       // existe
            .mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE

        const res = await request(app)
            .patch(`/api/projects/${PID}/tasks/1/move`).set(AUTH)
            .send({ status: 'in_progress', position: 2 });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/movida/i);
    });

    test('200 - position 0 por defecto si no se envía', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .patch(`/api/projects/${PID}/tasks/1/move`).set(AUTH)
            .send({ status: 'done' });

        expect(res.status).toBe(200);
    });

    test('404 - tarea no existe al mover', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[]]); // no encontrada

        const res = await request(app)
            .patch(`/api/projects/${PID}/tasks/999/move`).set(AUTH)
            .send({ status: 'done', position: 0 });

        expect(res.status).toBe(404);
    });
});