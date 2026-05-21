import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

export const getMe = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, email, role, company_name, avatar_url, phone,
                    language, timezone, plan, created_at
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Endpoint usado por Profile.jsx como PUT /users/profile
export const updateProfile = async (req, res) => {
    const { name, email, current_password, password, phone, company_name, avatar_url, language, timezone } = req.body;

    if (!name || !email) return res.status(400).json({ message: 'Nombre y email son obligatorios' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Email no válido' });

    try {
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]
        );
        if (existing.length > 0) return res.status(400).json({ message: 'Ese email ya está en uso' });

        let query = 'UPDATE users SET name=?, email=?, phone=?, company_name=?, avatar_url=?, language=?, timezone=?';
        const params = [
            name, email,
            phone        || null,
            company_name || null,
            avatar_url   || null,
            language     || 'es',
            timezone     || 'Europe/Madrid',
        ];

        if (password) {
            if (password.length < 6)
                return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });

            // FIX: verificar contraseña actual antes de permitir el cambio
            if (!current_password)
                return res.status(400).json({ message: 'Debes introducir tu contraseña actual para cambiarla' });

            const [[userRow]] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
            const valid = await bcrypt.compare(current_password, userRow.password);
            if (!valid)
                return res.status(401).json({ message: 'La contraseña actual es incorrecta' });

            params.push(await bcrypt.hash(password, 12));
            query += ', password=?';
        }

        query += ' WHERE id=?';
        params.push(req.user.id);

        await pool.query(query, params);

        const [updated] = await pool.query(
            `SELECT id, name, email, role, company_name, avatar_url, phone, language, timezone, plan
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        res.json(updated[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Alias para retrocompatibilidad
export const updateMe = updateProfile;