import { Search, X } from 'lucide-react';

const STATUS_OPTS = [
    { value: '',        label: 'Todos los estados' },
    { value: 'draft',   label: 'Borrador'  },
    { value: 'sent',    label: 'Enviada'   },
    { value: 'paid',    label: 'Pagada'    },
    { value: 'overdue', label: 'Vencida'   },
];

export default function InvoiceFilters({ filters, onChange, clients, onReset }) {
    const set = (field, value) => onChange(prev => ({ ...prev, [field]: value }));
    const hasActive = Object.values(filters).some(v => v !== '');

    return (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, alignItems: 'end' }}>

                {/* Estado */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={filters.status} onChange={e => set('status', e.target.value)}>
                        {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                {/* Cliente */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Cliente</label>
                    <select className="form-select" value={filters.client_id} onChange={e => set('client_id', e.target.value)}>
                        <option value="">Todos los clientes</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Desde */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Emisión desde</label>
                    <input type="date" className="form-input" value={filters.date_from} onChange={e => set('date_from', e.target.value)} />
                </div>

                {/* Hasta */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Emisión hasta</label>
                    <input type="date" className="form-input" value={filters.date_to} onChange={e => set('date_to', e.target.value)} />
                </div>

                {/* Importe mín */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Importe mín. (€)</label>
                    <input type="number" min="0" step="0.01" className="form-input" placeholder="0.00"
                        value={filters.min_amount} onChange={e => set('min_amount', e.target.value)} />
                </div>

                {/* Importe máx */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Importe máx. (€)</label>
                    <input type="number" min="0" step="0.01" className="form-input" placeholder="∞"
                        value={filters.max_amount} onChange={e => set('max_amount', e.target.value)} />
                </div>

                {/* Botón limpiar */}
                {hasActive && (
                    <button type="button" className="btn btn-ghost" onClick={onReset}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, alignSelf: 'flex-end' }}>
                        <X size={13} /> Limpiar
                    </button>
                )}
            </div>
        </div>
    );
}