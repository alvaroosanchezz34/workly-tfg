import { pool } from '../config/db.js';
import { generateInvoicePDF } from '../services/pdf.service.js';

// Crear factura
export const createInvoice = async (req, res) => {
    const {
        client_id,
        project_id,
        issue_date,
        due_date,
        notes,
        items
    } = req.body;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // comprobar cliente del usuario
        const [client] = await connection.query(
            'SELECT id FROM clients WHERE id = ? AND user_id = ?',
            [client_id, req.user.id]
        );

        if (client.length === 0) {
            throw new Error('Cliente no válido');
        }

        // generar número de factura simple
        const invoiceNumber = `INV-${Date.now()}`;

        // crear factura
        const [invoiceResult] = await connection.query(
            `INSERT INTO invoices
      (user_id, client_id, project_id, invoice_number, issue_date, due_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)`,
            [
                req.user.id,
                client_id,
                project_id || null,
                invoiceNumber,
                issue_date,
                due_date,
                notes
            ]
        );

        const invoiceId = invoiceResult.insertId;
        let totalAmount = 0;

        // insertar líneas
        for (const item of items) {
            const lineTotal = item.quantity * item.unit_price;
            totalAmount += lineTotal;

            await connection.query(
                `INSERT INTO invoice_items
        (invoice_id, description, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?)`,
                [
                    invoiceId,
                    item.description,
                    item.quantity,
                    item.unit_price,
                    lineTotal
                ]
            );
        }

        // actualizar total factura
        await connection.query(
            'UPDATE invoices SET total_amount = ? WHERE id = ?',
            [totalAmount, invoiceId]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Factura creada',
            invoiceId,
            invoice_number: invoiceNumber,
            total: totalAmount
        });
    } catch (error) {
        await connection.rollback();
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// List invoice from a client
export const getInvoices = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT i.*, c.name AS client_name
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get invoice with lines
export const getInvoiceById = async (req, res) => {
    const { id } = req.params;

    try {
        const [[invoice]] = await pool.query(
            'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (!invoice) {
            return res.status(404).json({ message: 'Factura no encontrada' });
        }

        const [items] = await pool.query(
            'SELECT * FROM invoice_items WHERE invoice_id = ?',
            [id]
        );

        res.json({ ...invoice, items });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Download PDF from invoice
export const downloadInvoicePDF = async (req, res) => {
  const { id } = req.params;

  try {
    const [[invoice]] = await pool.query(
      'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!invoice) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    const [items] = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [id]
    );

    const [[client]] = await pool.query(
      'SELECT name, email FROM clients WHERE id = ?',
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