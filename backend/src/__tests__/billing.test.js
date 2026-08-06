/**
 * Tests: Billing Controller — foco en el webhook de pago de factura pública
 * (checkout.session.completed con metadata.type = 'invoice_payment')
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockConnection = {
    query:            jest.fn(),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit:           jest.fn().mockResolvedValue(undefined),
    rollback:         jest.fn().mockResolvedValue(undefined),
    release:          jest.fn(),
};
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery, getConnection: jest.fn().mockResolvedValue(mockConnection) },
}));

const mockConstructEvent = jest.fn();
class MockStripe {
    constructor() {
        this.webhooks = { constructEvent: mockConstructEvent };
        this.customers = { retrieve: jest.fn() };
    }
}
jest.unstable_mockModule('stripe', () => ({ default: MockStripe }));

const { default: request } = await import('supertest');
const { default: app }     = await import('../app.js');

describe('Billing - POST /api/billing/webhook (invoice_payment)', () => {
    beforeEach(() => { jest.clearAllMocks(); mockConnection.query.mockReset(); });

    test('200 - registra el pago y actualiza la factura a pagada', async () => {
        mockConstructEvent.mockReturnValueOnce({
            id: 'evt_1',
            type: 'checkout.session.completed',
            data: { object: {
                id: 'cs_test_123',
                amount_total: 12100,
                metadata: { type: 'invoice_payment', invoice_id: '1', public_token: 'abc' },
            } },
        });

        mockConnection.query
            .mockResolvedValueOnce([[undefined]])                                  // no hay pago previo con esa reference
            .mockResolvedValueOnce([[{ id: 1, user_id: 5, total_amount: 121, paid_amount: 0 }]]) // factura
            .mockResolvedValueOnce([{}])                                           // INSERT invoice_payments
            .mockResolvedValueOnce([{}]);                                          // UPDATE invoices

        mockQuery.mockResolvedValueOnce([{}]); // logBillingEvent

        const res = await request(app)
            .post('/api/billing/webhook')
            .set('stripe-signature', 'sig')
            .set('Content-Type', 'application/json')
            .send(JSON.stringify({}));

        expect(res.status).toBe(200);
        expect(mockConnection.commit).toHaveBeenCalled();
        expect(mockConnection.query).toHaveBeenCalledTimes(4);
    });

    test('200 - no duplica el pago si el webhook se reintenta (misma reference)', async () => {
        mockConstructEvent.mockReturnValueOnce({
            id: 'evt_2',
            type: 'checkout.session.completed',
            data: { object: {
                id: 'cs_test_123',
                amount_total: 12100,
                metadata: { type: 'invoice_payment', invoice_id: '1' },
            } },
        });

        mockConnection.query.mockResolvedValueOnce([[{ id: 99 }]]); // ya existe un pago con esa reference

        const res = await request(app)
            .post('/api/billing/webhook')
            .set('stripe-signature', 'sig')
            .send(JSON.stringify({}));

        expect(res.status).toBe(200);
        expect(mockConnection.query).toHaveBeenCalledTimes(1); // solo la comprobación, no inserta de nuevo
    });

    test('400 - firma inválida', async () => {
        mockConstructEvent.mockImplementationOnce(() => { throw new Error('bad signature'); });

        const res = await request(app)
            .post('/api/billing/webhook')
            .set('stripe-signature', 'bad')
            .send(JSON.stringify({}));

        expect(res.status).toBe(400);
    });
});
