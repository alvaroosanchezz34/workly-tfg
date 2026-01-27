import { pool } from '../config/db.js';
import { generateInvoicePDF } from '../services/pdf.service.js';
import { logActivity } from '../utils/activityLogger.js';

// Crear facturas
export const createInvoice = async (req, res) => {
    const {
        client_id,
        project_id,
        issue_date,
        due_date,
        status,
        notes,
        items,
    } = req.body;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Validar líneas
        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('La factura debe tener al menos una línea');
        }

        for (const item of items) {
            if (item.quantity <= 0 || item.unit_price < 0) {
                throw new Error('Valores inválidos en líneas de factura');
            }
        }

        // Comprobar cliente
        const [client] = await connection.query(
            `
      SELECT id
      FROM clients
      WHERE id = ?
        AND user_id = ?
        AND is_deleted = 0
      `,
            [client_id, req.user.id]
        );

        if (client.length === 0) {
            throw new Error('Cliente no válido');
        }

        const invoiceNumber = `INV-${Date.now()}`;

        // Crear factura
        const [invoiceResult] = await connection.query(
            `
      INSERT INTO invoices
        (user_id, client_id, project_id, invoice_number,
         issue_date, due_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
            [
                req.user.id,
                client_id,
                project_id || null,
                invoiceNumber,
                issue_date,
                due_date,
                status || 'draft',
                notes,
            ]
        );

        const invoiceId = invoiceResult.insertId;
        let totalAmount = 0;

        // Insertar líneas
        for (const item of items) {
            const lineTotal = item.quantity * item.unit_price;
            totalAmount += lineTotal;

            await connection.query(
                `
        INSERT INTO invoice_items
          (invoice_id, description, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?)
        `,
                [
                    invoiceId,
                    item.description,
                    item.quantity,
                    item.unit_price,
                    lineTotal,
                ]
            );
        }

        // Actualizar total
        await connection.query(
            `UPDATE invoices SET total_amount = ? WHERE id = ?`,
            [totalAmount, invoiceId]
        );

        await logActivity({
            userId: req.user.id,
            entity: 'invoice',
            entityId: invoiceId,
            action: 'created',
        });

        await connection.commit();

        res.status(201).json({
            message: 'Factura creada',
            invoiceId,
            invoice_number: invoiceNumber,
            total: totalAmount,
        });

    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// Get facturas
export const getInvoices = async (req, res) => {
    await pool.query(
        `
    UPDATE invoices
    SET status = 'overdue'
    WHERE user_id = ?
      AND status IN ('draft', 'sent')
      AND due_date < CURDATE()
      AND is_deleted = 0
    `,
        [req.user.id]
    );

    try {
        const [rows] = await pool.query(
            `
      SELECT i.*, c.name AS client_name
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      WHERE i.user_id = ?
        AND i.is_deleted = 0
        AND c.is_deleted = 0
      ORDER BY i.created_at DESC
      `,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get facturas por ID
export const getInvoiceById = async (req, res) => {
    const { id } = req.params;

    try {
        const [[invoice]] = await pool.query(
            `
      SELECT i.*, c.name AS client_name
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      WHERE i.id = ?
        AND i.user_id = ?
        AND i.is_deleted = 0
      `,
            [id, req.user.id]
        );

        if (!invoice) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        const [items] = await pool.query(
            `
      SELECT *
      FROM invoice_items
      WHERE invoice_id = ?
        AND is_deleted = 0
      `,
            [id]
        );

        res.json({ ...invoice, items });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Descargar factura
export const downloadInvoicePDF = async (req, res) => {
    const { id } = req.params;

    try {
        const [[invoice]] = await pool.query(
            `
      SELECT *
      FROM invoices
      WHERE id = ?
        AND user_id = ?
        AND is_deleted = 0
      `,
            [id, req.user.id]
        );

        if (!invoice) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        const [items] = await pool.query(
            `
      SELECT *
      FROM invoice_items
      WHERE invoice_id = ?
        AND is_deleted = 0
      `,
            [id]
        );

        const [[client]] = await pool.query(
            `
      SELECT name, email
      FROM clients
      WHERE id = ?
        AND is_deleted = 0
      `,
            [invoice.client_id]
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename=factura-${invoice.invoice_number}.pdf`
        );
        res.setHeader('Content-Type', 'application/pdf');

        generateInvoicePDF(invoice, items, client, res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Soft delete para factura
export const softDeleteInvoice = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // Comprobar factura
        const [[invoice]] = await conn.query(
            `
      SELECT status
      FROM invoices
      WHERE id = ?
        AND user_id = ?
        AND is_deleted = 0
      `,
            [id, userId]
        );

        if (!invoice) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        if (invoice.status === 'paid') {
            return res
                .status(400)
                .json({ message: 'No se puede eliminar una factura pagada' });
        }

        // Soft delete factura
        await conn.query(
            `
      UPDATE invoices
      SET is_deleted = 1,
          deleted_at = NOW(),
          deleted_by = ?
      WHERE id = ?
        AND user_id = ?
      `,
            [userId, id, userId]
        );

        // Soft delete líneas
        await conn.query(
            `
      UPDATE invoice_items
      SET is_deleted = 1,
          deleted_at = NOW(),
          deleted_by = ?
      WHERE invoice_id = ?
      `,
            [userId, id]
        );

        await logActivity({
            userId,
            entity: 'invoice',
            entityId: id,
            action: 'deleted',
        });

        await conn.commit();
        res.json({ message: 'Factura eliminada correctamente' });

    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ message: 'Error eliminando factura' });
    } finally {
        conn.release();
    }
};


export const updateInvoice = async (req, res) => {
    const { id } = req.params;
    const {
        client_id,
        project_id,
        issue_date,
        due_date,
        status,
        notes,
        items,
    } = req.body;

    const userId = req.user.id;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        // 1️⃣ Comprobar factura
        const [[invoice]] = await conn.query(
            `SELECT id FROM invoices
             WHERE id = ? AND user_id = ? AND is_deleted = 0`,
            [id, userId]
        );

        if (!invoice) {
            return res.status(404).json({ message: "Factura no encontrada" });
        }

        const [[current]] = await conn.query(
            `SELECT status FROM invoices WHERE id = ?`,
            [id]
        );

        if (current.status === "paid") {
            return res
                .status(400)
                .json({ message: "No se puede modificar una factura pagada" });
        }


        // 2️⃣ Actualizar cabecera
        await conn.query(
            `UPDATE invoices SET
                client_id = ?,
                project_id = ?,
                issue_date = ?,
                due_date = ?,
                status = ?,
                notes = ?
             WHERE id = ?`,
            [
                client_id,
                project_id || null,
                issue_date,
                due_date,
                status,
                notes,
                id,
            ]
        );

        // 3️⃣ Eliminar líneas antiguas (soft)
        await conn.query(
            `UPDATE invoice_items
             SET is_deleted = 1
             WHERE invoice_id = ?`,
            [id]
        );

        // 4️⃣ Insertar nuevas líneas
        let totalAmount = 0;

        for (const item of items) {
            const lineTotal =
                Number(item.quantity) * Number(item.unit_price);
            totalAmount += lineTotal;

            await conn.query(
                `INSERT INTO invoice_items
                 (invoice_id, description, quantity, unit_price, total)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    id,
                    item.description,
                    item.quantity,
                    item.unit_price,
                    lineTotal,
                ]
            );
        }

        // 5️⃣ Actualizar total
        await conn.query(
            `UPDATE invoices SET total_amount = ? WHERE id = ?`,
            [totalAmount, id]
        );

        await conn.commit();
        res.json({ message: "Factura actualizada" });

    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

