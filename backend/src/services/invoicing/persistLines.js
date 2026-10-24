export const insertLines = async (conn, invoiceId, lines) => {
    for (const line of lines) {
        await conn.query(
            `INSERT INTO invoice_items
               (invoice_id, description, quantity, unit_price, tax_rate,
                equivalence_surcharge_rate, subtotal, tax_amount, equivalence_surcharge_amount, total)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [
                invoiceId, line.description, line.quantity, line.unit_price, line.tax_rate,
                line.equivalence_surcharge_rate, line.subtotal, line.tax_amount,
                line.equivalence_surcharge_amount, line.total,
            ]
        );
    }
};

export const saveInvoiceTotals = async (conn, invoiceId, totals) => {
    await conn.query(
        `UPDATE invoices
         SET subtotal_amount = ?, tax_amount = ?, equivalence_surcharge_amount = ?,
             irpf_rate = ?, irpf_amount = ?, total_amount = ?
         WHERE id = ?`,
        [
            totals.subtotal_amount, totals.tax_amount, totals.equivalence_surcharge_amount,
            totals.irpf_rate, totals.irpf_amount, totals.total_amount, invoiceId,
        ]
    );
};
