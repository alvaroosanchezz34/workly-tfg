/**
 * Tests: Auth Controller
 * Cubre: POST /api/auth/register, /api/auth/login, /api/auth/refresh
 */

import { jest } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock pool ANTES de que cualquier módulo lo importe
const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
  pool: { query: mockQuery, getConnection: jest.fn() },
}));

// Mock bcrypt - capture refs so we can control them per-test
const mockBcryptHash    = jest.fn().mockResolvedValue('hashed_password');
const mockBcryptCompare = jest.fn();
jest.unstable_mockModule('bcrypt', () => ({
  default: {
    hash:    mockBcryptHash,
    compare: mockBcryptCompare,
  },
}));

// Mock jsonwebtoken
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn().mockReturnValue('mock_token'),
    verify: jest.fn(),
  },
}));

// ── Imports (después de mocks) ────────────────────────────────────────────────
const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
// bcrypt controlled via mockBcryptCompare / mockBcryptHash refs

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Auth - POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('201 - registro correcto', async () => {
    mockQuery
      .mockResolvedValueOnce([[]])          // SELECT email → no existe
      .mockResolvedValueOnce([{ insertId: 1 }]); // INSERT user

    const res = await request(app).post('/api/auth/register').send({
      name: 'Koke',
      email: 'koke@test.com',
      password: 'segura123',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Usuario registrado correctamente');
    expect(res.body.userId).toBe(1);
  });

  test('400 - faltan campos obligatorios', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'koke@test.com',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/obligatorios/i);
  });

  test('400 - contraseña demasiado corta', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Koke',
      email: 'koke@test.com',
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/6 caracteres/i);
  });

  test('400 - email con formato inválido', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Koke',
      email: 'no-es-un-email',
      password: 'segura123',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email no válido/i);
  });

  test('400 - email ya registrado', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1 }]]); // email ya existe

    const res = await request(app).post('/api/auth/register').send({
      name: 'Koke',
      email: 'koke@test.com',
      password: 'segura123',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ya registrado/i);
  });
});

describe('Auth - POST /api/auth/login', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    // jwt.sign is set via jest.unstable_mockModule with mockReturnValue - persists across tests
    // No need to re-setup here
  });

  test('200 - login correcto devuelve tokens y usuario', async () => {
    // Set bcrypt mock before anything else
    mockBcryptCompare.mockResolvedValue(true);

    const fakeUser = {
      id: 1,
      name: 'Koke',
      email: 'koke@test.com',
      password: 'hashed',
      role: 'user',
      status: 'active',
      company_name: 'sanchezdevelop',
      avatar_url: null,
    };

    mockQuery
      .mockResolvedValueOnce([[fakeUser]])   // SELECT user
      .mockResolvedValueOnce([{}]);           // UPDATE last_login

    const res = await request(app).post('/api/auth/login').send({
      email: 'koke@test.com',
      password: 'segura123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('koke@test.com');
    expect(res.body.user.role).toBe('user');
  });

  test('400 - faltan email o contraseña', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'koke@test.com' });
    expect(res.status).toBe(400);
  });

  test('401 - usuario no existe', async () => {
    mockQuery.mockResolvedValueOnce([[]]); // no hay user

    const res = await request(app).post('/api/auth/login').send({
      email: 'noexiste@test.com',
      password: 'segura123',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/credenciales incorrectas/i);
  });

  test('403 - cuenta suspendida', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'suspended', password: 'x' }]]);

    const res = await request(app).post('/api/auth/login').send({
      email: 'koke@test.com',
      password: 'segura123',
    });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspendida/i);
  });

  test('401 - contraseña incorrecta', async () => {
    mockBcryptCompare.mockResolvedValue(false);

    mockQuery.mockResolvedValueOnce([[{
      id: 1, status: 'active', password: 'hashed', role: 'user',
    }]]);

    const res = await request(app).post('/api/auth/login').send({
      email: 'koke@test.com',
      password: 'mala',
    });
    expect(res.status).toBe(401);
  });
});

// Los tests de POST /api/auth/refresh están en auth.refresh.test.js
// (necesitan jwt sin mock para generar tokens válidos)