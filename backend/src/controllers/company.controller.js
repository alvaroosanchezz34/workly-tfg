// backend/src/controllers/company.controller.js
import { pool } from '../config/db.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// ── Crear empresa ─────────────────────────────────────────
export const createCompany = async (req, res) => {
    const { name, tax_id, address, email, phone, website } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Generar slug único
        let slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 80);
        const [[exists]] = await conn.query(`SELECT id FROM companies WHERE slug = ?`, [slug]);
        if (exists) slug = `${slug}-${Date.now()}`;

        const [result] = await conn.query(
            `INSERT INTO companies (name, slug, tax_id, address, email, phone, website, owner_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, slug, tax_id || null, address || null, email || null, phone || null, website || null, req.user.id]
        );
        const companyId = result.insertId;

        // El creador pasa a ser admin de la empresa
        await conn.query(
            `INSERT INTO company_members (company_id, user_id, role, status, joined_at)
             VALUES (?, ?, 'admin', 'active', NOW())`,
            [companyId, req.user.id]
        );

        // Actualizar company_id y role del usuario
        await conn.query(
            `UPDATE users SET company_id = ?, role = 'company_admin' WHERE id = ?`,
            [companyId, req.user.id]
        );

        await conn.commit();
        res.status(201).json({ message: 'Empresa creada', companyId, slug });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// ── Obtener empresa propia ────────────────────────────────
export const getMyCompany = async (req, res) => {
    if (!req.company) return res.status(404).json({ message: 'No perteneces a ninguna empresa' });
    try {
        const [[company]] = await pool.query(
            `SELECT c.*, u.name AS owner_name,
                    (SELECT COUNT(*) FROM company_members WHERE company_id = c.id AND status = 'active') AS member_count
             FROM companies c
             JOIN users u ON u.id = c.owner_id
             WHERE c.id = ?`,
            [req.company.id]
        );
        res.json(company);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Actualizar empresa ────────────────────────────────────
export const updateCompany = async (req, res) => {
    if (!req.company) return res.status(404).json({ message: 'Sin empresa' });
    const { name, tax_id, address, email, phone, website, logo_url } = req.body;
    try {
        await pool.query(
            `UPDATE companies SET name=?, tax_id=?, address=?, email=?, phone=?, website=?, logo_url=?
             WHERE id=?`,
            [name, tax_id || null, address || null, email || null, phone || null, website || null, logo_url || null, req.company.id]
        );
        res.json({ message: 'Empresa actualizada' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Listar miembros del equipo ────────────────────────────
export const getTeamMembers = async (req, res) => {
    if (!req.company) return res.json([]);
    try {
        const [rows] = await pool.query(
            `SELECT cm.id AS member_id, cm.role AS company_role, cm.status AS member_status,
                    cm.invited_at, cm.joined_at,
                    u.id, u.name, u.email, u.avatar_url, u.phone, u.last_login, u.status AS user_status
             FROM company_members cm
             JOIN users u ON u.id = cm.user_id
             WHERE cm.company_id = ?
             ORDER BY cm.role ASC, u.name ASC`,
            [req.company.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Invitar técnico (crea usuario + membresía pendiente) ──
export const inviteMember = async (req, res) => {
    const { name, email, role = 'technician' } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Nombre y email son obligatorios' });
    if (!req.company)    return res.status(400).json({ message: 'Sin empresa activa' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Comprobar si el email ya existe
        let [[user]] = await conn.query(`SELECT id FROM users WHERE email = ?`, [email]);

        if (!user) {
            // Crear usuario con contraseña temporal
            const tempPassword = crypto.randomBytes(8).toString('hex');
            const hashed = await bcrypt.hash(tempPassword, 10);
            const [result] = await conn.query(
                `INSERT INTO users (name, email, password, role, company_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [name, email, hashed, role === 'admin' ? 'company_admin' : 'technician', req.company.id]
            );
            user = { id: result.insertId, tempPassword };
        }

        // Comprobar que no sea ya miembro
        const [[existing]] = await conn.query(
            `SELECT id FROM company_members WHERE company_id = ? AND user_id = ?`,
            [req.company.id, user.id]
        );
        if (existing) {
            await conn.rollback();
            return res.status(400).json({ message: 'Este usuario ya es miembro del equipo' });
        }

        const inviteToken = crypto.randomBytes(32).toString('hex');
        await conn.query(
            `INSERT INTO company_members (company_id, user_id, role, status, invite_token)
             VALUES (?, ?, ?, 'invited', ?)`,
            [req.company.id, user.id, role, inviteToken]
        );

        await conn.commit();
        res.status(201).json({
            message: 'Miembro invitado',
            userId: user.id,
            inviteToken,
            tempPassword: user.tempPassword || null, // Solo en usuarios nuevos
        });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// ── Aceptar invitación ────────────────────────────────────
export const acceptInvite = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [[member]] = await conn.query(
            `SELECT cm.*, c.name AS company_name FROM company_members cm
             JOIN companies c ON c.id = cm.company_id
             WHERE cm.invite_token = ? AND cm.status = 'invited'`,
            [token]
        );
        if (!member) return res.status(404).json({ message: 'Invitación no válida o ya aceptada' });

        // Si manda contraseña nueva, actualizarla
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await conn.query(`UPDATE users SET password = ? WHERE id = ?`, [hashed, member.user_id]);
        }

        await conn.query(
            `UPDATE company_members SET status='active', joined_at=NOW(), invite_token=NULL WHERE id=?`,
            [member.id]
        );
        await conn.query(
            `UPDATE users SET company_id=?, role=? WHERE id=?`,
            [member.company_id, member.role === 'admin' ? 'company_admin' : 'technician', member.user_id]
        );

        await conn.commit();
        res.json({ message: `Te has unido a ${member.company_name}` });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// ── Cambiar rol de un miembro ─────────────────────────────
export const updateMemberRole = async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    if (!['admin', 'technician'].includes(role))
        return res.status(400).json({ message: 'Rol no válido' });
    if (!req.company) return res.status(400).json({ message: 'Sin empresa' });

    try {
        await pool.query(
            `UPDATE company_members SET role = ? WHERE company_id = ? AND user_id = ?`,
            [role, req.company.id, userId]
        );
        await pool.query(
            `UPDATE users SET role = ? WHERE id = ?`,
            [role === 'admin' ? 'company_admin' : 'technician', userId]
        );
        res.json({ message: 'Rol actualizado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Suspender / reactivar miembro ─────────────────────────
export const updateMemberStatus = async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status))
        return res.status(400).json({ message: 'Estado no válido' });
    if (!req.company) return res.status(400).json({ message: 'Sin empresa' });

    // No puede suspenderse a sí mismo
    if (Number(userId) === req.user.id)
        return res.status(400).json({ message: 'No puedes suspender tu propia cuenta' });

    try {
        await pool.query(
            `UPDATE company_members SET status = ? WHERE company_id = ? AND user_id = ?`,
            [status, req.company.id, userId]
        );
        await pool.query(
            `UPDATE users SET status = ? WHERE id = ?`,
            [status, userId]
        );
        res.json({ message: `Miembro ${status === 'active' ? 'reactivado' : 'suspendido'}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Eliminar miembro del equipo ───────────────────────────
export const removeMember = async (req, res) => {
    const { userId } = req.params;
    if (!req.company) return res.status(400).json({ message: 'Sin empresa' });
    if (Number(userId) === req.user.id)
        return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });

    try {
        await pool.query(
            `DELETE FROM company_members WHERE company_id = ? AND user_id = ?`,
            [req.company.id, userId]
        );
        await pool.query(
            `UPDATE users SET company_id = NULL, role = 'user' WHERE id = ?`,
            [userId]
        );
        res.json({ message: 'Miembro eliminado del equipo' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Dashboard consolidado para admin ─────────────────────
export const getTeamDashboard = async (req, res) => {
    if (!req.company) return res.status(404).json({ message: 'Sin empresa' });
    const companyId = req.company.id;

    try {
        // Métricas por técnico
        const [byMember] = await pool.query(
            `SELECT u.id, u.name, u.avatar_url,
                    COUNT(DISTINCT c.id)  AS clients,
                    COUNT(DISTINCT p.id)  AS projects,
                    COUNT(DISTINCT i.id)  AS invoices,
                    COALESCE(SUM(i.total_amount), 0) AS invoiced
             FROM company_members cm
             JOIN users u ON u.id = cm.user_id
             LEFT JOIN clients  c ON c.user_id = u.id AND c.company_id = ? AND c.is_deleted = 0
             LEFT JOIN projects p ON p.user_id = u.id AND p.company_id = ? AND p.is_deleted = 0
             LEFT JOIN invoices i ON i.user_id = u.id AND i.company_id = ? AND i.is_deleted = 0
             WHERE cm.company_id = ? AND cm.status = 'active'
             GROUP BY u.id, u.name, u.avatar_url
             ORDER BY invoiced DESC`,
            [companyId, companyId, companyId, companyId]
        );

        // Totales globales
        const [[totals]] = await pool.query(
            `SELECT
               COUNT(DISTINCT c.id)  AS total_clients,
               COUNT(DISTINCT p.id)  AS total_projects,
               COUNT(DISTINCT i.id)  AS total_invoices,
               COALESCE(SUM(i.total_amount), 0)    AS total_invoiced,
               COALESCE(SUM(e.amount), 0)           AS total_expenses
             FROM companies co
             LEFT JOIN clients  c ON c.company_id = co.id AND c.is_deleted = 0
             LEFT JOIN projects p ON p.company_id = co.id AND p.is_deleted = 0
             LEFT JOIN invoices i ON i.company_id = co.id AND i.is_deleted = 0 AND i.status != 'draft'
             LEFT JOIN expenses e ON e.company_id = co.id AND e.is_deleted = 0
             WHERE co.id = ?`,
            [companyId]
        );

        // Facturas pendientes de cobro
        const [[pending]] = await pool.query(
            `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS pending_amount
             FROM invoices
             WHERE company_id = ? AND is_deleted = 0 AND status IN ('sent','overdue')`,
            [companyId]
        );

        res.json({ byMember, totals, pending_amount: pending.pending_amount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Asignar cliente a técnico ─────────────────────────────
export const assignClient = async (req, res) => {
    const { clientId } = req.params;
    const { userId } = req.body;
    if (!req.company) return res.status(400).json({ message: 'Sin empresa' });

    try {
        // Verificar que el técnico pertenece a la empresa
        const [[member]] = await pool.query(
            `SELECT id FROM company_members WHERE company_id = ? AND user_id = ? AND status = 'active'`,
            [req.company.id, userId]
        );
        if (!member) return res.status(400).json({ message: 'El usuario no pertenece a la empresa' });

        await pool.query(
            `UPDATE clients SET assigned_to = ? WHERE id = ? AND company_id = ?`,
            [userId, clientId, req.company.id]
        );
        res.json({ message: 'Cliente asignado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Asignar proyecto a técnico ────────────────────────────
export const assignProject = async (req, res) => {
    const { projectId } = req.params;
    const { userId } = req.body;
    if (!req.company) return res.status(400).json({ message: 'Sin empresa' });

    try {
        const [[member]] = await pool.query(
            `SELECT id FROM company_members WHERE company_id = ? AND user_id = ? AND status = 'active'`,
            [req.company.id, userId]
        );
        if (!member) return res.status(400).json({ message: 'El usuario no pertenece a la empresa' });

        await pool.query(
            `UPDATE projects SET assigned_to = ? WHERE id = ? AND company_id = ?`,
            [userId, projectId, req.company.id]
        );
        res.json({ message: 'Proyecto asignado' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};