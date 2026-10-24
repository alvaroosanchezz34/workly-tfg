import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const joinWaitlist = async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const profession = String(req.body?.profession || '').trim().slice(0, 120);
    const city = String(req.body?.city || '').trim().slice(0, 80);
    const consent = req.body?.consent === true || req.body?.consent === 'true';
    if (name.length < 2 || name.length > 120) {
        return res.status(400).json({ message: 'Indica tu nombre' });
    }
    if (!emailRegex.test(email) || email.length > 150) {
        return res.status(400).json({ message: 'Email no válido' });
    }
    if (!consent) {
        return res.status(400).json({ message: 'Hace falta tu consentimiento para guardar el email' });
    }
    try {
        await pool.query(
            `INSERT INTO waitlist_signups (name, email, profession, city, consent)
             VALUES (?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE
               name = VALUES(name),
               profession = VALUES(profession),
               city = VALUES(city),
               consent = 1`,
            [name, email, profession || null, city || null]
        );
        res.status(201).json({ message: 'Te hemos apuntado. Te escribiremos cuando abramos plazas en Málaga.' });
    } catch (err) {
        logger.error('waitlist', { message: err.message });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const assertAdmin = (req, res) => {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ message: 'Solo el administrador de la plataforma puede ver la lista' });
        return false;
    }
    return true;
};

export const listWaitlist = async (req, res) => {
    if (!assertAdmin(req, res)) return;
    try {
        const [rows] = await pool.query(
            `SELECT id, name, email, profession, city, consent, created_at
             FROM waitlist_signups ORDER BY id DESC LIMIT 2000`
        );
        res.json(rows);
    } catch (err) {
        logger.error('waitlist list', { message: err.message });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const csvCell = value => {
    const text = value == null ? '' : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
};

export const exportWaitlist = async (req, res) => {
    if (!assertAdmin(req, res)) return;
    try {
        const [rows] = await pool.query(
            `SELECT name, email, profession, city, consent, created_at FROM waitlist_signups ORDER BY id ASC`
        );
        const header = 'nombre,email,profesion,ciudad,consentimiento,fecha';
        const lines = rows.map(row => [
            row.name, row.email, row.profession, row.city, row.consent ? 'si' : 'no', row.created_at,
        ].map(csvCell).join(','));
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="lista-espera-workly.csv"');
        res.send(`\uFEFF${header}\n${lines.join('\n')}\n`);
    } catch (err) {
        logger.error('waitlist export', { message: err.message });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
