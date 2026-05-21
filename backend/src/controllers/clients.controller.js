import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';

// Crear cliente
export const createClient = async (req, res) => {
    const { name, email, phone, company, notes, document } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO clients 
      (user_id, name, email, phone, company, notes, document)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, name, email, phone, company, notes, document]
        );
        await logActivity({
            userId: req.user.id,
            entity: 'client',
            entityId: result.insertId,
            action: 'created',
        });
        res.status(201).json({
            message: 'Cliente creado',
            clientId: result.insertId,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener todos los clientes del usuario (NO borrados) — paginado
export const getClients = async (req, res) => {
    const { search } = req.query;
    const { page, pageSize, limit, offset } = getPagination(req.query);

    try {
        let where  = `WHERE user_id = ? AND is_deleted = 0`;
        const params = [req.user.id];

        if (search) {
            where += ` AND (name LIKE ? OR email LIKE ? OR company LIKE ?)`;
            const like = `%${search}%`;
            params.push(like, like, like);
        }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM clients ${where}`, params
        );

        const [rows] = await pool.query(
            `SELECT * FROM clients ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json(paginatedResponse(rows, total, page, pageSize));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener cliente por ID
export const getClientById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT *
       FROM clients
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
            [id, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Actualizar cliente
export const updateClient = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, company, notes, document } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE clients
       SET name = ?, email = ?, phone = ?, company = ?, notes = ?, document = ?
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
            [name, email, phone, company, notes, document, id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        await logActivity({
            userId: req.user.id,
            entity: 'client',
            entityId: id,
            action: 'updated',
        });
        res.json({ message: 'Cliente actualizado' });


    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Eliminar cliente (SOFT DELETE)
export const deleteClient = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            `UPDATE clients
       SET is_deleted = 1,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 0`,
            [req.user.id, id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        await logActivity({
            userId: req.user.id,
            entity: 'client',
            entityId: id,
            action: 'deleted',
        });

        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener clientes eliminados
export const getDeletedClients = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT *
       FROM clients
       WHERE user_id = ?
       AND is_deleted = 1
       ORDER BY deleted_at DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Restaurar cliente
export const restoreClient = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query(
            `UPDATE clients
       SET is_deleted = 0,
           deleted_at = NULL,
           deleted_by = NULL
       WHERE id = ?
       AND user_id = ?
       AND is_deleted = 1`,
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        await logActivity({
            userId: req.user.id,
            entity: 'client',
            entityId: id,
            action: 'restored',
        });

        res.json({ message: 'Cliente restaurado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Perfil de cliente (mini-CRM): client + kpis + facturas + proyectos
export const getClientProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const [[client]] = await pool.query(
            `SELECT * FROM clients WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            [id, req.user.id]
        );
        if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

        const [invoices] = await pool.query(
            `SELECT id, invoice_number, issue_date, due_date, status,
                    total_amount, paid_amount, payment_status
             FROM invoices
             WHERE client_id = ? AND user_id = ? AND is_deleted = 0
             ORDER BY issue_date DESC LIMIT 10`,
            [id, req.user.id]
        );

        const [projects] = await pool.query(
            `SELECT id, title, status, start_date, end_date, budget
             FROM projects
             WHERE client_id = ? AND user_id = ? AND is_deleted = 0
             ORDER BY created_at DESC`,
            [id, req.user.id]
        );

        // KPIs financieros
        const [[financial]] = await pool.query(
            `SELECT
                COALESCE(SUM(paid_amount), 0)                AS total_paid,
                COALESCE(SUM(CASE WHEN status IN ('sent','overdue')
                    THEN total_amount - paid_amount ELSE 0 END), 0) AS total_pending,
                COALESCE(SUM(CASE WHEN status = 'overdue'
                    THEN total_amount - paid_amount ELSE 0 END), 0) AS total_overdue,
                MAX(issue_date)                               AS last_invoice_date
             FROM invoices
             WHERE client_id = ? AND user_id = ? AND is_deleted = 0`,
            [id, req.user.id]
        );

        // KPIs de proyectos
        const [[projStats]] = await pool.query(
            `SELECT
                COUNT(*)                                             AS project_count,
                COALESCE(SUM(status = 'completed'), 0)               AS projects_completed
             FROM projects
             WHERE client_id = ? AND user_id = ? AND is_deleted = 0`,
            [id, req.user.id]
        );

        const kpis = {
            total_paid:          Number(financial.total_paid        || 0),
            total_pending:       Number(financial.total_pending      || 0),
            total_overdue:       Number(financial.total_overdue      || 0),
            last_invoice_date:   financial.last_invoice_date || null,
            project_count:       Number(projStats.project_count      || 0),
            projects_completed:  Number(projStats.projects_completed || 0),
        };

        res.json({ client, invoices, projects, kpis });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
