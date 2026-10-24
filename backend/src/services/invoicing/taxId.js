// Comprueba NIF, NIE y CIF españoles. No consulta el censo de la AEAT:
// solo el formato y el dígito o la letra de control.

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const CIF_LETTERS = 'JABCDEFGHI';
const CIF_DIGIT_ONLY = new Set(['A', 'B', 'E', 'H']);
const CIF_LETTER_ONLY = new Set(['K', 'P', 'Q', 'S', 'N', 'W']);

const clean = value => String(value ?? '').toUpperCase().replace(/[\s.-]/g, '');

const dniLetter = digits => DNI_LETTERS[Number(digits) % 23];

export const validateSpanishTaxId = raw => {
    const value = clean(raw);
    if (!value) return { ok: false, message: 'El NIF está vacío' };

    if (/^[0-9]{8}[A-Z]$/.test(value)) {
        const ok = dniLetter(value.slice(0, 8)) === value[8];
        return ok
            ? { ok: true, value, kind: 'nif' }
            : { ok: false, message: 'La letra del NIF no coincide' };
    }

    if (/^[XYZ][0-9]{7}[A-Z]$/.test(value)) {
        const prefix = { X: '0', Y: '1', Z: '2' }[value[0]];
        const ok = dniLetter(prefix + value.slice(1, 8)) === value[8];
        return ok
            ? { ok: true, value, kind: 'nie' }
            : { ok: false, message: 'La letra del NIE no coincide' };
    }

    if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(value)) {
        const digits = value.slice(1, 8);
        let sum = 0;
        for (let i = 0; i < 7; i++) {
            const n = Number(digits[i]);
            if (i % 2 === 0) {
                const doubled = n * 2;
                sum += Math.floor(doubled / 10) + (doubled % 10);
            } else {
                sum += n;
            }
        }
        const control = (10 - (sum % 10)) % 10;
        const expectedDigit = String(control);
        const expectedLetter = CIF_LETTERS[control];
        const got = value[8];
        const digitOk = got === expectedDigit;
        const letterOk = got === expectedLetter;
        const org = value[0];
        const ok = CIF_DIGIT_ONLY.has(org) ? digitOk
            : CIF_LETTER_ONLY.has(org) ? letterOk
            : (digitOk || letterOk);
        return ok
            ? { ok: true, value, kind: 'cif' }
            : { ok: false, message: 'El dígito de control del CIF no coincide' };
    }

    return { ok: false, message: 'El NIF no tiene un formato válido (NIF, NIE o CIF)' };
};

export const assertSpanishTaxId = raw => {
    const result = validateSpanishTaxId(raw);
    if (!result.ok) {
        const err = new Error(result.message);
        err.statusCode = 400;
        throw err;
    }
    return result.value;
};
