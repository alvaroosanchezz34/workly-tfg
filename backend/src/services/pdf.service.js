import PDFDocument from 'pdfkit';

export const generateInvoicePDF = (invoice, items, client, res) => {
  const doc = new PDFDocument({ margin: 50 });

  // Header
  doc
    .fontSize(20)
    .text('FACTURA', { align: 'center' })
    .moveDown();

  doc
    .fontSize(12)
    .text(`Factura Nº: ${invoice.invoice_number}`)
    .text(`Fecha: ${invoice.issue_date}`)
    .moveDown();

  // Cliente
  doc
    .fontSize(14)
    .text('Cliente', { underline: true })
    .fontSize(12)
    .text(client.name)
    .text(client.email || '')
    .moveDown();

  // Tabla simple
  doc.fontSize(12).text('Detalle', { underline: true }).moveDown();

  items.forEach(item => {
    doc.text(
      `${item.description} - ${item.quantity} x ${item.unit_price} € = ${item.total} €`
    );
  });

  doc.moveDown();
  doc
    .fontSize(14)
    .text(`TOTAL: ${invoice.total_amount} €`, { align: 'right' });

  // Pipe
  doc.pipe(res);
  doc.end();
};
