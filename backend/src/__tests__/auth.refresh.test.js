/**
 * Tests: Auth - Refresh Token
 * Separado para poder usar jwt real (sin mock) en la generación del token válido
 */

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Solo mockeamos la DB
const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
  pool: { query: mockQuery, getConnection: jest.fn() },
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');

describe('Auth - POST /api/auth/refresh', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - refresh token válido devuelve nuevo accessToken', async () => {
    // Usamos jwt real para crear un token firmado con la misma secret que el controller
    // En tests, JWT_REFRESH_SECRET no está definida → undefined, igual en ambos lados
    const secret = process.env.JWT_REFRESH_SECRET || 'test_secret';
    const validToken = jwt.sign({ id: 1, role: 'user' }, secret, { expiresIn: '7d' });

    // Aseguramos que el controller use la misma secret
    process.env.JWT_REFRESH_SECRET = secret;
    process.env.JWT_SECRET = 'access_secret';

    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: validToken,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
  });

  test('401 - sin refreshToken en body devuelve 401', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/requerido/i);
  });

  test('403 - refreshToken con firma inválida devuelve 403', async () => {
    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: 'esto.no.es.un.jwt.válido',
    });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/inválido/i);
  });
});
