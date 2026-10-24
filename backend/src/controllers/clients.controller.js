import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import { resourceScope } from '../utils/scope.js';
import { getLimit } from '../config/plans.js';

// Crear cliente
export const createClient = async (req, res) => {
    const { name, email, phone, company, notes, document, address } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO clients
      (user_id, company_id, name, email, phone, company, notes, document, address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, req.user.company_id || null, name, email, phone, company, notes, document, address || null]
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
        const scope  = resourceScope(req);
        let where    = `WHERE ${scope.where} AND is_deleted = 0`;
        const params = [...scope.params];

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
        const scope = resourceScope(req);
        const [rows] = await pool.query(
            `SELECT *
       FROM clients
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 0`,
            [id, ...scope.params]
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
    const { name, email, phone, company, notes, document, address } = req.body;

    try {
        const scope = resourceScope(req);
        const [result] = await pool.query(
            `UPDATE clients
       SET name = ?, email = ?, phone = ?, company = ?, notes = ?, document = ?, address = ?
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 0`,
            [name, email, phone, company, notes, document, address || null, id, ...scope.params]
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

const countIssuedInvoices = async (clientId, scope) => {
    const [[{ n }]] = await pool.query(
        `SELECT COUNT(*) AS n FROM invoices
         WHERE client_id = ? AND ${scope.where} AND is_deleted = 0 AND status <> 'draft'`,
        [clientId, ...scope.params]
    );
    return Number(n || 0);
};

// Eliminar cliente (SOFT DELETE). Si ya hay facturas emitidas, se conserva.
export const deleteClient = async (req, res) => {
    const { id } = req.params;

    try {
        const scope = resourceScope(req);
        const issued = await countIssuedInvoices(id, scope);
        if (issued > 0) {
            return res.status(409).json({
                message: 'Este cliente tiene facturas emitidas. No se puede eliminar: hay que conservar sus datos.',
            });
        }
        const [result] = await pool.query(
            `UPDATE clients
       SET is_deleted = 1,
           deleted_at = NOW(),
           deleted_by = ?
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 0`,
            [req.user.id, id, ...scope.params]
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

// Eliminar varios clientes a la vez (SOFT DELETE)
export const bulkDeleteClients = async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Selecciona al menos un cliente' });
    if (ids.length > 200) return res.status(400).json({ message: 'Máximo 200 clientes por operación' });

    try {
        const scope = resourceScope(req);
        let deleted = 0;
        let blocked = 0;
        for (const id of ids) {
            const issued = await countIssuedInvoices(id, scope);
            if (issued > 0) { blocked++; continue; }
            const [result] = await pool.query(
                `UPDATE clients SET is_deleted=1, deleted_at=NOW(), deleted_by=? WHERE id=? AND ${scope.where} AND is_deleted=0`,
                [req.user.id, id, ...scope.params]
            );
            if (result.affectedRows > 0) {
                await logActivity({ userId: req.user.id, entity: 'client', entityId: id, action: 'deleted' });
                deleted++;
            }
        }
        const skipped = ids.length - deleted;
        res.json({
            message: `${deleted} cliente(s) eliminado(s)` + (blocked ? `, ${blocked} conservado(s) por tener facturas emitidas` : ''),
            deleted,
            skipped,
            blocked,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener clientes eliminados
export const getDeletedClients = async (req, res) => {
    try {
        const scope = resourceScope(req);
        const [rows] = await pool.query(
            `SELECT *
       FROM clients
       WHERE ${scope.where}
       AND is_deleted = 1
       ORDER BY deleted_at DESC`,
            scope.params
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
        const scope = resourceScope(req);
        const [result] = await pool.query(
            `UPDATE clients
       SET is_deleted = 0,
           deleted_at = NULL,
           deleted_by = NULL
       WHERE id = ?
       AND ${scope.where}
       AND is_deleted = 1`,
            [id, ...scope.params]
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
        const scope = resourceScope(req);
        const [[client]] = await pool.query(
            `SELECT * FROM clients WHERE id = ? AND ${scope.where} AND is_deleted = 0`,
            [id, ...scope.params]
        );
        if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });

        const [invoices] = await pool.query(
            `SELECT id, invoice_number, issue_date, due_date, status,
                    total_amount, paid_amount, payment_status
             FROM invoices
             WHERE client_id = ? AND ${scope.where} AND is_deleted = 0
             ORDER BY issue_date DESC LIMIT 10`,
            [id, ...scope.params]
        );

        const [projects] = await pool.query(
            `SELECT id, title, status, start_date, end_date, budget
             FROM projects
             WHERE client_id = ? AND ${scope.where} AND is_deleted = 0
             ORDER BY created_at DESC`,
            [id, ...scope.params]
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
             WHERE client_id = ? AND ${scope.where} AND is_deleted = 0`,
            [id, ...scope.params]
        );

        // KPIs de proyectos
        const [[projStats]] = await pool.query(
            `SELECT
                COUNT(*)                                             AS project_count,
                COALESCE(SUM(status = 'completed'), 0)               AS projects_completed
             FROM projects
             WHERE client_id = ? AND ${scope.where} AND is_deleted = 0`,
            [id, ...scope.params]
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

// Importar clientes desde CSV (ya parseado a objetos por el frontend)
// body: { rows: [{ name, email, phone, company, document, notes }, ...] }
export const importClients = async (req, res) => {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: 'No hay filas para importar' });
    if (rows.length > 500) return res.status(400).json({ message: 'Máximo 500 filas por importación' });

    try {
        const limit = getLimit(req.user, 'clients');
        let allowed = rows;
        let overLimit = 0;
        if (limit !== -1) {
            const [[{ cnt }]] = await pool.query(
                `SELECT COUNT(*) AS cnt FROM clients WHERE user_id = ? AND is_deleted = 0`, [req.user.id]
            );
            const remaining = Math.max(0, limit - cnt);
            allowed = rows.slice(0, remaining);
            overLimit = rows.length - allowed.length;
        }

        let imported = 0, invalid = 0;
        for (const row of allowed) {
            const name = (row.name || row.nombre || '').trim();
            if (!name) { invalid++; continue; }
            await pool.query(
                `INSERT INTO clients (user_id, company_id, name, email, phone, company, notes, document, address)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [req.user.id, req.user.company_id || null, name,
                 row.email || null, row.phone || row.telefono || null, row.company || row.empresa || null,
                 row.notes || row.notas || null, row.document || row.dni || row.nif || null,
                 row.address || row.direccion || row.domicilio || null]
            );
            imported++;
        }

        res.status(201).json({
            message: `${imported} cliente(s) importado(s)` +
                (invalid ? `, ${invalid} fila(s) sin nombre omitida(s)` : '') +
                (overLimit ? `, ${overLimit} fila(s) omitida(s) por el límite del plan Free` : ''),
            imported, invalid, overLimit,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
