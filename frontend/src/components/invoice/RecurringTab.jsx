// frontend/src/components/invoice/RecurringTab.jsx
import { useEffect, useState } from 'react';
import Modal from '../Modal';
import InvoiceItems from '../InvoiceItems';
import { getRecurring, createRecurring, updateRecurringStatus, deleteRecurring } from '../../api/recurringInvoices';
import { Plus, RefreshCcw, Pause, Play, Trash2 } from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const FREQ_LABEL = { weekly: 'Semanal', monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual' };
const FREQ_OPTS  = Object.entries(FREQ_LABEL).map(([value, label]) => ({ value, label }));
const STATUS_COL = { active: 'var(--secondary)', paused: 'var(--warning)', finished: 'var(--text-disabled)' };
const genId      = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

function RecurringForm({ clients, projects, services, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        client_id: '', project_id: '', frequency: 'monthly',
        next_date: new Date().toISOString().split('T')[0], end_date: '', notes: '',
    });
    const [items, setItems] = useState([{ id: genId(), description: '', quantity: 1, unit_price: 0, tax_rate: 21, subtotal: 0, tax_amount: 0, total: 0 }]);
    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = e => {
        e.preventDefault();
        if (!form.client_id || !form.next_date) return alert('Cliente y fecha de inicio son obligatorios');
        onSubmit({ ...form, items });
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Cliente *</label>
                    <select name="client_id" className="form-select" value={form.client_id} onChange={set} required>
                        <option value="">Selecciona cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Frecuencia</label>
                    <select name="frequency" className="form-select" value={form.frequency} onChange={set}>
                        {FREQ_OPTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Primera emisión *</label>
                    <input type="date" name="next_date" className="form-input" value={form.next_date} onChange={set} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha fin (opcional)</label>
                    <input type="date" name="end_date" className="form-input" value={form.end_date} onChange={set} />
                </div>
            </div>
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Líneas de factura</label>
            <InvoiceItems items={items} setItems={setItems} services={services} />
            <div className="form-group">
                <label className="form-label">Notas</label>
                <input type="text" name="notes" className="form-input" value={form.notes} onChange={set} placeholder="Concepto recurrente…" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear recurrente</button>
            </div>
        </form>
    );
}

export default function RecurringTab({ token, clients, projects, services, onProcessed }) {
    const [list,     setList]     = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [showForm, setShowForm] = useState(false);

    const load = async () => {
        setLoading(true);
        try { setList(await getRecurring(token)); }
        finally { setLoading(false); }
    };
    useEffect(() => { if (token) load(); }, [token]);

    const handleCreate = async data => { await createRecurring(token, data); setShowForm(false); load(); };
    const handleStatus = async (id, status) => { await updateRecurringStatus(token, id, status); load(); };
    const handleDelete = async id => { if (!confirm('¿Eliminar esta recurrente?')) return; await deleteRecurring(token, id); load(); };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{list.length} plantilla{list.length !== 1 ? 's' : ''} recurrente{list.length !== 1 ? 's' : ''}</p>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nueva recurrente</button>
            </div>

            {loading ? (
                <div className="table-wrap">{[...Array(3)].map((_, i) => <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5' }}><div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} /></div>)}</div>
            ) : list.length === 0 ? (
                <div className="table-wrap"><div className="empty-state"><div className="empty-icon"><RefreshCcw size={22} /></div><p className="empty-title">Sin facturas recurrentes</p><p className="empty-desc">Configura facturas que se generen automáticamente con la frecuencia que necesites</p></div></div>
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>Cliente</th><th>Frecuencia</th><th>Próxima emisión</th><th>Fin</th><th style={{ textAlign: 'right' }}>Importe</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                        <tbody>
                            {list.map((r, idx) => (
                                <tr key={r.id} style={{ animationDelay: `${idx * 20}ms` }}>
                                    <td style={{ fontWeight: 500 }}>{r.client_name}</td>
                                    <td><span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 99, border: '1px solid var(--border)' }}>{FREQ_LABEL[r.frequency]}</span></td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtDate(r.next_date)}</td>
                                    <td style={{ fontSize: 13, color: 'var(--text-disabled)' }}>{r.end_date ? fmtDate(r.end_date) : '—'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total_amount)}</td>
                                    <td>
                                        <span style={{ fontSize: 11.5, fontWeight: 600, color: STATUS_COL[r.status] || 'var(--text-disabled)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COL[r.status], flexShrink: 0 }} />
                                            {r.status === 'active' ? 'Activa' : r.status === 'paused' ? 'Pausada' : 'Finalizada'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {r.status === 'active'  && <button className="btn-icon" title="Pausar"    onClick={() => handleStatus(r.id, 'paused')}   style={{ marginRight: 4, display: 'inline-flex' }}><Pause size={12} /></button>}
                                        {r.status === 'paused'  && <button className="btn-icon" title="Reanudar"  onClick={() => handleStatus(r.id, 'active')}   style={{ marginRight: 4, display: 'inline-flex' }}><Play  size={12} /></button>}
                                        <button className="btn-icon" title="Eliminar" onClick={() => handleDelete(r.id)} style={{ display: 'inline-flex', background: 'var(--error-light)', color: 'var(--error)' }}><Trash2 size={12} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal open={showForm} size="lg" title="Nueva factura recurrente" onClose={() => setShowForm(false)}>
                <RecurringForm clients={clients} projects={projects} services={services} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
            </Modal>
        </div>
    );
}