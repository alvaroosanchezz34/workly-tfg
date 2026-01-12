import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

export const getMe = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateMe = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        let query = 'UPDATE users SET name = ?, email = ?';
        const params = [name, email];

        if (password) {
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
