import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

// REGISTRO
export const register = async (req, res) => {
    const { name, email, password } = req.body;

    // Validación básica de entrada
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Email no válido" });
    }

    try {
        // Comprobar si el email ya existe
        const [existing] = await pool.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: "Email ya registrado" });
        }

        // Hash contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // FIX: el role NUNCA viene del cliente, siempre se fuerza a 'user'
        const [result] = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')",
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: "Usuario registrado correctamente",
            userId: result.insertId,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// LOGIN
export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email y contraseña son obligatorios" });
    }

    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
            email,
        ]);

        if (rows.length === 0) {
            return res.status(401).json({ message: "Credenciales incorrectas" });
        }

        const user = rows[0];

        // Comprobar si la cuenta está activa
        if (user.status !== "active") {
            return res.status(403).json({ message: "Cuenta suspendida o inactiva" });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: "Credenciales incorrectas" });
        }

        // Actualizar last_login
        await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);

        // Crear tokens
        const accessToken = jwt.sign(
            { id: user.id, role: user.role },   // siempre incluir role
            process.env.JWT_SECRET,
            { expiresIn: "30m" }
        );

        const refreshToken = jwt.sign(
            { id: user.id, role: user.role },   // FIX: incluir role también aquí
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                company: user.company_name,
                avatar_url: user.avatar_url,
                role: user.role,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// REFRESH TOKEN
export const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token requerido" });
    }

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );

        // FIX: propagar el role al nuevo accessToken
        const newAccessToken = jwt.sign(
            { id: decoded.id, role: decoded.role },
            process.env.JWT_SECRET,
            { expiresIn: "30m" }
        );

        res.json({ accessToken: newAccessToken });

    } catch (error) {
        return res.status(403).json({ message: "Refresh token inválido" });
    }
};