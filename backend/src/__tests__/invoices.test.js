/**
 * Tests: Invoices Controller (ERP version)
 * Cubre: CRUD + IVA + pagos parciales + cambio de estado + configuración numeración
 */

import { jest } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────
const mockQuery = jest.fn();
const mockConnection = {
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    query:            jest.fn(),
    commit:           jest.fn().mockResolvedValue(undefined),
    rollback:         jest.fn().mockResolvedValue(undefined),
    release:          jest.fn(),
};

jest.unstable_mockModule('../config/db.js', () => ({
    pool: {
        query:         mockQuery,
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
        sign:   jest.fn().mockReturnValue('mock_token'),
    },
}));

// ── Imports ───────────────────────────────────────────────
const { default: request } = await import('supertest');
const { default: app }     = await import('../app.js');

const AUTH = { Authorization: 'Bearer mock_token' };

const ITEM_WITH_IVA = { description: 'Desarrollo web', quantity: 1, unit_price: 1000, tax_rate: 21 };
const INVOICE_PAYLOAD = {
    client_id:  1,
    project_id: null,
    issue_date: '2025-01-01',
    due_date:   '2025-02-01',
    status:     'draft',
    notes:      'Test ERP',
    items:      [ITEM_WITH_IVA],
};

// ── CRUD BASE ─────────────────────────────────────────────
describe('Invoices - POST /api/invoices (con IVA)', () => {
    beforeEach(() => { jest.clearAllMocks(); mockConnection.query.mockReset(); });

    test('201 - factura creada con IVA correcto', async () => {
        mockConnection.query
            .mockResolvedValueOnce([[{ id: 1, next_number: 1, prefix: 'FAC', padding: 4, current_year: 2025, reset_yearly: 1 }]]) // invoice_settings
            .mockResolvedValueOnce([[{ id: 1 }]])    // cliente válido
            .mockResolvedValueOnce([{ insertId: 5 }]) // INSERT factura
            .mockResolvedValueOnce([{}])              // INSERT item
            .mockResolvedValueOnce([{}])              // recalcTotals query items
            .mockResolvedValueOnce([{}])              // UPDATE totals
            .mockResolvedValueOnce([{}]);             // UPDATE next_number

        const res = await request(app)
            .post('/api/invoices')
            .set(AUTH)
            .send(INVOICE_PAYLOAD);

        expect(res.status).toBe(201);
        expect(res.body.invoiceId).toBe(5);
        expect(mockConnection.commit).toHaveBeenCalled();
    });

    test('400 - sin items', async () => {
        const res = await request(app).post('/api/invoices').set(AUTH)
            .send({ ...INVOICE_PAYLOAD, items: [] });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/al menos una línea/i);
    });

    test('401 - sin autenticación', async () => {
        const res = await request(app).post('/api/invoices').send(INVOICE_PAYLOAD);
        expect(res.status).toBe(401);
    });
});

describe('Invoices - GET /api/invoices', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve lista con filtros aplicados', async () => {
        mockQuery
            .mockResolvedValueOnce([{}]) // UPDATE overdue
            .mockResolvedValueOnce([[
                { id: 1, invoice_number: 'FAC-2025-0001', client_name: 'Empresa A', total_amount: 1210, subtotal_amount: 1000, tax_amount: 210, payment_status: 'unpaid' },
            ]]);

        const res = await request(app).get('/api/invoices').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body[0].invoice_number).toBe('FAC-2025-0001');
        expect(res.body[0].tax_amount).toBe(210);
    });

    test('200 - filtrado por estado', async () => {
        mockQuery
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[
                { id: 2, invoice_number: 'FAC-2025-0002', status: 'paid', total_amount: 500 },
            ]]);

        const res = await request(app).get('/api/invoices?status=paid').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body[0].status).toBe('paid');
    });

    test('401 - sin token', async () => {
        const res = await request(app).get('/api/invoices');
        expect(res.status).toBe(401);
    });
});

describe('Invoices - GET /api/invoices/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve factura con items y pagos', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1, invoice_number: 'FAC-2025-0001', client_name: 'X', subtotal_amount: 1000, tax_amount: 210 }]])
            .mockResolvedValueOnce([[{ id: 1, description: 'Desarrollo', tax_rate: 21, subtotal: 1000, tax_amount: 210, total: 1210 }]])
            .mockResolvedValueOnce([[]]);  // pagos vacíos

        const res = await request(app).get('/api/invoices/1').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].tax_rate).toBe(21);
        expect(Array.isArray(res.body.payments)).toBe(true);
    });

    test('404 - factura no encontrada', async () => {
        mockQuery.mockResolvedValueOnce([[undefined]]);
        const res = await request(app).get('/api/invoices/999').set(AUTH);
        expect(res.status).toBe(404);
    });
});

describe('Invoices - PATCH /api/invoices/:id/status', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - cambio de estado rápido a sent', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1 }]]) // SELECT factura
            .mockResolvedValueOnce([{}]);          // UPDATE status

        const res = await request(app)
            .patch('/api/invoices/1/status')
            .set(AUTH)
            .send({ status: 'sent' });

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/actualizado/i);
    });

    test('400 - estado no válido', async () => {
        const res = await request(app)
            .patch('/api/invoices/1/status')
            .set(AUTH)
            .send({ status: 'invalid_status' });

        expect(res.status).toBe(400);
    });

    test('401 - sin auth', async () => {
        const res = await request(app).patch('/api/invoices/1/status').send({ status: 'sent' });
        expect(res.status).toBe(401);
    });
});

// ── PAGOS PARCIALES ───────────────────────────────────────
describe('Invoices - POST /api/invoices/:id/payments', () => {
    beforeEach(() => { jest.clearAllMocks(); mockConnection.query.mockReset(); });

    test('201 - pago parcial registrado', async () => {
        mockConnection.query
            .mockResolvedValueOnce([[{ id: 1, total_amount: 1210, paid_amount: 0 }]]) // SELECT factura
            .mockResolvedValueOnce([{}])   // INSERT payment
            .mockResolvedValueOnce([{}]);  // UPDATE factura paid_amount

        const res = await request(app)
            .post('/api/invoices/1/payments')
            .set(AUTH)
            .send({ amount: 500, payment_date: '2025-01-15', method: 'transfer' });

        expect(res.status).toBe(201);
        expect(res.body.paid_amount).toBe(500);
        expect(res.body.payment_status).toBe('partial');
        expect(mockConnection.commit).toHaveBeenCalled();
    });

    test('201 - pago completo marca como paid', async () => {
        mockConnection.query
            .mockResolvedValueOnce([[{ id: 1, total_amount: 1210, paid_amount: 0 }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}]);

        const res = await request(app)
            .post('/api/invoices/1/payments')
            .set(AUTH)
            .send({ amount: 1210, payment_date: '2025-01-15', method: 'transfer' });

        expect(res.status).toBe(201);
        expect(res.body.payment_status).toBe('paid');
    });

    test('404 - factura no encontrada', async () => {
        mockConnection.query.mockResolvedValueOnce([[undefined]]);
        const res = await request(app)
            .post('/api/invoices/999/payments')
            .set(AUTH)
            .send({ amount: 100, payment_date: '2025-01-15' });
        expect(res.status).toBe(404);
    });

    test('401 - sin auth', async () => {
        const res = await request(app).post('/api/invoices/1/payments').send({ amount: 100 });
        expect(res.status).toBe(401);
    });
});

describe('Invoices - GET /api/invoices/:id/payments', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - lista pagos', async () => {
        mockQuery.mockResolvedValueOnce([[
            { id: 1, amount: 500, payment_date: '2025-01-15', method: 'transfer' },
        ]]);

        const res = await request(app).get('/api/invoices/1/payments').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body[0].amount).toBe(500);
    });
});

// ── CONFIGURACIÓN NUMERACIÓN ──────────────────────────────
describe('Invoices - GET /api/invoices/settings', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve configuración actual', async () => {
        mockQuery.mockResolvedValueOnce([[{
            id: 1, user_id: 1, prefix: 'FAC', next_number: 5,
            padding: 4, reset_yearly: 1, current_year: 2025,
        }]]);

        const res = await request(app).get('/api/invoices/settings').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.prefix).toBe('FAC');
        expect(res.body.next_number).toBe(5);
    });

    test('200 - crea settings por defecto si no existen', async () => {
        mockQuery
            .mockResolvedValueOnce([[]])   // no settings
            .mockResolvedValueOnce([{}])   // INSERT
            .mockResolvedValueOnce([[{ id: 1, prefix: 'FAC', next_number: 1, padding: 4 }]]); // re-select

        const res = await request(app).get('/api/invoices/settings').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.prefix).toBe('FAC');
    });
});

describe('Invoices - PUT /api/invoices/settings', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - actualiza configuración', async () => {
        mockQuery.mockResolvedValueOnce([{}]);
        const res = await request(app)
            .put('/api/invoices/settings')
            .set(AUTH)
            .send({ prefix: 'INV', padding: 5, reset_yearly: 0 });
        expect(res.status).toBe(200);
    });
});

// ── ESTADÍSTICAS ──────────────────────────────────────────
describe('Invoices - GET /api/invoices/stats', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve estadísticas completas', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ month: '2025-01', total: 2000, count: 2 }]])         // byMonth
            .mockResolvedValueOnce([[{ name: 'Empresa A', total: 2000, invoices: 2 }]])     // topClients
            .mockResolvedValueOnce([[{ base_imponible: 1653, total_iva: 347, total_con_iva: 2000 }]]) // taxSummary
            .mockResolvedValueOnce([[{ status: 'paid', count: 2, total: 2000 }]])           // byStatus
            .mockResolvedValueOnce([[{ avg_days: 14 }]]);                                   // avgDays

        const res = await request(app).get('/api/invoices/stats').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.byMonth).toHaveLength(1);
        expect(res.body.taxSummary.base_imponible).toBe(1653);
        expect(res.body.avgDays).toBe(14);
    });
});

// ── DELETE ────────────────────────────────────────────────
describe('Invoices - DELETE /api/invoices/:id', () => {
    beforeEach(() => { jest.clearAllMocks(); mockConnection.query.mockReset(); });

    test('200 - soft delete de factura draft', async () => {
        mockConnection.query
            .mockResolvedValueOnce([[{ status: 'draft', payment_status: 'unpaid' }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}]);

        const res = await request(app).delete('/api/invoices/1').set(AUTH);
        expect(res.status).toBe(200);
        expect(mockConnection.commit).toHaveBeenCalled();
    });

    test('400 - no eliminar factura pagada', async () => {
        mockConnection.query.mockResolvedValueOnce([[{ status: 'paid', payment_status: 'paid' }]]);
        const res = await request(app).delete('/api/invoices/1').set(AUTH);
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/pagada/i);
    });

    test('404 - factura no encontrada', async () => {
        mockConnection.query.mockResolvedValueOnce([[undefined]]);
        const res = await request(app).delete('/api/invoices/999').set(AUTH);
        expect(res.status).toBe(404);
    });
});