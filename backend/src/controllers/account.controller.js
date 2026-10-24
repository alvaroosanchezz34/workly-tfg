import { pool } from '../config/db.js';
import { issuerKeyFor } from '../services/invoicing/numbering.js';
import { resourceScope } from '../utils/scope.js';
import { logger } from '../utils/logger.js';

const sendError = (res, err) => {
    logger.error(err.message || 'account');
    res.status(err.statusCode || 500).json({ message: err.statusCode ? err.message : 'Error interno del servidor' });
};

export const exportAccount = async (req, res) => {
    try {
        const scope = resourceScope(req);
        const [[user]] = await pool.query(
            `SELECT id, name, email, phone, company_name, role, plan, language, timezone, created_at
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        const [clients] = await pool.query(
            `SELECT id, name, email, phone, company, document, address, notes, created_at
             FROM clients WHERE ${scope.where} AND is_deleted = 0`,
            scope.params
        );
        const [invoices] = await pool.query(
            `SELECT id, invoice_number, status, issue_date, due_date, subtotal_amount, tax_amount,
                    irpf_amount, total_amount, issuer_legal_name, issuer_tax_id, customer_legal_name,
                    customer_tax_id, verifactu_status, created_at
             FROM invoices WHERE ${scope.where} AND is_deleted = 0`,
            scope.params
        );
        const [records] = await pool.query(
            `SELECT r.id, r.invoice_id, r.operation, r.num_serie, r.status, r.csv, r.codigo_error, r.descripcion_error, r.created_at
             FROM verifactu_records r
             JOIN invoices i ON i.id = r.invoice_id
             WHERE ${resourceScope(req, 'i').where}`,
            resourceScope(req, 'i').params
        );
        res.json({
            exportedAt: new Date().toISOString(),
            user,
            clients,
            invoices,
            verifactuRecords: records,
            note: 'Las facturas emitidas y los registros VeriFactu se conservan por obligación fiscal aunque cierres la cuenta.',
        });
    } catch (err) {
        sendError(res, err);
    }
};

export const deleteAccount = async (req, res) => {
    const confirm = String(req.body?.confirm || '');
    if (confirm !== 'ELIMINAR') {
        return res.status(400).json({ message: 'Escribe ELIMINAR para confirmar el cierre de la cuenta' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [[user]] = await conn.query(
            `SELECT id, email, status, deleted_at FROM users WHERE id = ? FOR UPDATE`,
            [req.user.id]
        );
        if (!user || user.deleted_at) {
            await conn.rollback();
            return res.status(409).json({ message: 'Esta cuenta ya está cerrada' });
        }
        const scope = resourceScope(req, 'i');
        await conn.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, [req.user.id]);
        await conn.query(
            `UPDATE invoices i SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?
             WHERE ${scope.where} AND i.status = 'draft' AND i.is_deleted = 0`,
            [req.user.id, ...scope.params]
        );
        const clientScope = resourceScope(req);
        await conn.query(
            `UPDATE clients SET name = 'Cliente anonimizado', email = NULL, phone = NULL, notes = NULL, address = NULL
             WHERE ${clientScope.where}`,
            clientScope.params
        );
        const issuerKey = issuerKeyFor(req.user);
        const [[profile]] = await conn.query(
            `SELECT tax_id FROM issuer_profiles WHERE issuer_key = ?`,
            [issuerKey]
        );
        if (profile?.tax_id) {
            await conn.query(
                `DELETE FROM verifactu_certificates WHERE scope = 'issuer' AND issuer_tax_id = ?`,
                [profile.tax_id]
            );
        }
        const placeholder = `deleted-${user.id}@invalid.local`;
        await conn.query(
            `UPDATE users
             SET name = 'Cuenta eliminada', email = ?, phone = NULL, avatar_url = NULL,
                 company_name = NULL, password = ?, status = 'inactive', deleted_at = NOW(), anonymized_at = NOW()
             WHERE id = ?`,
            [placeholder, `deleted-${user.id}`, user.id]
        );
        await conn.commit();
        res.json({
            message: 'Cuenta cerrada. Hemos anonimizado tus datos de acceso y de contacto.',
            retained: 'Las facturas ya emitidas, su foto fiscal y los registros VeriFactu no se borran. Hay que conservarlos al menos 4 años por la normativa fiscal y por VeriFactu. Los borradores sí se han retirado. El certificado electrónico guardado se ha eliminado.',
        });
    } catch (err) {
        await conn.rollback();
        sendError(res, err);
    } finally {
        conn.release();
    }
};
