/**
 * Producción: salud, lista de espera, cierre de cuenta y aislamiento entre cuentas.
 */
import { jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockConnQuery = jest.fn();
const mockConn = {
    query: mockConnQuery,
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
};
jest.unstable_mockModule('../config/db.js', () => ({
    pool: {
        query: mockQuery,
        getConnection: jest.fn(async () => mockConn),
    },
}));

jest.unstable_mockModule('../utils/activityLogger.js', () => ({
    logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        verify: jest.fn().mockReturnValue({ id: 2, role: 'user' }),
        sign: jest.fn().mockReturnValue('mock_token'),
    },
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
const { assertProductionSecrets } = await import('../config/secrets.js');

const AUTH = { Authorization: 'Bearer mock_token' };

const asUser = (overrides = {}) => [[{
    id: 2,
    name: 'Ana',
    email: 'ana@oficio.es',
    role: 'user',
    plan: 'pro',
    plan_status: 'active',
    company_id: null,
    status: 'active',
    ...overrides,
}]];

const sqlOf = fn => fn.mock.calls.map(call => ({
    sql: String(call[0]),
    params: call[1],
}));

describe('GET /api/health', () => {
    beforeEach(() => jest.clearAllMocks());

    test('200 cuando la base responde', async () => {
        mockQuery.mockResolvedValueOnce([[{ ok: 1 }]]);
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.db).toBe('up');
    });

    test('503 cuando la base no responde', async () => {
        mockQuery.mockRejectedValueOnce(new Error('ECONNREFUSED'));
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(503);
        expect(res.body.db).toBe('down');
    });
});

describe('Lista de espera', () => {
    beforeEach(() => jest.clearAllMocks());

    test('201 guarda nombre, email, oficio, ciudad y consentimiento', async () => {
        mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]);
        const res = await request(app).post('/api/waitlist').send({
            name: 'Lucía Pérez',
            email: 'lucia@oficio.es',
            profession: 'Fontanera',
            city: 'Málaga',
            consent: true,
        });
        expect(res.status).toBe(201);
        const insert = sqlOf(mockQuery)[0];
        expect(insert.sql).toMatch(/waitlist_signups/i);
        expect(insert.params).toEqual(['Lucía Pérez', 'lucia@oficio.es', 'Fontanera', 'Málaga']);
    });

    test('400 sin la casilla de consentimiento', async () => {
        const res = await request(app).post('/api/waitlist').send({
            name: 'Lucía',
            email: 'lucia@oficio.es',
            consent: false,
        });
        expect(res.status).toBe(400);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('403 si quien lista no es admin de la plataforma', async () => {
        mockQuery.mockResolvedValueOnce(asUser());
        const res = await request(app).get('/api/waitlist').set(AUTH);
        expect(res.status).toBe(403);
    });

    test('200 y CSV solo para admin', async () => {
        mockQuery.mockResolvedValueOnce(asUser({ role: 'admin' }));
        mockQuery.mockResolvedValueOnce([[{ id: 1, name: 'Lucía', email: 'lucia@oficio.es', profession: 'Fontanera', city: 'Málaga', consent: 1, created_at: '2026-10-24' }]]);
        const list = await request(app).get('/api/waitlist').set(AUTH);
        expect(list.status).toBe(200);
        expect(list.body[0].email).toBe('lucia@oficio.es');

        mockQuery.mockResolvedValueOnce(asUser({ role: 'admin' }));
        mockQuery.mockResolvedValueOnce([[{ name: 'Lucía', email: 'lucia@oficio.es', profession: 'Fontanera', city: 'Málaga', consent: 1, created_at: '2026-10-24' }]]);
        const csv = await request(app).get('/api/waitlist/export').set(AUTH);
        expect(csv.status).toBe(200);
        expect(csv.headers['content-type']).toMatch(/text\/csv/);
        expect(csv.text).toMatch(/lucia@oficio.es/);
    });
});

describe('Cuenta: exportación y cierre', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockConn.beginTransaction.mockClear();
        mockConn.commit.mockClear();
        mockConn.rollback.mockClear();
    });

    test('la exportación pide solo datos de la cuenta autenticada', async () => {
        mockQuery.mockResolvedValueOnce(asUser());
        mockQuery.mockResolvedValueOnce([[{ id: 2, name: 'Ana', email: 'ana@oficio.es' }]]);
        mockQuery.mockResolvedValueOnce([[]]);
        mockQuery.mockResolvedValueOnce([[]]);
        mockQuery.mockResolvedValueOnce([[]]);
        const res = await request(app).get('/api/account/export').set(AUTH);
        expect(res.status).toBe(200);
        const scoped = sqlOf(mockQuery).slice(1);
        expect(scoped[1].sql).toMatch(/user_id = \?/);
        expect(scoped[1].params).toContain(2);
        expect(scoped[2].sql).toMatch(/user_id = \?/);
        expect(scoped[3].sql).toMatch(/i\.user_id = \?/);
    });

    test('cerrar sin la palabra ELIMINAR no toca la base', async () => {
        mockQuery.mockResolvedValueOnce(asUser());
        const res = await request(app).post('/api/account/delete').set(AUTH).send({ confirm: 'borrar' });
        expect(res.status).toBe(400);
        expect(mockConnQuery).not.toHaveBeenCalled();
    });

    test('el cierre no borra facturas emitidas ni registros VeriFactu', async () => {
        mockQuery.mockResolvedValueOnce(asUser());
        mockConnQuery
            .mockResolvedValueOnce([[{ id: 2, email: 'ana@oficio.es', status: 'active', deleted_at: null }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([[{ tax_id: '12345678Z' }]])
            .mockResolvedValueOnce([{}])
            .mockResolvedValueOnce([{}]);

        const res = await request(app).post('/api/account/delete').set(AUTH).send({ confirm: 'ELIMINAR' });
        expect(res.status).toBe(200);
        expect(res.body.retained).toMatch(/4 años/);
        const statements = sqlOf(mockConnQuery).map(call => call.sql);
        expect(statements.some(sql => /DELETE\s+FROM\s+invoices/i.test(sql))).toBe(false);
        expect(statements.some(sql => /DELETE\s+FROM\s+verifactu_records/i.test(sql))).toBe(false);
        expect(statements.some(sql => /status = 'draft'/i.test(sql))).toBe(true);
        expect(statements.some(sql => /DELETE FROM verifactu_certificates/i.test(sql))).toBe(true);
        expect(mockConn.commit).toHaveBeenCalled();
    });
});

describe('Aislamiento entre cuentas', () => {
    beforeEach(() => jest.clearAllMocks());

    test('clientes, facturas, presupuestos y registros filtran por el usuario del token', async () => {
        mockQuery.mockResolvedValueOnce(asUser());
        mockQuery.mockResolvedValueOnce([[{ total: 0 }]]);
        mockQuery.mockResolvedValueOnce([[]]);
        const clients = await request(app).get('/api/clients').set(AUTH);
        expect(clients.status).toBe(200);
        const clientSql = sqlOf(mockQuery)[1];
        expect(clientSql.sql).toMatch(/user_id = \?/);
        expect(clientSql.params).toContain(2);

        mockQuery.mockResolvedValueOnce(asUser());
        mockQuery.mockResolvedValueOnce([[{ total: 0 }]]);
        mockQuery.mockResolvedValueOnce([[]]);
        await request(app).get('/api/invoices').set(AUTH);
        const invoiceSql = sqlOf(mockQuery).at(-2);
        expect(invoiceSql.sql).toMatch(/i\.user_id = \?/);
        expect(invoiceSql.params).toContain(2);

        mockQuery.mockResolvedValueOnce(asUser());
        mockQuery.mockResolvedValueOnce([[]]);
        const missing = await request(app).get('/api/invoices/99').set(AUTH);
        expect(missing.status).toBe(404);
        const byId = sqlOf(mockQuery).at(-1);
        expect(byId.sql).toMatch(/i\.user_id = \?/);
        expect(byId.params[0]).toBe('99');
        expect(byId.params).toContain(2);

        mockQuery.mockResolvedValueOnce(asUser());
        mockConnQuery.mockResolvedValueOnce([[]]);
        const edit = await request(app).put('/api/invoices/99').set(AUTH).send({ items: [] });
        expect(edit.status).toBe(404);
        expect(sqlOf(mockConnQuery).at(-1).sql).toMatch(/user_id = \?/);
        expect(sqlOf(mockConnQuery).at(-1).params[0]).toBe('99');
        expect(sqlOf(mockConnQuery).at(-1).params).toContain(2);
        expect(mockConn.rollback).toHaveBeenCalled();

        mockQuery.mockResolvedValueOnce(asUser());
        mockQuery.mockResolvedValueOnce([[]]);
        await request(app).get('/api/quotes').set(AUTH);
        const quoteSql = sqlOf(mockQuery).at(-1);
        expect(quoteSql.sql).toMatch(/q\.user_id = \?/);
        expect(quoteSql.params).toContain(2);

        mockQuery.mockResolvedValueOnce(asUser());
        mockQuery.mockResolvedValueOnce([[]]);
        await request(app).get('/api/verifactu/records').set(AUTH);
        const recordSql = sqlOf(mockQuery).at(-1);
        expect(recordSql.sql).toMatch(/i\.user_id = \?/);
        expect(recordSql.params).toContain(2);

        mockQuery.mockResolvedValueOnce(asUser());
        mockQuery.mockResolvedValueOnce([[]]);
        const settings = await request(app).get('/api/verifactu/settings').set(AUTH);
        expect(settings.status).toBe(200);
        const profileSql = sqlOf(mockQuery).at(-1);
        expect(profileSql.sql).toMatch(/issuer_key = \?/);
        expect(profileSql.params).toEqual(['user:2']);
    });

    test('un admin de empresa ve la empresa, no el resto de cuentas', async () => {
        mockQuery.mockResolvedValueOnce(asUser({ role: 'company_admin', company_id: 9 }));
        mockQuery.mockResolvedValueOnce([[{ total: 0 }]]);
        mockQuery.mockResolvedValueOnce([[]]);
        await request(app).get('/api/clients').set(AUTH);
        const scoped = sqlOf(mockQuery)[1];
        expect(scoped.sql).toMatch(/company_id = \?/);
        expect(scoped.sql).not.toMatch(/user_id = \?/);
        expect(scoped.params).toEqual([9]);
    });
});

describe('Secretos de producción', () => {
    const previous = {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        DB_PASSWORD: process.env.DB_PASSWORD,
    };

    afterEach(() => {
        process.env.NODE_ENV = previous.NODE_ENV;
        process.env.JWT_SECRET = previous.JWT_SECRET;
        process.env.JWT_REFRESH_SECRET = previous.JWT_REFRESH_SECRET;
        process.env.DB_PASSWORD = previous.DB_PASSWORD;
    });

    test('un secreto corto o de ejemplo impide arrancar en producción', () => {
        process.env.NODE_ENV = 'production';
        process.env.JWT_SECRET = 'cambia_esto_por_un_string_secreto_largo_y_aleatorio';
        process.env.JWT_REFRESH_SECRET = 'otro';
        process.env.DB_PASSWORD = '';
        expect(() => assertProductionSecrets()).toThrow(/Configuración insegura/);
    });

    test('en desarrollo no exige la longitud', () => {
        process.env.NODE_ENV = 'test';
        process.env.JWT_SECRET = 'corto';
        expect(() => assertProductionSecrets()).not.toThrow();
    });
});

describe('POST /api/auth/logout', () => {
    beforeEach(() => jest.clearAllMocks());

    test('revoca el refresh token que se envía', async () => {
        mockQuery.mockResolvedValueOnce([{}]);
        const res = await request(app).post('/api/auth/logout').send({ refreshToken: 'abc.def.ghi' });
        expect(res.status).toBe(200);
        expect(sqlOf(mockQuery)[0].sql).toMatch(/revoked_at/);
    });
});
