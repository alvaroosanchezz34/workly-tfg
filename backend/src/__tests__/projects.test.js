/**
 * Tests: Projects Controller
 * Cubre: GET, POST, PUT, DELETE /api/projects
 */

import { jest } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
  pool: { query: mockQuery },
}));

jest.unstable_mockModule('../utils/activityLogger.js', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: jest.fn().mockReturnValue({ id: 1, role: 'user' }),
    sign: jest.fn().mockReturnValue('mock_token'),
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');

const AUTH = { Authorization: 'Bearer mock_token' };

const PROJECT_PAYLOAD = {
  client_id: 1,
  title: 'Web corporativa',
  description: 'Landing page',
  status: 'in_progress',
  start_date: '2025-01-01',
  end_date: '2025-03-01',
  budget: 2500,
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Projects - GET /api/projects', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - devuelve proyectos del usuario', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, title: 'Web corporativa', client_name: 'Cliente A' },
    ]]);

    const res = await request(app).get('/api/projects').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('Web corporativa');
  });

  test('401 - sin autenticación', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });
});

describe('Projects - GET /api/projects/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - proyecto encontrado por ID', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1, title: 'Web corporativa' }]]);

    const res = await request(app).get('/api/projects/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test('404 - proyecto no existe', async () => {
    mockQuery.mockResolvedValueOnce([[]]); // no results

    const res = await request(app).get('/api/projects/999').set(AUTH);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no encontrado/i);
  });
});

describe('Projects - POST /api/projects', () => {
  beforeEach(() => jest.clearAllMocks());

  test('201 - proyecto creado correctamente con cliente válido', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ id: 1 }]])         // SELECT cliente válido
      .mockResolvedValueOnce([{ insertId: 10 }]);    // INSERT proyecto

    const res = await request(app)
      .post('/api/projects')
      .set(AUTH)
      .send(PROJECT_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.projectId).toBe(10);
    expect(res.body.message).toMatch(/creado/i);
  });

  test('403 - cliente no válido o no pertenece al usuario', async () => {
    mockQuery.mockResolvedValueOnce([[]]); // cliente no encontrado

    const res = await request(app)
      .post('/api/projects')
      .set(AUTH)
      .send({ ...PROJECT_PAYLOAD, client_id: 99 });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cliente no válido/i);
  });

  test('500 - error de base de datos en INSERT', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ id: 1 }]])            // cliente ok
      .mockRejectedValueOnce(new Error('DB error'));    // INSERT falla

    const res = await request(app)
      .post('/api/projects')
      .set(AUTH)
      .send(PROJECT_PAYLOAD);

    expect(res.status).toBe(500);
  });
});

describe('Projects - PUT /api/projects/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - proyecto actualizado correctamente', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .put('/api/projects/1')
      .set(AUTH)
      .send({ title: 'Actualizado', status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizado/i);
  });

  test('404 - proyecto no existe al actualizar', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .put('/api/projects/999')
      .set(AUTH)
      .send({ title: 'X' });

    expect(res.status).toBe(404);
  });
});

describe('Projects - DELETE /api/projects/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - proyecto eliminado (soft delete)', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .delete('/api/projects/1')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });

  test('404 - proyecto no encontrado al eliminar', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .delete('/api/projects/999')
      .set(AUTH);

    expect(res.status).toBe(404);
  });
});
