/**
 * Tests: Clients Controller
 * Cubre: GET, POST, PUT, DELETE /api/clients y rutas de soft-delete/restore
 */

import { jest } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
  pool: { query: mockQuery, getConnection: jest.fn() },
}));

jest.unstable_mockModule('../utils/activityLogger.js', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

// JWT mock para que el middleware authenticate funcione
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: jest.fn().mockReturnValue({ id: 1, role: 'user' }),
    sign: jest.fn().mockReturnValue('mock_token'),
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');

const AUTH_HEADER = { Authorization: 'Bearer mock_token' };
const USER = [[{ id: 1, name: 'Koke', email: 'koke@test.com', role: 'user', plan: 'pro', plan_status: 'active', company_id: null }]];


// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Clients - GET /api/clients', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - devuelve lista de clientes del usuario', async () => {
    const fakeClients = [
      { id: 1, name: 'Empresa A', email: 'a@empresa.com' },
      { id: 2, name: 'Empresa B', email: 'b@empresa.com' },
    ];
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario
    mockQuery.mockResolvedValueOnce([[{ total: 2 }]]); // COUNT
    mockQuery.mockResolvedValueOnce([fakeClients]);     // SELECT

    const res = await request(app).get('/api/clients').set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('Empresa A');
  });

  test('401 - sin token devuelve 401', async () => {
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(401);
  });
});

describe('Clients - GET /api/clients/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - cliente encontrado', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery.mockResolvedValueOnce([[{ id: 1, name: 'Empresa A' }]]);

    const res = await request(app).get('/api/clients/1').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Empresa A');
  });

  test('404 - cliente no existe', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery.mockResolvedValueOnce([[]]); // sin resultados

    const res = await request(app).get('/api/clients/999').set(AUTH_HEADER);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no encontrado/i);
  });
});

describe('Clients - POST /api/clients', () => {
  beforeEach(() => jest.clearAllMocks());

  test('201 - cliente creado correctamente', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery.mockResolvedValueOnce([{ insertId: 5 }]);

    const res = await request(app)
      .post('/api/clients')
      .set(AUTH_HEADER)
      .send({ name: 'Nuevo Cliente', email: 'nuevo@test.com', phone: '600000000' });

    expect(res.status).toBe(201);
    expect(res.body.clientId).toBe(5);
    expect(res.body.message).toMatch(/creado/i);
  });

  test('500 - error de base de datos', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/clients')
      .set(AUTH_HEADER)
      .send({ name: 'X', email: 'x@test.com' });

    expect(res.status).toBe(500);
  });
});

describe('Clients - PUT /api/clients/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - cliente actualizado', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .put('/api/clients/1')
      .set(AUTH_HEADER)
      .send({ name: 'Actualizado', email: 'act@test.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizado/i);
  });

  test('404 - cliente no encontrado al actualizar', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .put('/api/clients/999')
      .set(AUTH_HEADER)
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });
});

describe('Clients - DELETE /api/clients/:id (soft delete)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - cliente eliminado (soft delete)', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery
      .mockResolvedValueOnce([[{ n: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .delete('/api/clients/1')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });

  test('404 - cliente no encontrado al eliminar', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery
      .mockResolvedValueOnce([[{ n: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .delete('/api/clients/999')
      .set(AUTH_HEADER);

    expect(res.status).toBe(404);
  });

  test('409 - no elimina un cliente con facturas emitidas', async () => {
    mockQuery.mockResolvedValueOnce(USER);
    mockQuery.mockResolvedValueOnce([[{ n: 2 }]]);

    const res = await request(app).delete('/api/clients/1').set(AUTH_HEADER);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/emitidas/i);
  });
});

describe('Clients - GET /api/clients/deleted', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - devuelve clientes eliminados', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery.mockResolvedValueOnce([[{ id: 3, name: 'Borrado', is_deleted: 1 }]]);

    const res = await request(app).get('/api/clients/deleted').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body[0].is_deleted).toBe(1);
  });
});

describe('Clients - PUT /api/clients/:id/restore', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - cliente restaurado', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .put('/api/clients/3/restore')
      .set(AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/restaurado/i);
  });

  test('404 - no encontrado al restaurar', async () => {
    mockQuery.mockResolvedValueOnce(USER); // authenticate → usuario

    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .put('/api/clients/999/restore')
      .set(AUTH_HEADER);

    expect(res.status).toBe(404);
  });
});

describe('Clients - POST /api/clients/bulk-delete', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - elimina varios clientes', async () => {
    mockQuery
      .mockResolvedValueOnce(USER)
      .mockResolvedValueOnce([[{ n: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ n: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app).post('/api/clients/bulk-delete').set(AUTH_HEADER).send({ ids: [1, 2] });

    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(2);
  });

  test('400 - sin ids', async () => {
    mockQuery.mockResolvedValueOnce(USER);
    const res = await request(app).post('/api/clients/bulk-delete').set(AUTH_HEADER).send({ ids: [] });
    expect(res.status).toBe(400);
  });
});

describe('Clients - POST /api/clients/import', () => {
  beforeEach(() => jest.clearAllMocks());

  test('201 - importa filas válidas y omite las sin nombre', async () => {
    mockQuery
      .mockResolvedValueOnce(USER)
      .mockResolvedValueOnce([{ insertId: 1 }]); // solo la fila con nombre

    const res = await request(app).post('/api/clients/import').set(AUTH_HEADER).send({
      rows: [{ name: 'Cliente A', email: 'a@test.com' }, { name: '' }],
    });

    expect(res.status).toBe(201);
    expect(res.body.imported).toBe(1);
    expect(res.body.invalid).toBe(1);
  });

  test('400 - sin filas', async () => {
    mockQuery.mockResolvedValueOnce(USER);
    const res = await request(app).post('/api/clients/import').set(AUTH_HEADER).send({ rows: [] });
    expect(res.status).toBe(400);
  });
});