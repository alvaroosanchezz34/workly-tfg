// Cálculo de líneas y totales de una factura española.
// La retención de IRPF se resta de la base. El recargo de equivalencia se suma, como el IVA.

export const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const inRange = (n, max) => Number.isFinite(n) && n >= 0 && n <= max;

export const priceLine = item => {
    const description = String(item?.description ?? '').trim();
    if (!description) {
        const err = new Error('Cada línea necesita una descripción');
        err.statusCode = 400;
        throw err;
    }

    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    const taxRate = item.tax_rate == null || item.tax_rate === '' ? 21 : Number(item.tax_rate);
    const reRate = item.equivalence_surcharge_rate == null || item.equivalence_surcharge_rate === ''
        ? 0
        : Number(item.equivalence_surcharge_rate);

    if (!Number.isFinite(quantity) || quantity === 0) {
        const err = new Error('La cantidad de cada línea tiene que ser distinta de cero');
        err.statusCode = 400;
        throw err;
    }
    if (!Number.isFinite(unitPrice)) {
        const err = new Error('El precio de cada línea no es válido');
        err.statusCode = 400;
        throw err;
    }
    if (!inRange(taxRate, 100)) {
        const err = new Error('El tipo de IVA tiene que estar entre 0 y 100');
        err.statusCode = 400;
        throw err;
    }
    if (!inRange(reRate, 100)) {
        const err = new Error('El recargo de equivalencia tiene que estar entre 0 y 100');
        err.statusCode = 400;
        throw err;
    }

    const subtotal = round2(quantity * unitPrice);
    const taxAmount = round2(subtotal * taxRate / 100);
    const reAmount = round2(subtotal * reRate / 100);
    return {
        description,
        quantity,
        unit_price: unitPrice,
        tax_rate: taxRate,
        equivalence_surcharge_rate: reRate,
        subtotal,
        tax_amount: taxAmount,
        equivalence_surcharge_amount: reAmount,
        total: round2(subtotal + taxAmount + reAmount),
    };
};

export const summarize = (lines, irpfRate = 0) => {
    const rate = irpfRate == null || irpfRate === '' ? 0 : Number(irpfRate);
    if (!inRange(rate, 100)) {
        const err = new Error('La retención de IRPF tiene que estar entre 0 y 100');
        err.statusCode = 400;
        throw err;
    }
    const subtotal = round2(lines.reduce((s, l) => s + Number(l.subtotal), 0));
    const tax = round2(lines.reduce((s, l) => s + Number(l.tax_amount), 0));
    const re = round2(lines.reduce((s, l) => s + Number(l.equivalence_surcharge_amount || 0), 0));
    const irpf = round2(subtotal * rate / 100);
    return {
        subtotal_amount: subtotal,
        tax_amount: tax,
        equivalence_surcharge_amount: re,
        irpf_rate: rate,
        irpf_amount: irpf,
        total_amount: round2(subtotal + tax + re - irpf),
    };
};

export const priceItems = (items, irpfRate) => {
    if (!Array.isArray(items) || items.length === 0) {
        const err = new Error('La factura debe tener al menos una línea');
        err.statusCode = 400;
        throw err;
    }
    const lines = items.map(priceLine);
    return { lines, totals: summarize(lines, irpfRate) };
};
