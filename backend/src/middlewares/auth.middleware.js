import jwt  from 'jsonwebtoken';
import { pool } from '../config/db.js';

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Token requerido' });

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Leer plan y rol actuales desde la BD en cada petición
        // (el JWT puede estar desactualizado si el plan cambió después del login)
        const [[user]] = await pool.query(
            `SELECT id, name, email, role, plan, plan_status, company_id FROM users WHERE id = ? AND status != 'suspended'`,
            [decoded.id]
        );

        if (!user) return res.status(401).json({ message: 'Usuario no encontrado o suspendido' });

        req.user = {
            ...decoded,
            plan:        user.plan        || 'free',
            plan_status: user.plan_status || null,
            role:        user.role        || decoded.role,
            company_id:  user.company_id  || null,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expirado' });
        res.status(401).json({ message: 'Token inválido' });
    }
};