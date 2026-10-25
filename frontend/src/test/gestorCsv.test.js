import { describe, expect, test } from 'vitest';
import { toGestorCsv } from '../utils/gestorCsv';

describe('CSV para la gestoría', () => {
    test('aplana casillas y no mete el JSON crudo', () => {
        const csv = toGestorCsv({
            totals: { iva_repercutido: 21.5 },
            income: [{ mes: 'Enero', base: 100 }],
        });
        expect(csv.startsWith('\uFEFFapartado,campo,importe')).toBe(true);
        expect(csv).toContain('"totals","iva_repercutido","21.5"');
        expect(csv).toContain('"income 1","mes","Enero"');
        expect(csv).not.toContain('{');
    });
});
