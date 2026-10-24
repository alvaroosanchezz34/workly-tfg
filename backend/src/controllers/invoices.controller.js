import { pool } from '../config/db.js';
import { generateInvoicePDF, generateInvoicePDFBuffer } from '../services/pdf.service.js';
import { sendInvoiceEmail } from '../services/email.service.js';
import { logActivity } from '../utils/activityLogger.js';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { getPagination, paginatedResponse } from '../utils/paginate.js';
import { resourceScope } from '../utils/scope.js';
import { priceItems } from '../services/invoicing/totals.js';
import { issuerKeyFor } from '../services/invoicing/numbering.js';
import { appendInvoiceEvent } from '../services/invoicing/invoiceEvents.js';
import { insertLines, saveInvoiceTotals } from '../services/invoicing/persistLines.js';

const httpError = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const qrBufferFor = async invoice => {
    if (!invoice?.verifactu_qr_url) return null;
    return QRCode.toBuffer(invoice.verifactu_qr_url, { errorCorrectionLevel: 'M', margin: 1, width: 300 });
};

export const createInvoice = async (req, res) => {
    const { client_id, project_id, issue_date, due_date, notes, items, irpf_rate, invoice_kind } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const kind = invoice_kind === 'simplified' ? 'simplified' : 'complete';
        const priced = priceItems(items, irpf_rate);
        const scope = resourceScope(req);
        const [client] = await conn.query(`SELECT id FROM clients WHERE id=? AND ${scope.where} AND is_deleted=0`, [client_id, ...scope.params]);
        if (client.length === 0) throw httpError(400, 'Cliente no válido');
        const publicToken = crypto.randomBytes(32).toString('hex');
        const issuerKey = issuerKeyFor(req.user);
        const [result] = await conn.query(
            `INSERT INTO invoices
               (user_id, company_id, client_id, project_id, issuer_key, invoice_number,
                issue_date, due_date, status, notes, public_token, invoice_kind, irpf_rate)
             VALUES (?,?,?,?,?,?,?,?, 'draft', ?, ?, ?, ?)`,
            [req.user.id, req.user.company_id || null, client_id, project_id || null, issuerKey, null,
             issue_date, due_date || issue_date, notes || null, publicToken, kind, priced.totals.irpf_rate]
        );
        const invoiceId = result.insertId;
        await insertLines(conn, invoiceId, priced.lines);
        await saveInvoiceTotals(conn, invoiceId, priced.totals);
        await appendInvoiceEvent(conn, {
            invoiceId, issuerKey, userId: req.user.id, action: 'draft_created', payload: { invoice_kind: kind },
        });
        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: invoiceId, action: 'created' });
        await conn.commit();
        res.status(201).json({ message: 'Borrador creado', invoiceId, invoice_number: null, public_token: publicToken });
    } catch (err) { await conn.rollback(); res.status(err.statusCode || 400).json({ message: err.message }); }
    finally { conn.release(); }
};

export const updateInvoice = async (req, res) => {
    const { id } = req.params;
    const { client_id, project_id, issue_date, due_date, notes, items, irpf_rate, invoice_kind } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const scope = resourceScope(req);
        const [[invoice]] = await conn.query(`SELECT id, status, issuer_key FROM invoices WHERE id=? AND ${scope.where} AND is_deleted=0 FOR UPDATE`, [id, ...scope.params]);
        if (!invoice) {
            await conn.rollback();
            return res.status(404).json({ message: 'Factura no encontrada' });
        }
        if (invoice.status !== 'draft') {
            await conn.rollback();
            return res.status(409).json({ message: 'La factura emitida no se puede modificar. Crea una rectificativa o anúlala.' });
        }
        const kind = invoice_kind === 'simplified' ? 'simplified' : (invoice_kind === 'complete' ? 'complete' : undefined);
        const priced = priceItems(items, irpf_rate);
        await conn.query(
            `UPDATE invoices SET client_id=?, project_id=?, issue_date=?, due_date=?, notes=?, irpf_rate=? ${kind ? ', invoice_kind=?' : ''} WHERE id=?`,
            kind
                ? [client_id, project_id || null, issue_date, due_date || issue_date, notes || null, priced.totals.irpf_rate, kind, id]
                : [client_id, project_id || null, issue_date, due_date || issue_date, notes || null, priced.totals.irpf_rate, id]
        );
        await conn.query(`UPDATE invoice_items SET is_deleted=1 WHERE invoice_id=?`, [id]);
        await insertLines(conn, id, priced.lines);
        await saveInvoiceTotals(conn, id, priced.totals);
        await appendInvoiceEvent(conn, {
            invoiceId: id, issuerKey: invoice.issuer_key, userId: req.user.id, action: 'draft_updated',
        });
        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: id, action: 'updated' });
        await conn.commit();
        res.json({ message: 'Factura actualizada' });
    } catch (err) { await conn.rollback(); res.status(err.statusCode || 500).json({ message: err.message }); }
    finally { conn.release(); }
};

export const getInvoices = async (req, res) => {
    const { status, client_id, date_from, date_to, min_amount, max_amount, search } = req.query;
    const { page, pageSize, limit, offset } = getPagination(req.query);
    try {
        // El marcado de facturas vencidas lo gestiona el scheduler diario (09:00)
        // No se hace aquí para evitar latencia extra y escrituras en cada lectura
        const scope  = resourceScope(req, 'i');
        let where    = `${scope.where} AND i.is_deleted=0 AND c.is_deleted=0`;
        const params = [...scope.params];
        if (status) { where += ` AND i.status=?`; params.push(status); }
        if (client_id) { where += ` AND i.client_id=?`; params.push(client_id); }
        if (date_from) { where += ` AND i.issue_date>=?`; params.push(date_from); }
        if (date_to) { where += ` AND i.issue_date<=?`; params.push(date_to); }
        if (min_amount) { where += ` AND i.total_amount>=?`; params.push(min_amount); }
        if (max_amount) { where += ` AND i.total_amount<=?`; params.push(max_amount); }
        if (search)     { where += ` AND (i.invoice_number LIKE ? OR c.name LIKE ?)`; const like = `%${search}%`; params.push(like, like); }

        const [[{ total }]] = await pool.query(
            `SELECT COUNT(*) AS total FROM invoices i JOIN clients c ON c.id=i.client_id WHERE ${where}`,
            params
        );
        const [rows] = await pool.query(
            `SELECT i.*, c.name AS client_name, (i.total_amount - i.paid_amount) AS pending_amount
             FROM invoices i JOIN clients c ON c.id=i.client_id
             WHERE ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        res.json(paginatedResponse(rows, total, page, pageSize));
    } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getInvoiceById = async (req, res) => {
    const { id } = req.params;
    try {
        const scope = resourceScope(req, 'i');
        const [[invoice]] = await pool.query(
            `SELECT i.*, c.name AS client_name, c.email AS client_email, c.company AS client_company, c.document AS client_document, c.address AS client_address FROM invoices i JOIN clients c ON c.id=i.client_id WHERE i.id=? AND ${scope.where} AND i.is_deleted=0`, [id, ...scope.params]);
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        const [items] = await pool.query(`SELECT * FROM invoice_items WHERE invoice_id=? AND is_deleted=0`, [id]);
        const [payments] = await pool.query(`SELECT * FROM invoice_payments WHERE invoice_id=? ORDER BY payment_date DESC`, [id]);
        res.json({ ...invoice, items, payments });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

export const softDeleteInvoice = async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const scope = resourceScope(req);
        const [[invoice]] = await conn.query(`SELECT status, issuer_key FROM invoices WHERE id=? AND ${scope.where} AND is_deleted=0 FOR UPDATE`, [id, ...scope.params]);
        if (!invoice) {
            await conn.rollback();
            return res.status(404).json({ message: 'Factura no encontrada' });
        }
        if (invoice.status !== 'draft') {
            await conn.rollback();
            return res.status(409).json({ message: 'Solo se pueden eliminar borradores. La factura emitida se anula, no se borra.' });
        }
        await conn.query(`UPDATE invoices SET is_deleted=1, deleted_at=NOW(), deleted_by=? WHERE id=?`, [req.user.id, id]);
        await conn.query(`UPDATE invoice_items SET is_deleted=1 WHERE invoice_id=?`, [id]);
        await appendInvoiceEvent(conn, {
            invoiceId: id, issuerKey: invoice.issuer_key, userId: req.user.id, action: 'draft_deleted',
        });
        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: id, action: 'deleted' });
        await conn.commit();
        res.json({ message: 'Factura eliminada' });
    } catch (err) { await conn.rollback(); res.status(500).json({ message: err.message }); }
    finally { conn.release(); }
};

// POST /api/invoices/bulk-delete  body: { ids: [1,2,3] }
export const bulkDeleteInvoices = async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Selecciona al menos una factura' });
    if (ids.length > 200) return res.status(400).json({ message: 'Máximo 200 facturas por operación' });

    const scope = resourceScope(req);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        let deleted = 0, skipped = 0;
        for (const id of ids) {
            const [[invoice]] = await conn.query(`SELECT status, issuer_key FROM invoices WHERE id=? AND ${scope.where} AND is_deleted=0`, [id, ...scope.params]);
            if (!invoice || invoice.status !== 'draft') { skipped++; continue; }
            await conn.query(`UPDATE invoices SET is_deleted=1, deleted_at=NOW(), deleted_by=? WHERE id=?`, [req.user.id, id]);
            await conn.query(`UPDATE invoice_items SET is_deleted=1 WHERE invoice_id=?`, [id]);
            await appendInvoiceEvent(conn, {
                invoiceId: id, issuerKey: invoice.issuer_key, userId: req.user.id, action: 'draft_deleted',
            });
            await logActivity({ userId: req.user.id, entity: 'invoice', entityId: id, action: 'deleted' });
            deleted++;
        }
        await conn.commit();
        res.json({
            message: `${deleted} factura(s) eliminada(s)` + (skipped ? `, ${skipped} omitida(s) (emitidas o no encontradas)` : ''),
            deleted, skipped,
        });
    } catch (err) { await conn.rollback(); res.status(500).json({ message: err.message }); }
    finally { conn.release(); }
};

// POST /api/invoices/bulk-status  body: { ids: [1,2,3], status: 'sent' }
export const bulkUpdateInvoiceStatus = async (req, res) => {
    const { ids, status } = req.body;
    if (!['draft', 'sent', 'paid', 'overdue'].includes(status)) return res.status(400).json({ message: 'Estado no válido' });
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Selecciona al menos una factura' });
    if (ids.length > 200) return res.status(400).json({ message: 'Máximo 200 facturas por operación' });

    const scope = resourceScope(req);
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        let updated = 0, skipped = 0;
        for (const id of ids) {
            const [[inv]] = await conn.query(`SELECT status, total_amount, paid_amount, issuer_key FROM invoices WHERE id=? AND ${scope.where} AND is_deleted=0`, [id, ...scope.params]);
            if (!inv || inv.status === 'draft' || inv.status === 'void' || status === 'draft' || status === 'void') { skipped++; continue; }

            if (status === 'paid') {
                await conn.query(
                    `UPDATE invoices SET status=?, paid_amount=total_amount, payment_status='paid', paid_at=NOW() WHERE id=?`,
                    [status, id]
                );
            } else {
                const total = Number(inv.total_amount) || 0;
                const paid  = Number(inv.paid_amount) || 0;
                const paymentStatus = paid <= 0 ? 'unpaid' : paid >= total ? 'paid' : 'partial';
                await conn.query(`UPDATE invoices SET status=?, payment_status=? WHERE id=?`, [status, paymentStatus, id]);
            }
            await appendInvoiceEvent(conn, {
                invoiceId: id, issuerKey: inv.issuer_key, userId: req.user.id,
                action: 'collection_status_changed', payload: { status },
            });
            updated++;
        }
        await conn.commit();
        res.json({ message: `${updated} factura(s) actualizada(s)` + (skipped ? `, ${skipped} omitida(s)` : ''), updated, skipped });
    } catch (err) { await conn.rollback(); res.status(500).json({ message: err.message }); }
    finally { conn.release(); }
};

export const updateInvoiceStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['sent', 'paid', 'overdue'].includes(status)) {
        return res.status(400).json({
            message: status === 'draft'
                ? 'Una factura emitida no vuelve a borrador. Si era un error, anúlala o crea una rectificativa.'
                : 'Estado no válido',
        });
    }
    try {
        const scope = resourceScope(req);
        const [[inv]] = await pool.query(
            `SELECT status, total_amount, paid_amount, issuer_key FROM invoices WHERE id=? AND ${scope.where} AND is_deleted=0`,
            [id, ...scope.params]
        );
        if (!inv) return res.status(404).json({ message: 'Factura no encontrada' });
        if (inv.status === 'draft') return res.status(400).json({ message: 'Emite la factura antes de cambiar su estado' });
        if (inv.status === 'void') return res.status(409).json({ message: 'Una factura anulada no cambia de estado' });

        if (status === 'paid') {
            await pool.query(
                `UPDATE invoices SET status=?, paid_amount=total_amount, payment_status='paid', paid_at=NOW() WHERE id=?`,
                [status, id]
            );
        } else {
            const total = Number(inv.total_amount) || 0;
            const paid  = Number(inv.paid_amount) || 0;
            const paymentStatus = paid <= 0 ? 'unpaid' : paid >= total ? 'paid' : 'partial';
            await pool.query(`UPDATE invoices SET status=?, payment_status=? WHERE id=?`, [status, paymentStatus, id]);
        }
        await appendInvoiceEvent(pool, {
            invoiceId: id, issuerKey: inv.issuer_key, userId: req.user.id,
            action: 'collection_status_changed', payload: { status },
        });
        res.json({ message: 'Estado actualizado' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

export const addPayment = async (req, res) => {
    const { id } = req.params;
    const { amount, payment_date, method, reference, notes } = req.body;
    if (!(Number(amount) > 0)) return res.status(400).json({ message: 'El importe debe ser mayor que 0' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const scope = resourceScope(req);
        const [[invoice]] = await conn.query(`SELECT id, status, issuer_key, total_amount, paid_amount FROM invoices WHERE id=? AND ${scope.where} AND is_deleted=0`, [id, ...scope.params]);
        if (!invoice) {
            await conn.rollback();
            return res.status(404).json({ message: 'Factura no encontrada' });
        }
        if (invoice.status === 'void') {
            await conn.rollback();
            return res.status(409).json({ message: 'No se puede cobrar una factura anulada' });
        }
        const newPaid = Number(invoice.paid_amount) + Number(amount);
        const payStatus = newPaid >= Number(invoice.total_amount) ? 'paid' : 'partial';
        const nextStatus = invoice.status === 'draft'
            ? 'draft'
            : (payStatus === 'paid' ? 'paid' : (invoice.status === 'overdue' ? 'overdue' : 'sent'));
        await conn.query(`INSERT INTO invoice_payments (invoice_id, user_id, amount, payment_date, method, reference, notes) VALUES (?,?,?,?,?,?,?)`,
            [id, req.user.id, amount, payment_date, method || 'transfer', reference, notes]);
        await conn.query(`UPDATE invoices SET paid_amount=?, payment_status=?, status=?, paid_at=? WHERE id=?`,
            [newPaid, payStatus, nextStatus, payStatus === 'paid' && nextStatus !== 'draft' ? new Date() : null, id]);
        await appendInvoiceEvent(conn, {
            invoiceId: id, issuerKey: invoice.issuer_key, userId: req.user.id,
            action: 'payment_recorded', payload: { amount: Number(amount), payment_status: payStatus },
        });
        await conn.commit();
        res.status(201).json({ message: 'Pago registrado', paid_amount: newPaid, payment_status: payStatus });
    } catch (err) { await conn.rollback(); res.status(500).json({ message: err.message }); }
    finally { conn.release(); }
};

export const getPayments = async (req, res) => {
    const { id } = req.params;
    try {
        const scope = resourceScope(req, 'i');
        const [rows] = await pool.query(
            `SELECT p.* FROM invoice_payments p JOIN invoices i ON i.id=p.invoice_id WHERE p.invoice_id=? AND ${scope.where} ORDER BY p.payment_date DESC`,
            [id, ...scope.params]);
        res.json(rows);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deletePayment = async (req, res) => {
    const { id, paymentId } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const scope = resourceScope(req, 'i');
        const [[payment]] = await conn.query(
            `SELECT p.amount, i.status, i.issuer_key, i.paid_amount, i.total_amount
             FROM invoice_payments p JOIN invoices i ON i.id=p.invoice_id
             WHERE p.id=? AND p.invoice_id=? AND ${scope.where}`,
            [paymentId, id, ...scope.params]);
        if (!payment) {
            await conn.rollback();
            return res.status(404).json({ message: 'Pago no encontrado' });
        }
        if (payment.status === 'void') {
            await conn.rollback();
            return res.status(409).json({ message: 'No se puede quitar un cobro de una factura anulada' });
        }
        await conn.query(`DELETE FROM invoice_payments WHERE id=?`, [paymentId]);
        const newPaid = Math.max(0, Number(payment.paid_amount) - Number(payment.amount));
        const payStatus = newPaid === 0 ? 'unpaid' : newPaid >= Number(payment.total_amount) ? 'paid' : 'partial';
        const nextStatus = payment.status === 'draft'
            ? 'draft'
            : (payStatus === 'paid' ? 'paid' : (payment.status === 'overdue' ? 'overdue' : 'sent'));
        await conn.query(`UPDATE invoices SET paid_amount=?, payment_status=?, status=? WHERE id=?`, [newPaid, payStatus, nextStatus, id]);
        await appendInvoiceEvent(conn, {
            invoiceId: id, issuerKey: payment.issuer_key, userId: req.user.id,
            action: 'payment_removed', payload: { amount: Number(payment.amount), payment_status: payStatus },
        });
        await conn.commit();
        res.json({ message: 'Pago eliminado' });
    } catch (err) { await conn.rollback(); res.status(500).json({ message: err.message }); }
    finally { conn.release(); }
};

export const getInvoiceStats = async (req, res) => {
    const scope  = resourceScope(req);
    const scopeI = resourceScope(req, 'i');
    try {
        const [byMonth] = await pool.query(`SELECT DATE_FORMAT(issue_date,'%Y-%m') AS month, SUM(total_amount) AS total, COUNT(*) AS count FROM invoices WHERE ${scope.where} AND is_deleted=0 AND status!='draft' AND issue_date>=DATE_SUB(CURDATE(),INTERVAL 12 MONTH) GROUP BY month ORDER BY month ASC`, scope.params);
        const [topClients] = await pool.query(`SELECT c.name, SUM(i.total_amount) AS total, COUNT(*) AS invoices FROM invoices i JOIN clients c ON c.id=i.client_id WHERE ${scopeI.where} AND i.is_deleted=0 AND i.status='paid' GROUP BY c.id ORDER BY total DESC LIMIT 5`, scopeI.params);
        const [taxSummary] = await pool.query(`SELECT SUM(subtotal_amount) AS base_imponible, SUM(tax_amount) AS total_iva, SUM(total_amount) AS total_con_iva FROM invoices WHERE ${scope.where} AND is_deleted=0 AND status IN ('sent','paid') AND YEAR(issue_date)=YEAR(CURDATE())`, scope.params);
        const [byStatus] = await pool.query(`SELECT status, COUNT(*) AS count, SUM(total_amount) AS total FROM invoices WHERE ${scope.where} AND is_deleted=0 GROUP BY status`, scope.params);
        const [[avgDays]] = await pool.query(`SELECT AVG(DATEDIFF(paid_at,issue_date)) AS avg_days FROM invoices WHERE ${scope.where} AND is_deleted=0 AND payment_status='paid' AND paid_at IS NOT NULL`, scope.params);
        res.json({ byMonth, topClients, taxSummary: taxSummary[0], byStatus, avgDays: avgDays.avg_days });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getInvoiceSettings = async (req, res) => {
    try {
        let [rows] = await pool.query(`SELECT * FROM invoice_settings WHERE user_id=?`, [req.user.id]);
        if (rows.length === 0) {
            await pool.query(`INSERT INTO invoice_settings (user_id, prefix, next_number, padding, current_year) VALUES (?, 'FAC', 1, 4, ?)`, [req.user.id, new Date().getFullYear()]);
            [rows] = await pool.query(`SELECT * FROM invoice_settings WHERE user_id=?`, [req.user.id]);
        }
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateInvoiceSettings = async (req, res) => {
    const { prefix, padding, reset_yearly } = req.body;
    try {
        await pool.query(`UPDATE invoice_settings SET prefix=?, padding=?, reset_yearly=? WHERE user_id=?`, [prefix, padding, reset_yearly ? 1 : 0, req.user.id]);
        res.json({ message: 'Configuración guardada' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

export const downloadInvoicePDF = async (req, res) => {
    const { id } = req.params;
    try {
        const scope = resourceScope(req, 'i');
        const [[invoice]] = await pool.query(
            `SELECT i.*, u.name AS issuer_name, u.email AS issuer_email, u.company_name AS issuer_company FROM invoices i JOIN users u ON u.id=i.user_id WHERE i.id=? AND ${scope.where} AND i.is_deleted=0`,
            [id, ...scope.params]);
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        const [items] = await pool.query(`SELECT * FROM invoice_items WHERE invoice_id=? AND is_deleted=0`, [id]);
        const [[clientRow]] = await pool.query(`SELECT name, email, company, document, address FROM clients WHERE id=?`, [invoice.client_id]);
        const client = {
            name: invoice.customer_legal_name || clientRow?.name || 'Cliente',
            email: clientRow?.email || '',
            company: clientRow?.company || '',
            document: invoice.customer_tax_id || clientRow?.document || '',
            address: invoice.customer_fiscal_address || clientRow?.address || '',
        };
        const qrBuffer = await qrBufferFor(invoice);
        const filename = invoice.invoice_number ? `factura-${invoice.invoice_number}.pdf` : `borrador-${invoice.id}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/pdf');
        generateInvoicePDF(invoice, items, client, res, qrBuffer);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

export const sendInvoiceByEmail = async (req, res) => {
    const { id } = req.params;
    const { to } = req.body;
    try {
        const scope = resourceScope(req, 'i');
        const [[invoice]] = await pool.query(
            `SELECT i.*, u.name AS issuer_name, u.email AS issuer_email, u.company_name AS issuer_company FROM invoices i JOIN users u ON u.id=i.user_id WHERE i.id=? AND ${scope.where} AND i.is_deleted=0`,
            [id, ...scope.params]);
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        if (invoice.status === 'draft') return res.status(400).json({ message: 'Emite la factura antes de enviarla' });
        if (invoice.status === 'void') return res.status(400).json({ message: 'No se puede enviar una factura anulada' });
        const [items] = await pool.query(`SELECT * FROM invoice_items WHERE invoice_id=? AND is_deleted=0`, [id]);
        const [[clientRow]] = await pool.query(`SELECT name, email, company, document, address FROM clients WHERE id=?`, [invoice.client_id]);
        const client = {
            name: invoice.customer_legal_name || clientRow?.name || 'Cliente',
            email: clientRow?.email || '',
            company: clientRow?.company || '',
            document: invoice.customer_tax_id || clientRow?.document || '',
            address: invoice.customer_fiscal_address || clientRow?.address || '',
        };
        const recipient = to || client.email;
        if (!recipient) return res.status(400).json({ message: 'El cliente no tiene email. Especifica un destinatario.' });
        const qrBuffer = await qrBufferFor(invoice);
        const pdfBuffer = await generateInvoicePDFBuffer(invoice, items, client, qrBuffer);
        await sendInvoiceEmail({
            to: recipient,
            invoiceNumber: invoice.invoice_number,
            clientName: client.name,
            issuerName: invoice.issuer_legal_name || invoice.issuer_company || invoice.issuer_name || 'Workly',
            totalAmount: invoice.total_amount,
            dueDate: invoice.due_date,
            pdfBuffer,
            publicUrl: (process.env.FRONTEND_URL && invoice.public_token)
                ? `${process.env.FRONTEND_URL}/p/${invoice.public_token}`
                : null,
        });
        if (!invoice.sent_at) {
            await pool.query(`UPDATE invoices SET sent_at=NOW() WHERE id=?`, [id]);
        }
        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: id, action: 'updated' });
        res.json({ message: `Factura enviada a ${recipient}` });
    } catch (err) {
        console.error('[sendInvoiceByEmail]', err.message);
        res.status(500).json({ message: err.message.includes('Resend') ? 'Error al enviar el email. Verifica RESEND_API_KEY.' : err.message });
    }
};