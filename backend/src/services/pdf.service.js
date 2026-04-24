// backend/src/services/pdf.service.js
import PDFDocument from 'pdfkit';

const PRIMARY    = '#1976D2';
const GREY_DARK  = '#212121';
const GREY_MID   = '#616161';
const GREY_LIGHT = '#9E9E9E';
const SUCCESS    = '#4CAF50';
const ERROR_C    = '#F44336';
const BG_LIGHT   = '#F8FAFF';
const WHITE      = '#FFFFFF';

const fmtCurrency = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate     = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

// Lógica compartida de dibujo del PDF
const buildPDF = (doc, invoice, items, client) => {
    const W = 595.28;
    const M = 48;

    // Header azul
    doc.rect(0, 0, W, 140).fill(PRIMARY);
    doc.rect(M, 32, 36, 36).fill(WHITE).fillOpacity(0.15);
    doc.fillOpacity(1).fillColor(WHITE).fontSize(18).font('Helvetica-Bold').text('W', M + 10, 42);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(18).text(invoice.issuer_name || 'Workly', M + 50, 34);
    doc.fillColor('rgba(255,255,255,0.65)').font('Helvetica').fontSize(10).text(invoice.issuer_email || '', M + 50, 56);
    doc.fillColor(WHITE).font('Helvetica').fontSize(9).text('FACTURA', W - M - 120, 30, { width: 120, align: 'right' })
       .fontSize(22).font('Helvetica-Bold').text(invoice.invoice_number, W - M - 160, 42, { width: 160, align: 'right' });

    const statusColor = invoice.status === 'paid' ? SUCCESS : invoice.status === 'overdue' ? ERROR_C : WHITE;
    const statusLabel = { draft: 'BORRADOR', sent: 'ENVIADA', paid: 'PAGADA', overdue: 'VENCIDA' }[invoice.status] || invoice.status.toUpperCase();
    doc.roundedRect(W - M - 80, 75, 80, 22, 4).fill('rgba(255,255,255,0.15)');
    doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(8).text(statusLabel, W - M - 80, 82, { width: 80, align: 'center' });

    // Datos cliente y fechas
    let y = 160;
    doc.rect(0, 140, W, 110).fill(BG_LIGHT);
    doc.fillColor(GREY_LIGHT).font('Helvetica-Bold').fontSize(7.5).text('FACTURAR A', M, y, { characterSpacing: 1 });
    y += 14;
    doc.fillColor(GREY_DARK).font('Helvetica-Bold').fontSize(13).text(client.name, M, y); y += 16;
    if (client.company)  { doc.fillColor(GREY_MID).font('Helvetica').fontSize(9.5).text(client.company, M, y);  y += 13; }
    if (client.email)    { doc.fillColor(GREY_MID).font('Helvetica').fontSize(9.5).text(client.email,   M, y);  y += 13; }
    if (client.document) { doc.fillColor(GREY_LIGHT).font('Helvetica').fontSize(9).text(`NIF: ${client.document}`, M, y); }

    const datesX = W / 2 + 40; let dy = 160;
    const dateRow = (label, value, color = GREY_DARK) => {
        doc.fillColor(GREY_LIGHT).font('Helvetica-Bold').fontSize(7.5).text(label, datesX, dy, { characterSpacing: 1 }); dy += 12;
        doc.fillColor(color).font('Helvetica-Bold').fontSize(10).text(value, datesX, dy); dy += 20;
    };
    dateRow('FECHA DE EMISIÓN',     fmtDate(invoice.issue_date));
    dateRow('FECHA DE VENCIMIENTO', fmtDate(invoice.due_date), invoice.status === 'overdue' ? ERROR_C : GREY_DARK);

    // Tabla de líneas
    y = 270;
    const colW = { desc: 230, qty: 60, price: 80, tax: 60, total: 80 };
    const colX = { desc: M, qty: M+230, price: M+290, tax: M+370, total: M+430 };
    doc.rect(M, y, W - M * 2, 24).fill(PRIMARY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8);
    [['DESCRIPCIÓN', colX.desc, colW.desc], ['CANT.', colX.qty, colW.qty], ['PRECIO/U.', colX.price, colW.price], ['IVA%', colX.tax, colW.tax], ['TOTAL', colX.total, colW.total]]
        .forEach(([h, x, w], i) => doc.text(h, x + 6, y + 8, { width: w - 6, align: i > 0 ? 'right' : 'left' }));
    y += 24;

    (items || []).forEach((item, i) => {
        const rowH = 26;
        doc.rect(M, y, W - M * 2, rowH).fill(i % 2 === 0 ? '#F0F4FF' : WHITE);
        doc.fillColor(GREY_DARK).font('Helvetica').fontSize(9.5);
        doc.text(item.description || '', colX.desc + 6, y + 8, { width: colW.desc - 12 });
        doc.text(String(item.quantity),          colX.qty   + 6, y + 8, { width: colW.qty   - 10, align: 'right' });
        doc.text(fmtCurrency(item.unit_price),   colX.price + 6, y + 8, { width: colW.price - 10, align: 'right' });
        doc.fillColor(GREY_MID).text(`${item.tax_rate ?? 21}%`, colX.tax + 6, y + 8, { width: colW.tax - 10, align: 'right' });
        doc.fillColor(GREY_DARK).font('Helvetica-Bold').text(fmtCurrency(item.total), colX.total + 6, y + 8, { width: colW.total - 10, align: 'right' });
        y += rowH;
    });

    doc.moveTo(M, y).lineTo(W - M, y).stroke('#E0E0E0'); y += 20;

    // Resumen fiscal
    const sumX = W - M - 200;
    const rowFiscal = (label, value, bold = false) => {
        doc.fillColor(GREY_MID).font('Helvetica').fontSize(9.5).text(label, sumX, y, { width: 110 });
        doc.fillColor(GREY_DARK).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5).text(value, sumX + 110, y, { width: 90, align: 'right' });
        y += bold ? 20 : 16;
        if (bold) doc.moveTo(sumX, y - 4).lineTo(W - M, y - 4).stroke('#E0E0E0');
    };
    rowFiscal('Base imponible', fmtCurrency(invoice.subtotal_amount ?? invoice.total_amount));
    rowFiscal('IVA',            fmtCurrency(invoice.tax_amount ?? 0));
    y += 4;
    doc.rect(sumX - 8, y, 208, 32).fill(PRIMARY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9).text('TOTAL', sumX, y + 11, { width: 100 });
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(16).text(fmtCurrency(invoice.total_amount), sumX + 100, y + 7, { width: 100, align: 'right' });
    y += 50;

    if (invoice.notes) {
        doc.rect(M, y, W - M * 2, 1).fill('#E0E0E0'); y += 12;
        doc.fillColor(GREY_MID).font('Helvetica-Bold').fontSize(8).text('NOTAS Y CONDICIONES', M, y, { characterSpacing: 1 }); y += 12;
        doc.fillColor(GREY_MID).font('Helvetica').fontSize(9).text(invoice.notes, M, y, { width: W - M * 2 });
    }

    doc.rect(0, 800, W, 41.89).fill('#F8FAFF');
    doc.fillColor(GREY_LIGHT).font('Helvetica').fontSize(8).text('⚡ Factura gestionada con Workly', M, 814);
    doc.fillColor(PRIMARY).font('Helvetica-Bold').text('workly.app', W - M - 80, 814, { width: 80, align: 'right' });
};

/** Stream PDF directo a respuesta HTTP (descarga) */
export const generateInvoicePDF = (invoice, items, client, res) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    doc.pipe(res);
    buildPDF(doc, invoice, items, client);
    doc.end();
};

/** Genera PDF como Buffer para adjuntar en emails */
export const generateInvoicePDFBuffer = (invoice, items, client) =>
    new Promise((resolve, reject) => {
        const doc    = new PDFDocument({ margin: 0, size: 'A4' });
        const chunks = [];
        doc.on('data',  c => chunks.push(c));
        doc.on('end',   () => resolve(Buffer.concat(chunks)));
        doc.on('error', e  => reject(e));
        buildPDF(doc, invoice, items, client);
        doc.end();
    });