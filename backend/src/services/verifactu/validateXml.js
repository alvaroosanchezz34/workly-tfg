import { spawn } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const xsdDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'xsd');

export const validateVerifactuXml = async xml => {
    const dir = await mkdtemp(path.join(tmpdir(), 'verifactu-'));
    const file = path.join(dir, 'registro.xml');
    await writeFile(file, xml, 'utf8');
    try {
        await new Promise((resolve, reject) => {
            const child = spawn('xmllint', [
                '--nonet',
                '--noout',
                '--schema',
                path.join(xsdDir, 'SuministroLR.xsd'),
                file,
            ], {
                env: { ...process.env, XML_CATALOG_FILES: path.join(xsdDir, 'catalog.xml') },
            });
            let stderr = '';
            child.stderr.on('data', chunk => { stderr += chunk; });
            child.on('error', reject);
            child.on('close', code => {
                if (code === 0) resolve();
                else {
                    const err = new Error(`El XML no cumple el esquema de la AEAT (SuministroLR): ${stderr.trim()}`);
                    err.statusCode = 500;
                    reject(err);
                }
            });
        });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
};
