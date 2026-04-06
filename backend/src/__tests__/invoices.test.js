/**
 * Tests: Invoices Controller
 * Cubre: GET, POST, PUT, DELETE /api/invoices
 * Nota: createInvoice usa pool.getConnection() con transacciones
 */

import { jest } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockQuery = jest.fn();
const mockConnection = {
  beginTransaction: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
  release: jest.fn(),
};

jest.unstable_mockModule('../config/db.js', () => ({
  pool: {
    query: mockQuery,
    getConnection: jest.fn().mockResolvedValue(mockConnection),
  },
}));

jest.unstable_mockModule('../utils/activityLogger.js', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../services/pdf.service.js', () => ({
  generateInvoicePDF: jest.fn(),
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

const INVOICE_PAYLOAD = {
  client_id: 1,
  project_id: null,
  issue_date: '2025-01-01',
  due_date: '2025-02-01',
  status: 'draft',
  notes: 'Test',
  items: [
    { description: 'Diseño web', quantity: 1, unit_price: 1500 },
    { description: 'Hosting', quantity: 12, unit_price: 10 },
  ],
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Invoices - POST /api/invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection.query.mockReset();
  });

  test('201 - factura creada correctamente', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ id: 1 }]])        // SELECT cliente válido
      .mockResolvedValueOnce([{ insertId: 7 }])    // INSERT factura
      .mockResolvedValueOnce([{}])                 // INSERT item 1
      .mockResolvedValueOnce([{}])                 // INSERT item 2
      .mockResolvedValueOnce([{}]);                // UPDATE total

    const res = await request(app)
      .post('/api/invoices')
      .set(AUTH)
      .send(INVOICE_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.invoiceId).toBe(7);
    expect(res.body.total).toBe(1500 + 12 * 10); // 1620
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  test('400 - sin items en la factura', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set(AUTH)
      .send({ ...INVOICE_PAYLOAD, items: [] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/al menos una línea/i);
    expect(mockConnection.rollback).toHaveBeenCalled();
  });

  test('400 - item con cantidad 0 o negativa', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .set(AUTH)
      .send({
        ...INVOICE_PAYLOAD,
        items: [{ description: 'X', quantity: 0, unit_price: 100 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/valores inválidos/i);
  });

  test('400 - cliente no válido', async () => {
    mockConnection.query.mockResolvedValueOnce([[]]); // cliente no encontrado

    const res = await request(app)
      .post('/api/invoices')
      .set(AUTH)
      .send({ ...INVOICE_PAYLOAD, client_id: 99 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cliente no válido/i);
  });

  test('401 - sin autenticación', async () => {
    const res = await request(app).post('/api/invoices').send(INVOICE_PAYLOAD);
    expect(res.status).toBe(401);
  });
});

describe('Invoices - GET /api/invoices', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - devuelve lista de facturas', async () => {
    mockQuery
      .mockResolvedValueOnce([{}]) // UPDATE overdue
      .mockResolvedValueOnce([[
        { id: 1, invoice_number: 'INV-001', client_name: 'Empresa A', total_amount: 1620 },
      ]]);

    const res = await request(app).get('/api/invoices').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body[0].invoice_number).toBe('INV-001');
  });

  test('401 - sin token', async () => {
    const res = await request(app).get('/api/invoices');
    expect(res.status).toBe(401);
  });
});

describe('Invoices - GET /api/invoices/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - factura con items', async () => {
    mockQuery
      .mockResolvedValueOnce([[{ id: 1, invoice_number: 'INV-001', client_name: 'X' }]])
      .mockResolvedValueOnce([[{ id: 1, description: 'Diseño' }]]);

    const res = await request(app).get('/api/invoices/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  test('404 - factura no encontrada', async () => {
    mockQuery.mockResolvedValueOnce([[undefined]]); // no invoice

    const res = await request(app).get('/api/invoices/999').set(AUTH);
    expect(res.status).toBe(404);
  });
});

describe('Invoices - DELETE /api/invoices/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection.query.mockReset();
  });

  test('200 - factura eliminada (soft delete)', async () => {
    mockConnection.query
      .mockResolvedValueOnce([[{ status: 'draft' }]]) // SELECT factura
      .mockResolvedValueOnce([{}])                    // UPDATE is_deleted factura
      .mockResolvedValueOnce([{}]);                   // UPDATE is_deleted items

    const res = await request(app).delete('/api/invoices/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  test('404 - factura no encontrada al eliminar', async () => {
    mockConnection.query.mockResolvedValueOnce([[undefined]]);

    const res = await request(app).delete('/api/invoices/999').set(AUTH);
    expect(res.status).toBe(404);
  });

  test('400 - no se puede eliminar una factura pagada', async () => {
    mockConnection.query.mockResolvedValueOnce([[{ status: 'paid' }]]);

    const res = await request(app).delete('/api/invoices/1').set(AUTH);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/pagada/i);
  });
});
