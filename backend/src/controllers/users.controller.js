import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

// FIX: devolver todos los campos que el frontend necesita (company_name, avatar_url, phone)
export const getMe = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, email, role, company_name, avatar_url, phone, plan, created_at
             FROM users
             WHERE id = ?`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateMe = async (req, res) => {
    const { name, email, password, phone, company_name } = req.body;

    // Validación básica
    if (!name || !email) {
        return res.status(400).json({ message: 'Nombre y email son obligatorios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Email no válido' });
    }

    try {
        // Comprobar que el nuevo email no esté en uso por otro usuario
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, req.user.id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Ese email ya está en uso' });
        }

        let query = 'UPDATE users SET name = ?, email = ?, phone = ?, company_name = ?';
        const params = [name, email, phone || null, company_name || null];

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
            }
            const hashed = await bcrypt.hash(password, 10);
            query += ', password = ?';
            params.push(hashed);
        }

        query += ' WHERE id = ?';
        params.push(req.user.id);

        await pool.query(query, params);

        res.json({ message: 'Perfil actualizado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};