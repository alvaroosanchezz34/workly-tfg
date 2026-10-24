import { pool } from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';
import { resourceScope } from '../utils/scope.js';
import { priceItems } from '../services/invoicing/totals.js';
import { assertSpanishTaxId, validateSpanishTaxId } from '../services/invoicing/taxId.js';
import {
    allocateInvoiceNumber, issuerKeyFor, normalizeSeriesCode, seriesYear,
} from '../services/invoicing/numbering.js';
import { appendInvoiceEvent, listInvoiceEvents } from '../services/invoicing/invoiceEvents.js';
import { insertLines, saveInvoiceTotals } from '../services/invoicing/persistLines.js';
import { getVerifactuProvider } from '../services/verifactu/index.js';

const fail = (statusCode, message) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

const sendError = (res, err) => {
    const status = err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Error interno del servidor' });
};

const profileComplete = profile => Boolean(
    profile?.legal_name?.trim()
    && profile?.tax_id?.trim()
    && profile?.fiscal_address?.trim()
    && profile.fiscal_address.trim().length >= 5
);

export const getIssuerProfile = async (req, res) => {
    try {
        const issuerKey = issuerKeyFor(req.user);
        const [[profile]] = await pool.query(
            `SELECT issuer_key, legal_name, tax_id, fiscal_address FROM issuer_profiles WHERE issuer_key = ?`,
            [issuerKey]
        );
        if (!profile) {
            return res.json({
                issuer_key: issuerKey,
                legal_name: '',
                tax_id: '',
                fiscal_address: '',
                complete: false,
            });
        }
        res.json({ ...profile, complete: profileComplete(profile) });
    } catch (err) {
        sendError(res, err);
    }
};

export const saveIssuerProfile = async (req, res) => {
    try {
        if (req.user.company_id && req.user.role !== 'company_admin' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Solo un administrador de la empresa puede cambiar los datos fiscales del emisor' });
        }
        const legalName = String(req.body.legal_name || '').trim();
        const address = String(req.body.fiscal_address || '').trim();
        if (legalName.length < 3) return res.status(400).json({ message: 'Indica el nombre o la razón social de quien factura' });
        if (address.length < 5) return res.status(400).json({ message: 'Indica el domicilio fiscal completo' });
        const taxId = assertSpanishTaxId(req.body.tax_id);
        const issuerKey = issuerKeyFor(req.user);
        await pool.query(
            `INSERT INTO issuer_profiles (issuer_key, user_id, company_id, legal_name, tax_id, fiscal_address)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               legal_name = VALUES(legal_name),
               tax_id = VALUES(tax_id),
               fiscal_address = VALUES(fiscal_address)`,
            [
                issuerKey,
                req.user.company_id ? null : req.user.id,
                req.user.company_id || null,
                legalName,
                taxId,
                address,
            ]
        );
        res.json({
            message: 'Datos fiscales guardados',
            issuer_key: issuerKey,
            legal_name: legalName,
            tax_id: taxId,
            fiscal_address: address,
            complete: true,
        });
    } catch (err) {
        sendError(res, err);
    }
};

const loadDraftForUpdate = async (conn, req, id) => {
    const scope = resourceScope(req, 'i');
    const [[invoice]] = await conn.query(
        `SELECT i.*, c.name AS client_name, c.company AS client_company,
                c.document AS client_document, c.address AS client_address, c.is_deleted AS client_deleted
         FROM invoices i
         JOIN clients c ON c.id = i.client_id
         WHERE i.id = ? AND ${scope.where} AND i.is_deleted = 0
         FOR UPDATE`,
        [id, ...scope.params]
    );
    return invoice;
};

const readSettings = async (conn, userId) => {
    const [[cfg]] = await conn.query(
        `SELECT prefix, padding, reset_yearly FROM invoice_settings WHERE user_id = ?`,
        [userId]
    );
    if (cfg) return cfg;
    const year = new Date().getFullYear();
    await conn.query(
        `INSERT INTO invoice_settings (user_id, prefix, next_number, padding, current_year) VALUES (?, 'FAC', 1, 4, ?)`,
        [userId, year]
    );
    return { prefix: 'FAC', padding: 4, reset_yearly: 1 };
};

export const issueInvoice = async (req, res) => {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const invoice = await loadDraftForUpdate(conn, req, id);
        if (!invoice) throw fail(404, 'Factura no encontrada');
        if (invoice.status !== 'draft') throw fail(409, 'Esta factura ya está emitida');
        if (invoice.client_deleted) throw fail(400, 'El cliente de esta factura está eliminado');

        const [items] = await conn.query(
            `SELECT description, quantity, unit_price, tax_rate, equivalence_surcharge_rate, subtotal, tax_amount, equivalence_surcharge_amount, total
             FROM invoice_items WHERE invoice_id = ? AND is_deleted = 0`,
            [id]
        );
        if (items.length === 0) throw fail(400, 'La factura debe tener al menos una línea');

        const issuerKey = invoice.issuer_key || issuerKeyFor(req.user);
        const [[profile]] = await conn.query(
            `SELECT legal_name, tax_id, fiscal_address FROM issuer_profiles WHERE issuer_key = ?`,
            [issuerKey]
        );
        if (!profileComplete(profile)) {
            throw fail(400, 'Antes de emitir, completa el perfil fiscal del emisor: nombre, NIF y domicilio');
        }
        const issuerTaxId = assertSpanishTaxId(profile.tax_id);

        const kind = invoice.invoice_kind === 'simplified' ? 'simplified' : 'complete';
        let customerTaxId = invoice.client_document ? String(invoice.client_document).trim() : '';
        const customerAddress = invoice.client_address ? String(invoice.client_address).trim() : '';
        if (kind === 'complete') {
            if (!customerTaxId) throw fail(400, 'La factura completa necesita el NIF del cliente');
            if (customerAddress.length < 5) throw fail(400, 'La factura completa necesita el domicilio del cliente');
            customerTaxId = assertSpanishTaxId(customerTaxId);
        } else if (customerTaxId) {
            const check = validateSpanishTaxId(customerTaxId);
            if (!check.ok) throw fail(400, check.message);
            customerTaxId = check.value;
        }

        const cfg = await readSettings(conn, req.user.id);
        const seriesCode = normalizeSeriesCode(cfg.prefix);
        const year = seriesYear(invoice.issue_date, Number(cfg.reset_yearly) !== 0);
        const allocated = await allocateInvoiceNumber(conn, {
            issuerKey,
            seriesCode,
            padding: cfg.padding,
            year,
        });

        let rectified = null;
        if (invoice.rectifies_invoice_id) {
            const [[original]] = await conn.query(
                `SELECT invoice_number, issue_date, issuer_tax_id, subtotal_amount, tax_amount, equivalence_surcharge_amount
                 FROM invoices WHERE id = ?`,
                [invoice.rectifies_invoice_id]
            );
            if (!original?.invoice_number) throw fail(400, 'No se encuentra la factura que se quiere rectificar');
            rectified = original;
        }

        const registro = {
            invoiceId: Number(id),
            issuerKey,
            issuer: {
                legalName: profile.legal_name.trim(),
                taxId: issuerTaxId,
                fiscalAddress: profile.fiscal_address.trim(),
            },
            customer: {
                legalName: invoice.client_company || invoice.client_name,
                taxId: customerTaxId || null,
                fiscalAddress: customerAddress || null,
            },
            invoiceKind: kind,
            invoiceType: invoice.invoice_type || 'normal',
            rectificationMethod: invoice.rectification_method,
            rectificationCode: invoice.rectification_code || null,
            rectifiesInvoiceId: invoice.rectifies_invoice_id,
            rectified,
            description: items.map(item => item.description).filter(Boolean).join('. '),
            conn,
            seriesCode,
            invoiceNumber: allocated.number,
            issueDate: invoice.issue_date,
            base: Number(invoice.subtotal_amount),
            vatAmount: Number(invoice.tax_amount),
            equivalenceSurchargeAmount: Number(invoice.equivalence_surcharge_amount || 0),
            irpfRate: Number(invoice.irpf_rate || 0),
            irpfAmount: Number(invoice.irpf_amount || 0),
            total: Number(invoice.total_amount),
            lines: items,
        };

        const provider = getVerifactuProvider();
        const alta = await provider.registrarAlta(registro);
        const qrExtra = alta?.qrUrl ? null : await provider.obtenerQr(registro);
        const qrUrl = alta?.qrUrl || qrExtra?.qrUrl || null;
        const legend = alta?.legend || qrExtra?.legend || null;

        await conn.query(
            `UPDATE invoices SET
               issuer_key = ?, series_code = ?, invoice_number = ?, invoice_seq = ?, invoice_year = ?, invoice_prefix = ?,
               status = 'sent', issued_at = NOW(),
               issuer_legal_name = ?, issuer_tax_id = ?, issuer_fiscal_address = ?,
               customer_legal_name = ?, customer_tax_id = ?, customer_fiscal_address = ?,
               verifactu_status = ?, verifactu_external_id = ?, verifactu_qr_url = ?, verifactu_legend = ?
             WHERE id = ?`,
            [
                issuerKey, seriesCode, allocated.number, allocated.seq, allocated.year, seriesCode,
                profile.legal_name.trim(), issuerTaxId, profile.fiscal_address.trim(),
                registro.customer.legalName, customerTaxId || null, customerAddress || null,
                alta?.status || 'not_configured', alta?.externalId || null, qrUrl, legend,
                id,
            ]
        );

        if (invoice.rectifies_invoice_id) {
            await conn.query(
                `UPDATE invoices SET rectified_by_invoice_id = ? WHERE id = ? AND rectified_by_invoice_id IS NULL`,
                [id, invoice.rectifies_invoice_id]
            );
        }

        await appendInvoiceEvent(conn, {
            invoiceId: id,
            issuerKey,
            userId: req.user.id,
            action: 'issued',
            payload: { invoice_number: allocated.number, verifactu_status: alta?.status || 'not_configured' },
        });
        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: id, action: 'updated' });
        await conn.commit();
        res.json({
            message: 'Factura emitida',
            invoice_number: allocated.number,
            verifactu_status: alta?.status || 'not_configured',
            verifactu_qr_url: qrUrl,
            verifactu_legend: legend,
        });
    } catch (err) {
        await conn.rollback();
        sendError(res, err);
    } finally {
        conn.release();
    }
};

export const voidInvoice = async (req, res) => {
    const { id } = req.params;
    const reason = String(req.body?.reason || '').trim();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const scope = resourceScope(req);
        const [[invoice]] = await conn.query(
            `SELECT id, status, invoice_number, issuer_key, issuer_tax_id, issuer_legal_name, series_code, issue_date, issued_at
             FROM invoices WHERE id = ? AND ${scope.where} AND is_deleted = 0 FOR UPDATE`,
            [id, ...scope.params]
        );
        if (!invoice) throw fail(404, 'Factura no encontrada');
        if (invoice.status === 'draft') throw fail(400, 'Un borrador se elimina. La anulación es solo para facturas emitidas');
        if (invoice.status === 'void') throw fail(409, 'Esta factura ya está anulada');
        if (reason.length < 3) throw fail(400, 'Indica el motivo de la anulación');

        const provider = getVerifactuProvider();
        const result = await provider.anular({
            invoiceId: Number(id),
            invoiceNumber: invoice.invoice_number,
            issuerKey: invoice.issuer_key,
            issuerTaxId: invoice.issuer_tax_id,
            issuerLegalName: invoice.issuer_legal_name,
            seriesCode: invoice.series_code,
            issueDate: invoice.issue_date,
            reason,
            conn,
        });

        await conn.query(
            `UPDATE invoices
             SET status = 'void', voided_at = NOW(), void_reason = ?, verifactu_status = ?
             WHERE id = ?`,
            [reason, result?.status || 'not_configured', id]
        );
        await appendInvoiceEvent(conn, {
            invoiceId: id,
            issuerKey: invoice.issuer_key,
            userId: req.user.id,
            action: 'voided',
            payload: { reason, invoice_number: invoice.invoice_number, verifactu_status: result?.status || 'not_configured' },
        });
        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: id, action: 'updated' });
        await conn.commit();
        res.json({ message: 'Factura anulada', invoice_number: invoice.invoice_number });
    } catch (err) {
        await conn.rollback();
        sendError(res, err);
    } finally {
        conn.release();
    }
};

export const createRectificativa = async (req, res) => {
    const { id } = req.params;
    const method = req.body?.method;
    if (method !== 'substitution' && method !== 'difference') {
        return res.status(400).json({ message: 'El método tiene que ser substitution (sustitución) o difference (diferencias)' });
    }
    const requestedCode = String(req.body?.code || '').trim().toUpperCase();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const scope = resourceScope(req);
        const [[original]] = await conn.query(
            `SELECT * FROM invoices WHERE id = ? AND ${scope.where} AND is_deleted = 0 FOR UPDATE`,
            [id, ...scope.params]
        );
        if (!original) throw fail(404, 'Factura no encontrada');
        if (original.status === 'draft') throw fail(400, 'Solo se rectifica una factura ya emitida');
        if (original.status === 'void') throw fail(409, 'Una factura anulada no se rectifica');

        const [originalItems] = await conn.query(
            `SELECT description, quantity, unit_price, tax_rate, equivalence_surcharge_rate
             FROM invoice_items WHERE invoice_id = ? AND is_deleted = 0`,
            [id]
        );
        const sourceItems = Array.isArray(req.body.items) && req.body.items.length > 0
            ? req.body.items
            : originalItems;
        const priced = priceItems(sourceItems, req.body.irpf_rate ?? original.irpf_rate ?? 0);

        const simplified = original.invoice_kind === 'simplified';
        const allowedCodes = simplified ? ['R5'] : ['R1', 'R2', 'R3', 'R4'];
        if (requestedCode && !allowedCodes.includes(requestedCode)) {
            throw fail(400, simplified
                ? 'Una rectificativa simplificada usa el código R5'
                : 'El código de rectificativa tiene que ser R1, R2, R3 o R4');
        }
        const rectificationCode = requestedCode || (simplified ? 'R5' : 'R1');

        const issuerKey = original.issuer_key || issuerKeyFor(req.user);
        const publicToken = (await import('crypto')).randomBytes(32).toString('hex');
        const notePrefix = method === 'substitution'
            ? `Factura rectificativa por sustitución de ${original.invoice_number}.`
            : `Factura rectificativa por diferencias de ${original.invoice_number}.`;
        const notes = [notePrefix, req.body.notes || original.notes || ''].filter(Boolean).join(' ');

        const [result] = await conn.query(
            `INSERT INTO invoices
               (user_id, company_id, client_id, project_id, issuer_key,
                invoice_number, issue_date, due_date, status, notes, public_token,
                invoice_kind, invoice_type, rectification_method, rectification_code, rectifies_invoice_id, irpf_rate)
             VALUES (?,?,?,?,?,?,?,?, 'draft', ?, ?, ?, 'rectificativa', ?, ?, ?, ?)`,
            [
                req.user.id, req.user.company_id || original.company_id || null, original.client_id, original.project_id,
                issuerKey, null,
                req.body.issue_date || new Date().toISOString().slice(0, 10),
                req.body.due_date || original.due_date,
                notes, publicToken,
                original.invoice_kind || 'complete',
                method, rectificationCode, original.id, priced.totals.irpf_rate,
            ]
        );
        const newId = result.insertId;
        await insertLines(conn, newId, priced.lines);
        await saveInvoiceTotals(conn, newId, priced.totals);
        await appendInvoiceEvent(conn, {
            invoiceId: newId,
            issuerKey,
            userId: req.user.id,
            action: 'draft_created',
            payload: { rectifies_invoice_id: original.id, method },
        });
        await appendInvoiceEvent(conn, {
            invoiceId: original.id,
            issuerKey,
            userId: req.user.id,
            action: 'rectification_opened',
            payload: { rectificativa_id: newId, method },
        });
        await logActivity({ userId: req.user.id, entity: 'invoice', entityId: newId, action: 'created' });
        await conn.commit();
        res.status(201).json({
            message: method === 'substitution'
                ? 'Borrador de rectificativa por sustitución creado'
                : 'Borrador de rectificativa por diferencias creado',
            invoiceId: newId,
            rectifies_invoice_id: original.id,
            method,
            code: rectificationCode,
        });
    } catch (err) {
        await conn.rollback();
        sendError(res, err);
    } finally {
        conn.release();
    }
};

export const getInvoiceEvents = async (req, res) => {
    try {
        const scope = resourceScope(req);
        const [[invoice]] = await pool.query(
            `SELECT id FROM invoices WHERE id = ? AND ${scope.where} AND is_deleted = 0`,
            [req.params.id, ...scope.params]
        );
        if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
        const events = await listInvoiceEvents(pool, invoice.id);
        res.json(events);
    } catch (err) {
        sendError(res, err);
    }
};
