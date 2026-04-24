/**
 * Tests: Company Controller
 * Cubre: crear empresa, gestión de equipo, dashboard consolidado
 */

import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockConnection = {
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    query:            jest.fn(),
    commit:           jest.fn().mockResolvedValue(undefined),
    rollback:         jest.fn().mockResolvedValue(undefined),
    release:          jest.fn(),
};

jest.unstable_mockModule('../config/db.js', () => ({
    pool: { query: mockQuery, getConnection: jest.fn().mockResolvedValue(mockConnection) },
}));
jest.unstable_mockModule('bcrypt', () => ({
    default: { hash: jest.fn().mockResolvedValue('hashed'), compare: jest.fn() },
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: { verify: jest.fn().mockReturnValue({ id: 1, role: 'admin' }), sign: jest.fn().mockReturnValue('mock') },
}));

const { default: request } = await import('supertest');
const { default: app }     = await import('../app.js');
const AUTH = { Authorization: 'Bearer mock' };

// Simular que el usuario tiene empresa (middleware resolveCompany)
// Para tests sin empresa:
const NO_COMPANY_JWT = jest.fn().mockReturnValue({ id: 2, role: 'user' });

describe('Company - POST /api/company (crear empresa)', () => {
    beforeEach(() => { jest.clearAllMocks(); mockConnection.query.mockReset(); });

    test('201 - empresa creada', async () => {
        // resolveCompany (member lookup) → no tiene empresa
        mockQuery.mockResolvedValueOnce([[]]); // no member

        mockConnection.query
            .mockResolvedValueOnce([[]])            // slug no existe
            .mockResolvedValueOnce([{ insertId: 1 }]) // INSERT company
            .mockResolvedValueOnce([{}])            // INSERT member admin
            .mockResolvedValueOnce([{}]);           // UPDATE user

        const res = await request(app).post('/api/company').set(AUTH).send({ name: 'Mi Empresa S.L.' });
        expect(res.status).toBe(201);
        expect(res.body.companyId).toBe(1);
        expect(mockConnection.commit).toHaveBeenCalled();
    });

    test('400 - nombre obligatorio', async () => {
        mockQuery.mockResolvedValueOnce([[]]); // resolveCompany
        const res = await request(app).post('/api/company').set(AUTH).send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/nombre/i);
    });

    test('401 - sin auth', async () => {
        const res = await request(app).post('/api/company').send({ name: 'Test' });
        expect(res.status).toBe(401);
    });
});

describe('Company - GET /api/company/team', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - lista miembros del equipo', async () => {
        // resolveCompany → tiene empresa y es admin
        mockQuery
            .mockResolvedValueOnce([[{ company_id: 1, company_role: 'admin', company_status: 'active' }]])
            .mockResolvedValueOnce([[
                { member_id: 1, id: 1, name: 'Admin Koke', email: 'koke@test.com', company_role: 'admin',      member_status: 'active' },
                { member_id: 2, id: 2, name: 'Técnico A',  email: 'tec@test.com',  company_role: 'technician', member_status: 'active' },
            ]]);

        const res = await request(app).get('/api/company/team').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].company_role).toBe('admin');
        expect(res.body[1].company_role).toBe('technician');
    });

    test('401 - sin auth', async () => {
        const res = await request(app).get('/api/company/team');
        expect(res.status).toBe(401);
    });
});

describe('Company - POST /api/company/team/invite', () => {
    beforeEach(() => { jest.clearAllMocks(); mockConnection.query.mockReset(); });

    test('201 - nuevo técnico invitado con cuenta nueva', async () => {
        // resolveCompany
        mockQuery.mockResolvedValueOnce([[{ company_id: 1, company_role: 'admin', company_status: 'active' }]]);

        mockConnection.query
            .mockResolvedValueOnce([[]])             // email no existe → crear usuario
            .mockResolvedValueOnce([{ insertId: 5 }]) // INSERT user
            .mockResolvedValueOnce([[]])             // no es ya miembro
            .mockResolvedValueOnce([{}]);            // INSERT member

        const res = await request(app)
            .post('/api/company/team/invite')
            .set(AUTH)
            .send({ name: 'Técnico Nuevo', email: 'nuevo@test.com', role: 'technician' });

        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/invitado/i);
        expect(res.body.tempPassword).toBeTruthy(); // password temporal para usuario nuevo
        expect(mockConnection.commit).toHaveBeenCalled();
    });

    test('400 - usuario ya es miembro', async () => {
        mockQuery.mockResolvedValueOnce([[{ company_id: 1, company_role: 'admin', company_status: 'active' }]]);
        mockConnection.query
            .mockResolvedValueOnce([[{ id: 3 }]])  // email ya existe
            .mockResolvedValueOnce([[{ id: 10 }]]); // ya es miembro

        const res = await request(app)
            .post('/api/company/team/invite')
            .set(AUTH)
            .send({ name: 'Existente', email: 'existente@test.com' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/ya es miembro/i);
    });

    test('400 - faltan campos', async () => {
        mockQuery.mockResolvedValueOnce([[{ company_id: 1, company_role: 'admin', company_status: 'active' }]]);
        const res = await request(app).post('/api/company/team/invite').set(AUTH).send({ name: 'Solo nombre' });
        expect(res.status).toBe(400);
    });
});

describe('Company - PATCH /api/company/team/:userId/role', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - rol actualizado a admin', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ company_id: 1, company_role: 'admin', company_status: 'active' }]]) // resolveCompany
            .mockResolvedValueOnce([{}]) // UPDATE company_members
            .mockResolvedValueOnce([{}]); // UPDATE users

        const res = await request(app)
            .patch('/api/company/team/5/role')
            .set(AUTH)
            .send({ role: 'admin' });

        expect(res.status).toBe(200);
    });

    test('400 - rol no válido', async () => {
        mockQuery.mockResolvedValueOnce([[{ company_id: 1, company_role: 'admin', company_status: 'active' }]]);
        const res = await request(app).patch('/api/company/team/5/role').set(AUTH).send({ role: 'superadmin' });
        expect(res.status).toBe(400);
    });
});

describe('Company - GET /api/company/dashboard', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 - dashboard consolidado del equipo', async () => {
        mockQuery
            .mockResolvedValueOnce([[{ company_id: 1, company_role: 'admin', company_status: 'active' }]]) // resolveCompany
            .mockResolvedValueOnce([[                                                                        // byMember
                { id: 1, name: 'Koke', clients: 5, projects: 3, invoices: 10, invoiced: 15000 },
                { id: 2, name: 'Técnico A', clients: 2, projects: 1, invoices: 4, invoiced: 4200 },
            ]])
            .mockResolvedValueOnce([[{ total_clients: 7, total_projects: 4, total_invoices: 14, total_invoiced: 19200, total_expenses: 2000 }]]) // totals
            .mockResolvedValueOnce([[{ pending_amount: 3500 }]]); // pending

        const res = await request(app).get('/api/company/dashboard').set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.byMember).toHaveLength(2);
        expect(res.body.totals.total_invoiced).toBe(19200);
        expect(res.body.pending_amount).toBe(3500);
    });
});