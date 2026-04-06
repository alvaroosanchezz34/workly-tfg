/**
 * Tests: Expenses Controller
 * Cubre: GET, POST, PUT, DELETE /api/expenses
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

const EXPENSE_PAYLOAD = {
  category: 'software',
  description: 'Licencia VSCode',
  amount: 99.99,
  date: '2025-01-15',
  receipt_url: null,
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Expenses - GET /api/expenses', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - devuelve gastos del usuario', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, category: 'software', amount: 99.99 },
    ]]);

    const res = await request(app).get('/api/expenses').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body[0].category).toBe('software');
  });

  test('401 - sin token devuelve 401', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(401);
  });
});

describe('Expenses - GET /api/expenses/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - gasto encontrado por ID', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1, description: 'Licencia VSCode' }]]);

    const res = await request(app).get('/api/expenses/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Licencia VSCode');
  });

  test('404 - gasto no encontrado', async () => {
    mockQuery.mockResolvedValueOnce([[]]); // empty

    const res = await request(app).get('/api/expenses/999').set(AUTH);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no encontrado/i);
  });
});

describe('Expenses - POST /api/expenses', () => {
  beforeEach(() => jest.clearAllMocks());

  test('201 - gasto creado correctamente', async () => {
    mockQuery.mockResolvedValueOnce([{ insertId: 3 }]);

    const res = await request(app)
      .post('/api/expenses')
      .set(AUTH)
      .send(EXPENSE_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.expenseId).toBe(3);
    expect(res.body.message).toMatch(/creado/i);
  });

  test('500 - error de DB al crear', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/expenses')
      .set(AUTH)
      .send(EXPENSE_PAYLOAD);

    expect(res.status).toBe(500);
  });
});

describe('Expenses - PUT /api/expenses/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - gasto actualizado correctamente', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .put('/api/expenses/1')
      .set(AUTH)
      .send({ ...EXPENSE_PAYLOAD, amount: 120 });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizado/i);
  });

  test('404 - gasto no existe al actualizar', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .put('/api/expenses/999')
      .set(AUTH)
      .send({ amount: 50 });

    expect(res.status).toBe(404);
  });
});

describe('Expenses - DELETE /api/expenses/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - gasto eliminado (soft delete)', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app)
      .delete('/api/expenses/1')
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });

  test('404 - gasto no encontrado al eliminar', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const res = await request(app)
      .delete('/api/expenses/999')
      .set(AUTH);

    expect(res.status).toBe(404);
  });
});
