// backend/src/controllers/notifications.controller.js
import { pool } from '../config/db.js';
import { resourceScope } from '../utils/scope.js';

// Recalcula las notificaciones "vivas" del usuario a partir de los datos
// actuales (facturas vencidas / próximas a vencer, proyectos vencidos) y las
// sincroniza en BD: inserta las nuevas, refresca el texto de las existentes
// (sin tocar is_read) y borra las que ya no aplican (p.ej. factura pagada).
const regenerate = async (req) => {
    const userId = req.user.id;
    const scopeI = resourceScope(req, 'i');
    const scopeP = resourceScope(req, 'p');

    const [overdueInvoices] = await pool.query(
        `SELECT i.id, i.invoice_number, c.name AS client_name
         FROM invoices i JOIN clients c ON c.id = i.client_id
         WHERE ${scopeI.where} AND i.status = 'overdue' AND i.is_deleted = 0`,
        scopeI.params
    );
    const [dueSoonInvoices] = await pool.query(
        `SELECT i.id, i.invoice_number
         FROM invoices i
         WHERE ${scopeI.where} AND i.status = 'sent' AND i.is_deleted = 0
           AND i.due_date IS NOT NULL
           AND i.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`,
        scopeI.params
    );
    const [overdueProjects] = await pool.query(
        `SELECT p.id, p.title
         FROM projects p
         WHERE ${scopeP.where} AND p.is_deleted = 0
           AND p.status NOT IN ('completed','cancelled')
           AND p.end_date IS NOT NULL AND p.end_date < CURDATE()`,
        scopeP.params
    );

    const candidates = [
        ...overdueInvoices.map(inv => ({
            type: 'overdue', entity_type: 'invoice', entity_id: inv.id,
            title: 'Factura vencida', body: `${inv.invoice_number} — ${inv.client_name}`, link: '/invoices',
        })),
        ...dueSoonInvoices.map(inv => ({
            type: 'warning', entity_type: 'invoice', entity_id: inv.id,
            title: 'Factura vence pronto', body: inv.invoice_number, link: '/invoices',
        })),
        ...overdueProjects.map(p => ({
            type: 'overdue', entity_type: 'project', entity_id: p.id,
            title: 'Proyecto vencido', body: p.title, link: '/projects',
        })),
    ];

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Limpiar notificaciones de facturas/proyectos que dejaron de cumplir la condición
        // (p.ej. la factura se pagó, o el proyecto se marcó como completado). Se borra
        // por (tipo, entity_id) para no dejar restos al pasar de "próxima a vencer" a "vencida".
        const deleteStale = async (entityType, type, liveIds) => {
            if (liveIds.length > 0) {
                await conn.query(
                    `DELETE FROM notifications WHERE user_id=? AND entity_type=? AND type=? AND entity_id NOT IN (?)`,
                    [userId, entityType, type, liveIds]
                );
            } else {
                await conn.query(
                    `DELETE FROM notifications WHERE user_id=? AND entity_type=? AND type=?`,
                    [userId, entityType, type]
                );
            }
        };
        await deleteStale('invoice', 'overdue', overdueInvoices.map(i => i.id));
        await deleteStale('invoice', 'warning', dueSoonInvoices.map(i => i.id));
        await deleteStale('project', 'overdue', overdueProjects.map(p => p.id));

        for (const c of candidates) {
            await conn.query(
                `INSERT INTO notifications (user_id, type, entity_type, entity_id, title, body, link)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE title = VALUES(title), body = VALUES(body), link = VALUES(link)`,
                [userId, c.type, c.entity_type, c.entity_id, c.title, c.body, c.link]
            );
        }

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// GET /api/notifications
export const getNotifications = async (req, res) => {
    try {
        await regenerate(req);
        const [rows] = await pool.query(
            `SELECT id, type, entity_type, entity_id, title, body, link, is_read, created_at
             FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/notifications/:id/read
export const markRead = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query(
            `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Notificación no encontrada' });
        res.json({ message: 'Notificación marcada como leída' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/notifications/read-all
export const markAllRead = async (req, res) => {
    try {
        await pool.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, [req.user.id]);
        res.json({ message: 'Notificaciones marcadas como leídas' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
