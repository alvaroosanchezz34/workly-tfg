import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashToken = token => createHash('sha256').update(token).digest('hex');

const accessTokenFor = user => jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30m' }
);

const storeRefreshToken = async (user) => {
    const token = jwt.sign(
        { id: user.id, role: user.role, jti: randomBytes(16).toString('hex') },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
        [user.id, hashToken(token), expires]
    );
    return token;
};

const fail = (res, status, message) => res.status(status).json({ message });

export const register = async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!name || !email || !password) {
        return fail(res, 400, 'Todos los campos son obligatorios');
    }
    if (name.length > 100) return fail(res, 400, 'El nombre es demasiado largo');
    if (password.length < 8) {
        return fail(res, 400, 'La contraseña debe tener al menos 8 caracteres');
    }
    if (!emailRegex.test(email) || email.length > 150) {
        return fail(res, 400, 'Email no válido');
    }

    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return fail(res, 400, 'Email ya registrado');

        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await pool.query(
            `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')`,
            [name, email, hashedPassword]
        );
        res.status(201).json({
            message: 'Usuario registrado correctamente',
            userId: result.insertId,
        });
    } catch (error) {
        logger.error('register', { message: error.message });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const login = async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return fail(res, 400, 'Email y contraseña son obligatorios');

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return fail(res, 401, 'Credenciales incorrectas');

        const user = rows[0];
        if (user.status !== 'active' || user.deleted_at) {
            return fail(res, 403, 'Cuenta suspendida o inactiva');
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return fail(res, 401, 'Credenciales incorrectas');

        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
        const accessToken = accessTokenFor(user);
        const refreshToken = await storeRefreshToken(user);

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                company: user.company_name,
                company_id: user.company_id,
                avatar_url: user.avatar_url,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error('login', { message: error.message });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const refreshToken = async (req, res) => {
    const token = req.body?.refreshToken;
    if (!token) return fail(res, 401, 'Refresh token requerido');

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const [[stored]] = await pool.query(
            `SELECT id, user_id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = ?`,
            [hashToken(token)]
        );
        if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date() || stored.user_id !== decoded.id) {
            return fail(res, 403, 'Refresh token inválido');
        }
        const [[user]] = await pool.query(
            `SELECT id, role, status, deleted_at FROM users WHERE id = ?`,
            [decoded.id]
        );
        if (!user || user.status !== 'active' || user.deleted_at) {
            return fail(res, 403, 'Refresh token inválido');
        }
        await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?`, [stored.id]);
        const accessToken = accessTokenFor(user);
        const nextRefresh = await storeRefreshToken(user);
        res.json({ accessToken, refreshToken: nextRefresh });
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return fail(res, 403, 'Refresh token inválido');
        }
        logger.error('refresh', { message: error.message });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const logout = async (req, res) => {
    const token = req.body?.refreshToken;
    try {
        if (token) {
            await pool.query(
                `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL`,
                [hashToken(token)]
            );
        }
        res.json({ message: 'Sesión cerrada' });
    } catch (error) {
        logger.error('logout', { message: error.message });
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
