/**
 * Tests: PublicInvoice Controller
 * Rutas: GET /api/public/invoice/:token, POST /api/public/invoice/:token/checkout
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery, getConnection: jest.fn() },
}));

const mockSessionsCreate = jest.fn();
class MockStripe {
    constructor() {
        this.checkout = { sessions: { create: mockSessionsCreate } };
    }
}
jest.unstable_mockModule('stripe', () => ({ default: MockStripe }));

const { default: request } = await import('supertest');
const { default: app }     = await import('../app.js');

const VALID_TOKEN = 'a'.repeat(64);

describe('PublicInvoice - GET /api/public/invoice/:token', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve la factura y sus líneas', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ id: 1, invoice_number: 'FAC-2026-0001', total_amount: 121, paid_amount: 0, payment_status: 'unpaid' }]])
            .mockResolvedValueOnce([[{ description: 'Servicio', quantity: 1, unit_price: 100, tax_rate: 21, subtotal: 100, tax_amount: 21, total: 121 }]]);

        const res = await request(app).get(`/api/public/invoice/${VALID_TOKEN}`);

        expect(res.status).toBe(200);
        expect(res.body.invoice_number).toBe('FAC-2026-0001');
        expect(res.body.items).toHaveLength(1);
    });

    test('400 - token demasiado corto', async () => {
        const res = await request(app).get('/api/public/invoice/short');
        expect(res.status).toBe(400);
    });

    test('404 - factura no encontrada', async () => {
        mockQuery.mockResolvedValueOnce([[undefined]]);
        const res = await request(app).get(`/api/public/invoice/${VALID_TOKEN}`);
        expect(res.status).toBe(404);
    });
});

describe('PublicInvoice - POST /api/public/invoice/:token/checkout', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - crea la sesión de pago para el importe pendiente', async () => {
        mockQuery.mockResolvedValueOnce([[{ id: 1, invoice_number: 'FAC-2026-0001', total_amount: 121, paid_amount: 0, payment_status: 'unpaid' }]]);
        mockSessionsCreate.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/session123' });

        const res = await request(app).post(`/api/public/invoice/${VALID_TOKEN}/checkout`);

        expect(res.status).toBe(200);
        expect(res.body.url).toBe('https://checkout.stripe.com/session123');
        expect(mockSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
            mode: 'payment',
            metadata: expect.objectContaining({ type: 'invoice_payment', invoice_id: '1' }),
        }));
    });

    test('400 - factura ya pagada', async () => {
        mockQuery.mockResolvedValueOnce([[{ id: 1, total_amount: 121, paid_amount: 121, payment_status: 'paid' }]]);
        const res = await request(app).post(`/api/public/invoice/${VALID_TOKEN}/checkout`);
        expect(res.status).toBe(400);
        expect(mockSessionsCreate).not.toHaveBeenCalled();
    });

    test('404 - factura no encontrada', async () => {
        mockQuery.mockResolvedValueOnce([[undefined]]);
        const res = await request(app).post(`/api/public/invoice/${VALID_TOKEN}/checkout`);
        expect(res.status).toBe(404);
    });

    test('400 - token no válido', async () => {
        const res = await request(app).post('/api/public/invoice/short/checkout');
        expect(res.status).toBe(400);
    });
});
