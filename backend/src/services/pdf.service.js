// backend/src/services/pdf.service.js
import PDFDocument from 'pdfkit';
import { QR_LABEL, QR_SIZE_PT } from './verifactu/qr.js';

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

const buildPDF = (doc, invoice, items, client, qrBuffer) => {
    const W = 595.28;
    const M = 48;
    const issuerName = invoice.issuer_legal_name || invoice.issuer_company || invoice.issuer_name || 'Workly';
    const customerName = client?.name || 'Cliente';

    doc.rect(0, 0, W, 140).fill(PRIMARY);
    doc.rect(M, 32, 36, 36).fill(WHITE).fillOpacity(0.15);
    doc.fillOpacity(1).fillColor(WHITE).fontSize(18).font('Helvetica-Bold').text('W', M + 10, 42);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(18).text(issuerName, M + 50, 34, { width: 250 });
    let headerY = 56;
    doc.fillColor(WHITE).font('Helvetica').fontSize(9);
    if (invoice.issuer_tax_id) {
        doc.text(`NIF ${invoice.issuer_tax_id}`, M + 50, headerY, { width: 250 });
        headerY += 12;
    }
    if (invoice.issuer_email) doc.text(invoice.issuer_email, M + 50, headerY, { width: 250 });

    const numberLabel = invoice.invoice_number || 'BORRADOR';
    doc.fillColor(WHITE).font('Helvetica').fontSize(9).text(invoice.invoice_type === 'rectificativa' ? 'FACTURA RECTIFICATIVA' : 'FACTURA', W - M - 180, 30, { width: 180, align: 'right' })
       .fontSize(16).font('Helvetica-Bold').text(numberLabel, W - M - 180, 44, { width: 180, align: 'right' });

    const statusColor = invoice.status === 'paid' ? SUCCESS : invoice.status === 'overdue' || invoice.status === 'void' ? ERROR_C : WHITE;
    const statusLabel = { draft: 'BORRADOR', sent: 'EMITIDA', paid: 'PAGADA', overdue: 'VENCIDA', void: 'ANULADA' }[invoice.status] || String(invoice.status || '').toUpperCase();
    doc.roundedRect(W - M - 80, 78, 80, 22, 4).fill('rgba(255,255,255,0.15)');
    doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(8).text(statusLabel, W - M - 80, 85, { width: 80, align: 'center' });

    let y = 155;
    if (qrBuffer) {
        const qrSize = QR_SIZE_PT;
        doc.fillColor(GREY_DARK).font('Helvetica-Bold').fontSize(8)
            .text(QR_LABEL, M, y, { width: qrSize, align: 'center' });
        y += 12;
        doc.image(qrBuffer, M, y, { width: qrSize });
        y += qrSize + 4;
        if (invoice.verifactu_legend) {
            doc.font('Helvetica-Bold').fontSize(9)
                .text(invoice.verifactu_legend, M, y, { width: qrSize, align: 'center' });
            y += 14;
        }
        y += 10;
    }

    const blockTop = y;
    doc.rect(0, blockTop, W, 120).fill(BG_LIGHT);
    doc.fillColor(GREY_LIGHT).font('Helvetica-Bold').fontSize(7.5).text('FACTURAR A', M, blockTop + 12, { characterSpacing: 1 });
    let cy = blockTop + 26;
    doc.fillColor(GREY_DARK).font('Helvetica-Bold').fontSize(13).text(customerName, M, cy); cy += 16;
    if (client?.company && client.company !== customerName) { doc.fillColor(GREY_MID).font('Helvetica').fontSize(9.5).text(client.company, M, cy); cy += 13; }
    if (client?.address) { doc.fillColor(GREY_MID).font('Helvetica').fontSize(9).text(client.address, M, cy, { width: 230 }); cy += 13; }
    if (client?.document) { doc.fillColor(GREY_LIGHT).font('Helvetica').fontSize(9).text(`NIF: ${client.document}`, M, cy); }

    const datesX = W / 2 + 40;
    let dy = blockTop + 12;
    const dateRow = (label, value, color = GREY_DARK) => {
        doc.fillColor(GREY_LIGHT).font('Helvetica-Bold').fontSize(7.5).text(label, datesX, dy, { characterSpacing: 1 }); dy += 12;
        doc.fillColor(color).font('Helvetica-Bold').fontSize(10).text(value, datesX, dy); dy += 20;
    };
    dateRow('FECHA DE EMISIÓN', fmtDate(invoice.issue_date));
    dateRow('FECHA DE VENCIMIENTO', fmtDate(invoice.due_date), invoice.status === 'overdue' ? ERROR_C : GREY_DARK);
    if (invoice.issuer_fiscal_address) {
        doc.fillColor(GREY_LIGHT).font('Helvetica-Bold').fontSize(7.5).text('DOMICILIO FISCAL', datesX, dy, { characterSpacing: 1 }); dy += 12;
        doc.fillColor(GREY_MID).font('Helvetica').fontSize(8).text(invoice.issuer_fiscal_address, datesX, dy, { width: 200 });
    }

    y = blockTop + 136;
    const colW = { desc: 210, qty: 50, price: 70, tax: 50, total: 80 };
    const colX = { desc: M, qty: M + 210, price: M + 260, tax: M + 330, total: M + 390 };
    doc.rect(M, y, W - M * 2, 24).fill(PRIMARY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8);
    [['DESCRIPCIÓN', colX.desc, colW.desc], ['CANT.', colX.qty, colW.qty], ['PRECIO/U.', colX.price, colW.price], ['IVA%', colX.tax, colW.tax], ['TOTAL', colX.total, colW.total]]
        .forEach(([h, x, w], i) => doc.text(h, x + 6, y + 8, { width: w - 6, align: i > 0 ? 'right' : 'left' }));
    y += 24;

    (items || []).forEach((item, i) => {
        const rowH = 26;
        doc.rect(M, y, W - M * 2, rowH).fill(i % 2 === 0 ? '#F0F4FF' : WHITE);
        doc.fillColor(GREY_DARK).font('Helvetica').fontSize(9);
        doc.text(item.description || '', colX.desc + 6, y + 8, { width: colW.desc - 12 });
        doc.text(String(item.quantity), colX.qty + 6, y + 8, { width: colW.qty - 10, align: 'right' });
        doc.text(fmtCurrency(item.unit_price), colX.price + 6, y + 8, { width: colW.price - 10, align: 'right' });
        doc.fillColor(GREY_MID).text(`${item.tax_rate ?? 21}%`, colX.tax + 6, y + 8, { width: colW.tax - 10, align: 'right' });
        doc.fillColor(GREY_DARK).font('Helvetica-Bold').text(fmtCurrency(item.total), colX.total + 6, y + 8, { width: colW.total - 10, align: 'right' });
        y += rowH;
    });

    doc.moveTo(M, y).lineTo(W - M, y).stroke('#E0E0E0'); y += 16;

    const groups = new Map();
    for (const item of items || []) {
        const rate = Number(item.tax_rate ?? 0);
        const current = groups.get(rate) || { base: 0, cuota: 0, re: 0, reRate: Number(item.equivalence_surcharge_rate || 0) };
        current.base += Number(item.subtotal || 0);
        current.cuota += Number(item.tax_amount || 0);
        current.re += Number(item.equivalence_surcharge_amount || 0);
        if (Number(item.equivalence_surcharge_rate || 0) > 0) current.reRate = Number(item.equivalence_surcharge_rate);
        groups.set(rate, current);
    }

    const sumX = W - M - 230;
    const rowFiscal = (label, value, bold = false) => {
        doc.fillColor(GREY_MID).font('Helvetica').fontSize(9).text(label, sumX, y, { width: 130 });
        doc.fillColor(GREY_DARK).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9).text(value, sumX + 130, y, { width: 100, align: 'right' });
        y += bold ? 20 : 15;
    };
    for (const [rate, group] of groups) {
        rowFiscal(`Base IVA ${rate}%`, fmtCurrency(group.base));
        rowFiscal(`Cuota IVA ${rate}%`, fmtCurrency(group.cuota));
        if (group.re) rowFiscal(`Recargo equiv. ${group.reRate}%`, fmtCurrency(group.re));
    }
    if (!groups.size) rowFiscal('Base imponible', fmtCurrency(invoice.subtotal_amount ?? 0));
    if (Number(invoice.irpf_rate) > 0) rowFiscal(`IRPF ${invoice.irpf_rate}%`, `-${fmtCurrency(invoice.irpf_amount)}`);
    y += 4;
    doc.rect(sumX - 8, y, 238, 32).fill(PRIMARY);
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(9).text('TOTAL', sumX, y + 11, { width: 100 });
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(16).text(fmtCurrency(invoice.total_amount), sumX + 110, y + 7, { width: 110, align: 'right' });
    y += 46;

    if (invoice.invoice_type === 'rectificativa') {
        const methodLabel = invoice.rectification_method === 'difference' ? 'por diferencias' : 'por sustitución';
        doc.fillColor(GREY_MID).font('Helvetica').fontSize(9).text(`Rectifica la factura original ${methodLabel}.`, M, y, { width: W - M * 2 });
        y += 16;
    }
    if (invoice.status === 'void') {
        doc.fillColor(ERROR_C).font('Helvetica-Bold').fontSize(10).text(`ANULADA${invoice.void_reason ? `: ${invoice.void_reason}` : ''}`, M, y, { width: W - M * 2 });
        y += 16;
    }
    if (invoice.notes) {
        doc.rect(M, y, W - M * 2, 1).fill('#E0E0E0'); y += 12;
        doc.fillColor(GREY_MID).font('Helvetica-Bold').fontSize(8).text('NOTAS Y CONDICIONES', M, y, { characterSpacing: 1 }); y += 12;
        doc.fillColor(GREY_MID).font('Helvetica').fontSize(9).text(invoice.notes, M, y, { width: W - M * 2 });
    }

    doc.rect(0, 800, W, 41.89).fill('#F8FAFF');
    doc.fillColor(GREY_LIGHT).font('Helvetica').fontSize(8).text('Factura gestionada con Workly', M, 814);
    doc.fillColor(PRIMARY).font('Helvetica-Bold').text('workly.app', W - M - 80, 814, { width: 80, align: 'right' });
};

export const generateInvoicePDF = (invoice, items, client, res, qrBuffer = null) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    doc.pipe(res);
    buildPDF(doc, invoice, items, client, qrBuffer);
    doc.end();
};

export const generateInvoicePDFBuffer = (invoice, items, client, qrBuffer = null) =>
    new Promise((resolve, reject) => {
        const doc    = new PDFDocument({ margin: 0, size: 'A4' });
        const chunks = [];
        doc.on('data',  c => chunks.push(c));
        doc.on('end',   () => resolve(Buffer.concat(chunks)));
        doc.on('error', e  => reject(e));
        buildPDF(doc, invoice, items, client, qrBuffer);
        doc.end();
    });
