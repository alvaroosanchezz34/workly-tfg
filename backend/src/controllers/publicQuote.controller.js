import { pool } from '../config/db.js';

const tokenOk = value => /^[a-f0-9]{64}$/.test(String(value || ''));

export const getPublicQuote = async (req, res) => {
    if (!tokenOk(req.params.token)) return res.status(400).json({ message: 'Enlace no válido' });
    try {
        const [[quote]] = await pool.query(
            `SELECT q.quote_number, q.issue_date, q.expiry_date, q.status, q.total_amount, q.notes,
                    q.signature_name, q.accepted_at, c.name AS client_name
             FROM quotes q
             JOIN clients c ON c.id = q.client_id
             WHERE q.public_token = ? AND q.is_deleted = 0`,
            [req.params.token]
        );
        if (!quote) return res.status(404).json({ message: 'Presupuesto no encontrado' });
        const [items] = await pool.query(
            `SELECT qi.description, qi.quantity, qi.unit_price, qi.tax_rate, qi.total
             FROM quote_items qi
             JOIN quotes q ON q.id = qi.quote_id
             WHERE q.public_token = ? AND qi.is_deleted = 0`,
            [req.params.token]
        );
        res.json({ ...quote, items });
    } catch (err) {
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

export const acceptPublicQuote = async (req, res) => {
    if (!tokenOk(req.params.token)) return res.status(400).json({ message: 'Enlace no válido' });
    const name = String(req.body?.signerName || '').trim();
    const signature = String(req.body?.signature || '');
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Escribe el nombre de quien acepta' });
    if (!signature.startsWith('data:image/png;base64,') || signature.length > 80000) {
        return res.status(400).json({ message: 'La firma tiene que ser un dibujo pequeño en PNG' });
    }
    try {
        const [result] = await pool.query(
            `UPDATE quotes
             SET status = 'accepted', signature_name = ?, signature_data = ?, accepted_at = NOW()
             WHERE public_token = ? AND is_deleted = 0 AND converted_to_invoice_id IS NULL`,
            [name, signature, req.params.token]
        );
        if (!result.affectedRows) return res.status(404).json({ message: 'Este presupuesto ya no se puede aceptar' });
        res.json({ message: 'Presupuesto aceptado. Gracias.' });
    } catch (err) {
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
