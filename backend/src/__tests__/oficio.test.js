/**
 * Catálogo de oficio, aceptación pública, antigüedad de cobro y foto de ticket.
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery, getConnection: jest.fn() },
}));
jest.unstable_mockModule('../utils/activityLogger.js', () => ({ logActivity: jest.fn() }));
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: { verify: jest.fn().mockReturnValue({ id: 1, role: 'user' }), sign: jest.fn().mockReturnValue('mock') },
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
const AUTH = { Authorization: 'Bearer mock' };
const USER = [[{ id: 1, name: 'Koke', email: 'koke@test.com', role: 'user', plan: 'pro', plan_status: 'active', company_id: null }]];
const TOKEN = 'a'.repeat(64);
const PNG = `data:image/png;base64,${'A'.repeat(40)}`;

describe('Catálogo de oficio', () => {
    beforeEach(() => jest.clearAllMocks());

    test('401 sin sesión', async () => {
        const res = await request(app).get('/api/services/catalog');
        expect(res.status).toBe(401);
    });

    test('200 devuelve partidas de fontanero', async () => {
        mockQuery.mockResolvedValueOnce(USER);
        const res = await request(app).get('/api/services/catalog').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.fontanero).toHaveLength(4);
        expect(res.body.fontanero[0].name).toBe('Hora de oficial');
    });

    test('201 importa las partidas que faltan', async () => {
        mockQuery.mockResolvedValueOnce(USER);
        for (let i = 0; i < 4; i += 1) {
            mockQuery.mockResolvedValueOnce([[]]);
            mockQuery.mockResolvedValueOnce([{ insertId: i + 1 }]);
        }
        const res = await request(app).post('/api/services/catalog').set(AUTH).send({ trade: 'electricista' });
        expect(res.status).toBe(201);
        expect(res.body.created).toBe(4);
        expect(mockQuery.mock.calls[2][0]).toMatch(/INSERT INTO services/);
        expect(mockQuery.mock.calls[2][1]).toContain('electricista');
    });

    test('400 oficio desconocido', async () => {
        mockQuery.mockResolvedValueOnce(USER);
        const res = await request(app).post('/api/services/catalog').set(AUTH).send({ trade: 'panadero' });
        expect(res.status).toBe(400);
    });
});

describe('Presupuesto público', () => {
    beforeEach(() => jest.clearAllMocks());

    test('400 firma que no es PNG', async () => {
        const res = await request(app)
            .post(`/api/public/quote/${TOKEN}/accept`)
            .send({ signerName: 'Ana Ruiz', signature: 'data:image/jpeg;base64,AAAA' });
        expect(res.status).toBe(400);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('200 acepta sin convertir a factura', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
        const res = await request(app)
            .post(`/api/public/quote/${TOKEN}/accept`)
            .send({ signerName: 'Ana Ruiz', signature: PNG });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/aceptado/i);
        expect(mockQuery.mock.calls[0][0]).toMatch(/converted_to_invoice_id IS NULL/);
        expect(mockQuery.mock.calls[0][0]).not.toMatch(/INSERT INTO invoices/);
    });
});

describe('Cobros y gastos de obra', () => {
    beforeEach(() => jest.clearAllMocks());

    test('aging solo mira facturas del usuario', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{
                id: 4, invoice_number: 'FAC-1', due_date: '2020-01-01',
                total_amount: 121, paid_amount: 21, status: 'overdue',
                client_name: 'Pepe', days_overdue: 80,
            }]]);
        const res = await request(app).get('/api/invoices/aging').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.d61[0].pending).toBe(100);
        expect(res.body.d61[0].client_name).toBe('Pepe');
        expect(mockQuery.mock.calls[1][0]).toMatch(/i\.user_id = \?/);
        expect(mockQuery.mock.calls[1][1]).toEqual([1]);
    });

    test('404 al recordar una factura de otro', async () => {
        mockQuery.mockResolvedValueOnce(USER).mockResolvedValueOnce([[]]);
        const res = await request(app).post('/api/invoices/9/remind').set(AUTH).send({});
        expect(res.status).toBe(404);
    });

    test('recordatorio sin email deja el texto de WhatsApp', async () => {
        mockQuery
            .mockResolvedValueOnce(USER)
            .mockResolvedValueOnce([[{
                id: 4, invoice_number: 'FAC-1', total_amount: 50, paid_amount: 0,
                status: 'sent', public_token: TOKEN, last_reminder_at: null,
                client_name: 'Ana', client_email: null,
            }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);
        const res = await request(app).post('/api/invoices/4/remind').set(AUTH).send({});
        expect(res.status).toBe(200);
        expect(res.body.emailed).toBe(false);
        expect(res.body.whatsapp).toMatch(/FAC-1/);
        expect(res.body.whatsapp).toMatch(/\/p\//);
    });

    test('400 foto de ticket que no es imagen', async () => {
        mockQuery.mockResolvedValueOnce(USER);
        const res = await request(app).post('/api/expenses').set(AUTH).send({
            category: 'materiales', description: 'Cinta', amount: 4, date: '2026-10-01',
            receipt_image: 'data:image/gif;base64,AAAA',
        });
        expect(res.status).toBe(400);
        expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    test('400 firma de presupuesto demasiado corta en el nombre', async () => {
        mockQuery.mockResolvedValueOnce(USER);
        const res = await request(app).post('/api/quotes/3/sign').set(AUTH).send({ signerName: 'A', signature: PNG });
        expect(res.status).toBe(400);
    });
});
