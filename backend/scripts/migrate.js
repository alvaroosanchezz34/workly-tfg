import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const dir = path.dirname(fileURLToPath(import.meta.url));
const mark = process.argv.includes('--mark-applied')
    ? process.argv[process.argv.indexOf('--mark-applied') + 1]
    : null;
const baseline = mark ? String(mark).replace('.sql', '').slice(0, 3) : null;

const files = (await readdir(dir))
    .filter(name => /^\d{3}_.+\.sql$/.test(name))
    .sort();

const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
});

await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(190) PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

const [appliedRows] = await conn.query('SELECT id FROM schema_migrations');
const applied = new Set(appliedRows.map(row => row.id));

for (const file of files) {
    if (applied.has(file)) {
        console.log(`ya aplicada ${file}`);
        continue;
    }
    if (baseline && file.slice(0, 3) <= baseline) {
        await conn.query('INSERT INTO schema_migrations (id) VALUES (?)', [file]);
        console.log(`marcada sin ejecutar ${file}`);
        continue;
    }
    const sql = await readFile(path.join(dir, file), 'utf8');
    console.log(`aplicando ${file}`);
    await conn.query(sql);
    await conn.query('INSERT INTO schema_migrations (id) VALUES (?)', [file]);
}

await conn.end();
console.log('migraciones al día');
