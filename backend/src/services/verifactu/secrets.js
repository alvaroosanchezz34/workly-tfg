import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { certKind } from './config.js';

const keyBytes = () => {
    const raw = String(process.env.VERIFACTU_CERT_KEY || '').trim();
    if (!raw) {
        const err = new Error('Falta VERIFACTU_CERT_KEY (32 bytes en base64) para cifrar certificados');
        err.statusCode = 500;
        throw err;
    }
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
        const err = new Error('VERIFACTU_CERT_KEY tiene que decodificar a 32 bytes');
        err.statusCode = 500;
        throw err;
    }
    return key;
};

export const encryptBuffer = plain => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv);
    const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
};

export const decryptBuffer = encoded => {
    const data = Buffer.from(String(encoded || ''), 'base64');
    if (data.length < 28) {
        const err = new Error('No se pudo leer el certificado cifrado');
        err.statusCode = 500;
        throw err;
    }
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const enc = data.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', keyBytes(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]);
};

export const encryptText = value => encryptBuffer(Buffer.from(String(value ?? ''), 'utf8'));

export const decryptText = encoded => decryptBuffer(encoded).toString('utf8');

export const platformMaterialFromEnv = () => {
    const passphrase = process.env.VERIFACTU_PLATFORM_PFX_PASSPHRASE || '';
    const b64 = String(process.env.VERIFACTU_PLATFORM_PFX_BASE64 || '').trim();
    if (b64) return { pfx: Buffer.from(b64, 'base64'), passphrase, certKind: certKind() };
    const file = String(process.env.VERIFACTU_PLATFORM_PFX_PATH || '').trim();
    if (file && existsSync(file)) {
        return { pfx: readFileSync(file), passphrase, certKind: certKind() };
    }
    return null;
};

export const platformCertConfigured = () => Boolean(
    String(process.env.VERIFACTU_PLATFORM_PFX_BASE64 || '').trim()
    || (String(process.env.VERIFACTU_PLATFORM_PFX_PATH || '').trim() && existsSync(process.env.VERIFACTU_PLATFORM_PFX_PATH))
);
