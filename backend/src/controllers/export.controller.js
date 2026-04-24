// backend/src/controllers/export.controller.js
import { pool } from '../config/db.js';
import ExcelJS from 'exceljs';

const PRIMARY_HEX = '1976D2';
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${PRIMARY_HEX}` } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const ALT_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
const BORDER_THIN = { style: 'thin', color: { argb: 'FFE0E0E0' } };
const ALL_BORDERS = { top: BORDER_THIN, left: BORDER_THIN, bottom: BORDER_THIN, right: BORDER_THIN };

const applyHeader = (ws, columns) => {
    ws.columns = columns;
    const headerRow = ws.getRow(1);
    headerRow.eachCell(cell => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = ALL_BORDERS;
    });
    headerRow.height = 24;
};

const styleDataRows = ws => {
    ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        row.eachCell(cell => {
            cell.border = ALL_BORDERS;
            cell.alignment = { vertical: 'middle' };
        });
        if (rowNum % 2 === 0) {
            row.eachCell(cell => { cell.fill = ALT_FILL; });
        }
        row.height = 20;
    });
};

// ── Exportar facturas ─────────────────────────────────────
export const exportInvoices = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT i.invoice_number, c.name AS client, i.issue_date, i.due_date,
                    i.status, i.subtotal_amount, i.tax_amount, i.total_amount,
                    i.paid_amount, i.payment_status, i.notes
             FROM invoices i
             JOIN clients c ON c.id = i.client_id
             WHERE i.user_id = ? AND i.is_deleted = 0
             ORDER BY i.issue_date DESC`,
            [userId]
        );

        const wb = new ExcelJS.Workbook();
        wb.creator  = 'Workly';
        wb.created  = new Date();

        const ws = wb.addWorksheet('Facturas');
        applyHeader(ws, [
            { header: 'Número',        key: 'invoice_number',  width: 18 },
            { header: 'Cliente',       key: 'client',          width: 28 },
            { header: 'Emisión',       key: 'issue_date',      width: 14 },
            { header: 'Vencimiento',   key: 'due_date',        width: 14 },
            { header: 'Estado',        key: 'status',          width: 12 },
            { header: 'Base (€)',      key: 'subtotal_amount', width: 14, style: { numFmt: '#,##0.00 €' } },
            { header: 'IVA (€)',       key: 'tax_amount',      width: 12, style: { numFmt: '#,##0.00 €' } },
            { header: 'Total (€)',     key: 'total_amount',    width: 14, style: { numFmt: '#,##0.00 €' } },
            { header: 'Cobrado (€)',   key: 'paid_amount',     width: 14, style: { numFmt: '#,##0.00 €' } },
            { header: 'Cobro estado',  key: 'payment_status',  width: 14 },
            { header: 'Notas',         key: 'notes',           width: 30 },
        ]);

        const STATUS_LABELS = { draft: 'Borrador', sent: 'Enviada', paid: 'Pagada', overdue: 'Vencida' };
        const PAY_LABELS    = { unpaid: 'Sin pagar', partial: 'Parcial', paid: 'Cobrado' };

        rows.forEach(r => {
            ws.addRow({
                ...r,
                issue_date:      r.issue_date ? new Date(r.issue_date).toLocaleDateString('es-ES') : '',
                due_date:        r.due_date   ? new Date(r.due_date).toLocaleDateString('es-ES')   : '',
                status:          STATUS_LABELS[r.status]         || r.status,
                payment_status:  PAY_LABELS[r.payment_status]    || r.payment_status,
                subtotal_amount: Number(r.subtotal_amount),
                tax_amount:      Number(r.tax_amount),
                total_amount:    Number(r.total_amount),
                paid_amount:     Number(r.paid_amount),
            });
        });

        styleDataRows(ws);

        // Fila de totales
        const totalRow = ws.addRow({
            invoice_number: 'TOTAL',
            subtotal_amount: rows.reduce((s, r) => s + Number(r.subtotal_amount), 0),
            tax_amount:      rows.reduce((s, r) => s + Number(r.tax_amount), 0),
            total_amount:    rows.reduce((s, r) => s + Number(r.total_amount), 0),
            paid_amount:     rows.reduce((s, r) => s + Number(r.paid_amount), 0),
        });
        totalRow.font = { bold: true };
        totalRow.fill = HEADER_FILL;
        totalRow.eachCell(cell => { cell.font = { ...HEADER_FONT }; cell.border = ALL_BORDERS; });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=facturas-${Date.now()}.xlsx`);
        await wb.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Exportar gastos ───────────────────────────────────────
export const exportExpenses = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT category, description, amount, date, receipt_url
             FROM expenses WHERE user_id = ? AND is_deleted = 0
             ORDER BY date DESC`,
            [userId]
        );

        const CAT_LABELS = { software: 'Software', hardware: 'Hardware', oficina: 'Oficina', transporte: 'Transporte', marketing: 'Marketing', formacion: 'Formación', servicios: 'Servicios', otros: 'Otros' };

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Workly'; wb.created = new Date();

        const ws = wb.addWorksheet('Gastos');
        applyHeader(ws, [
            { header: 'Categoría',    key: 'category',    width: 18 },
            { header: 'Descripción',  key: 'description', width: 36 },
            { header: 'Importe (€)',  key: 'amount',      width: 14, style: { numFmt: '#,##0.00 €' } },
            { header: 'Fecha',        key: 'date',        width: 14 },
            { header: 'Recibo URL',   key: 'receipt_url', width: 30 },
        ]);

        rows.forEach(r => {
            ws.addRow({
                ...r,
                category: CAT_LABELS[r.category] || r.category || 'Otros',
                amount:   Number(r.amount),
                date:     r.date ? new Date(r.date).toLocaleDateString('es-ES') : '',
            });
        });

        styleDataRows(ws);

        const totalRow = ws.addRow({ category: 'TOTAL', amount: rows.reduce((s, r) => s + Number(r.amount), 0) });
        totalRow.fill = HEADER_FILL;
        totalRow.eachCell(cell => { cell.font = HEADER_FONT; cell.border = ALL_BORDERS; });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=gastos-${Date.now()}.xlsx`);
        await wb.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Exportar clientes ─────────────────────────────────────
export const exportClients = async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT name, email, phone, company, document, notes, created_at
             FROM clients WHERE user_id = ? AND is_deleted = 0 ORDER BY name ASC`,
            [userId]
        );

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Workly'; wb.created = new Date();

        const ws = wb.addWorksheet('Clientes');
        applyHeader(ws, [
            { header: 'Nombre',     key: 'name',       width: 28 },
            { header: 'Email',      key: 'email',      width: 28 },
            { header: 'Teléfono',   key: 'phone',      width: 16 },
            { header: 'Empresa',    key: 'company',    width: 24 },
            { header: 'NIF/DNI',    key: 'document',   width: 14 },
            { header: 'Notas',      key: 'notes',      width: 36 },
            { header: 'Alta',       key: 'created_at', width: 14 },
        ]);

        rows.forEach(r => {
            ws.addRow({
                ...r,
                created_at: r.created_at ? new Date(r.created_at).toLocaleDateString('es-ES') : '',
            });
        });

        styleDataRows(ws);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=clientes-${Date.now()}.xlsx`);
        await wb.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};