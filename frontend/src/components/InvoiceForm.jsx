import { useState } from 'react';
import { Select, Textarea } from './FormComponents';
import InvoiceItems from './InvoiceItems';

const STATUS_OPTIONS = [
    { value: 'draft',   label: 'Borrador' },
    { value: 'sent',    label: 'Enviada'  },
    { value: 'paid',    label: 'Pagada'   },
    { value: 'overdue', label: 'Vencida'  },
];

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

export default function InvoiceForm({ clients, projects, services = [], onSubmit, initialData }) {
    const formatDate = d => (!d ? '' : d.split('T')[0]);

    const [items, setItems] = useState(
        initialData?.items?.length
            ? initialData.items.map(i => ({
                ...i,
                id: i.id || `item_${Math.random().toString(36).slice(2)}`,
                tax_rate: i.tax_rate ?? 21,
            }))
            : [{ id: `item_${Date.now()}`, description: '', quantity: 1, unit_price: 0, tax_rate: 21, subtotal: 0, tax_amount: 0, total: 0 }]
    );

    const [form, setForm] = useState({
        client_id:  initialData?.client_id  || '',
        project_id: initialData?.project_id || '',
        issue_date: formatDate(initialData?.issue_date),
        due_date:   formatDate(initialData?.due_date),
        status:     initialData?.status     || 'draft',
        notes:      initialData?.notes      || '',
    });

    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const subtotal = items.reduce((s, i) => s + Number(i.subtotal   || 0), 0);
    const taxTotal = items.reduce((s, i) => s + Number(i.tax_amount || 0), 0);
    const total    = subtotal + taxTotal;

    const handleSubmit = e => {
        e.preventDefault();
        if (!form.client_id)    return alert('El cliente es obligatorio');
        if (!form.issue_date)   return alert('La fecha de emisión es obligatoria');
        if (items.length === 0) return alert('Añade al menos una línea a la factura');
        onSubmit({ ...form, items, id: initialData?.id });
    };

    return (
        <form id="invoice-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Cliente + Proyecto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Cliente <span style={{ color: 'var(--error)', marginLeft: 3 }}>*</span></label>
                    <select name="client_id" value={form.client_id} onChange={set} className="form-select" required>
                        <option value="">Selecciona un cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Proyecto (opcional)</label>
                    <select name="project_id" value={form.project_id} onChange={set} className="form-select">
                        <option value="">Sin proyecto</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                </div>
            </div>

            {/* Fechas + Estado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Fecha de emisión <span style={{ color: 'var(--error)', marginLeft: 3 }}>*</span></label>
                    <input type="date" name="issue_date" value={form.issue_date} onChange={set} className="form-input" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha de vencimiento</label>
                    <input type="date" name="due_date" value={form.due_date} onChange={set} className="form-input" />
                </div>
                <Select label="Estado" name="status" value={form.status} onChange={set} options={STATUS_OPTIONS} />
            </div>

            {/* Líneas */}
            <div>
                <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Líneas de factura</label>
                <InvoiceItems items={items} setItems={setItems} services={services} />
            </div>

            {/* Resumen fiscal */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ minWidth: 260, background: 'var(--bg)', borderRadius: 10, padding: '14px 18px', border: '1px solid var(--border)' }}>
                    {[
                        { label: 'Base imponible', value: fmt(subtotal), color: 'var(--text-primary)', bold: false },
                        { label: 'IVA total',      value: fmt(taxTotal), color: 'var(--warning)',      bold: false },
                        { label: 'TOTAL',          value: fmt(total),    color: 'var(--primary)',      bold: true  },
                    ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: row.bold ? 600 : 400 }}>{row.label}</span>
                            <span style={{ fontWeight: row.bold ? 800 : 600, fontSize: row.bold ? 18 : 13, color: row.color, fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Notas */}
            <Textarea label="Notas y condiciones de pago" name="notes" value={form.notes} onChange={set}
                placeholder="Condiciones de pago, información adicional…" rows={2} />
        </form>
    );
}