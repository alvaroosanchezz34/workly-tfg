import { useState } from 'react';
import { Select, Textarea } from './FormComponents';
import InvoiceItems from './InvoiceItems';

const STATUS_OPTIONS = [
    { value: 'draft',   label: 'Borrador' },
    { value: 'sent',    label: 'Enviada'  },
    { value: 'paid',    label: 'Pagada'   },
    { value: 'overdue', label: 'Vencida'  },
];

export default function InvoiceForm({ clients, projects, onSubmit, initialData }) {
    const formatDate = (date) => (!date ? '' : date.split('T')[0]);

    const [items, setItems] = useState(
        initialData?.items?.length
            ? initialData.items
            : [{ id: Date.now(), description: '', quantity: 1, unit_price: 0, total: 0 }]
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

    const total = items.reduce((sum, i) => sum + Number(i.total || 0), 0);

    const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.client_id) return alert('El cliente es obligatorio');
        if (!form.issue_date) return alert('La fecha de emisión es obligatoria');
        if (items.length === 0) return alert('Añade al menos una línea a la factura');
        onSubmit({ ...form, items, id: initialData?.id });
    };

    return (
        <form id="invoice-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Fila 1: Cliente + Proyecto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">
                        Cliente <span style={{ color: 'var(--error)', marginLeft: 3 }}>*</span>
                    </label>
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

            {/* Fila 2: Fechas + Estado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">
                        Fecha de emisión <span style={{ color: 'var(--error)', marginLeft: 3 }}>*</span>
                    </label>
                    <input
                        type="date"
                        name="issue_date"
                        value={form.issue_date}
                        onChange={set}
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Fecha de vencimiento</label>
                    <input
                        type="date"
                        name="due_date"
                        value={form.due_date}
                        onChange={set}
                        className="form-input"
                    />
                </div>

                <Select
                    label="Estado"
                    name="status"
                    value={form.status}
                    onChange={set}
                    options={STATUS_OPTIONS}
                />
            </div>

            {/* Líneas de factura */}
            <div>
                <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Líneas de factura</label>
                <InvoiceItems items={items} setItems={setItems} />
            </div>

            {/* Total */}
            <div style={{
                display: 'flex', justifyContent: 'flex-end',
                padding: '12px 16px',
                background: 'var(--primary-light)',
                borderRadius: 8,
                alignItems: 'center',
                gap: 12,
            }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Total</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(total)}
                </span>
            </div>

            {/* Notas */}
            <Textarea
                label="Notas y condiciones"
                name="notes"
                value={form.notes}
                onChange={set}
                placeholder="Condiciones de pago, información adicional…"
                rows={3}
            />
        </form>
    );
}