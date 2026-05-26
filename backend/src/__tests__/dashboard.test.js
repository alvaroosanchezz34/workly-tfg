/**
 * Tests: Dashboard Controller
 * Cubre: GET /api/dashboard
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery },
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        sign:   jest.fn().mockReturnValue('mock_token'),
        verify: jest.fn().mockReturnValue({ id: 1, role: 'user' }),
    },
}));

const { default: request } = await import('supertest');
const { default: app }     = await import('../app.js');

const AUTH = { Authorization: 'Bearer mock_token' };

// Helper: simula las N consultas que hace getDashboardData
const mockDashboard = ({ income = 5000, expenses = 1200, pending = 3, overdue = 1 } = {}) => {
    mockQuery
        .mockResolvedValueOnce([[{ total: income }]])       // ingresos totales
        .mockResolvedValueOnce([[{ total: expenses }]])     // gastos totales
        .mockResolvedValueOnce([[{ total: pending }]])      // facturas pendientes
        .mockResolvedValueOnce([[{ total: overdue }]])      // facturas vencidas
        .mockResolvedValueOnce([[]])                        // ingresos por mes (array vacío)
        .mockResolvedValueOnce([[]])                        // top clientes
        .mockResolvedValueOnce([[]])                        // proyectos por estado
        .mockResolvedValueOnce([[]])                        // gastos por mes
        .mockResolvedValueOnce([[]])                        // acciones rápidas / notificaciones
        .mockResolvedValue([[]]);                           // cualquier consulta adicional
};

describe('Dashboard - GET /api/dashboard', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - devuelve métricas financieras', async () => {
        mockDashboard({ income: 8500, expenses: 2100, pending: 4, overdue: 2 });

        const res = await request(app).get('/api/dashboard').set(AUTH);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('income');
        expect(res.body).toHaveProperty('expenses');
        expect(res.body).toHaveProperty('pendingInvoices');
        expect(res.body).toHaveProperty('overdueInvoices');
        expect(Number(res.body.income)).toBe(8500);
        expect(Number(res.body.expenses)).toBe(2100);
        expect(res.body.pendingInvoices).toBe(4);
        expect(res.body.overdueInvoices).toBe(2);
    });

    test('200 - calcula beneficio neto correctamente', async () => {
        mockDashboard({ income: 5000, expenses: 1500 });

        const res = await request(app).get('/api/dashboard').set(AUTH);

        expect(res.status).toBe(200);
        // beneficio = income - expenses
        expect(Number(res.body.profit)).toBe(3500);
    });

    test('200 - devuelve cero cuando no hay datos', async () => {
        mockDashboard({ income: 0, expenses: 0, pending: 0, overdue: 0 });

        const res = await request(app).get('/api/dashboard').set(AUTH);

        expect(res.status).toBe(200);
        expect(Number(res.body.income)).toBe(0);
        expect(Number(res.body.expenses)).toBe(0);
        expect(res.body.pendingInvoices).toBe(0);
        expect(res.body.overdueInvoices).toBe(0);
    });

    test('401 - sin token', async () => {
        const res = await request(app).get('/api/dashboard');
        expect(res.status).toBe(401);
    });
});