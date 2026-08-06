// frontend/src/components/RecurringExpensesTab.jsx
import { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import { Select, Input, FormFooter } from './FormComponents';
import {
    getRecurringExpenses, createRecurringExpense,
    updateRecurringExpenseStatus, deleteRecurringExpense,
} from '../api/recurringExpenses';
import { Plus, RefreshCcw, Pause, Play, Trash2 } from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const FREQ_LABEL = { weekly: 'Semanal', monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual' };
const FREQ_OPTS  = Object.entries(FREQ_LABEL).map(([value, label]) => ({ value, label }));
const STATUS_COL = { active: 'var(--secondary)', paused: 'var(--warning)', finished: 'var(--text-disabled)' };

const CATS = [
    { value: 'software',   label: 'Software / Licencias' },
    { value: 'hardware',   label: 'Hardware / Equipos' },
    { value: 'oficina',    label: 'Oficina / Material' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'marketing',  label: 'Marketing / Publicidad' },
    { value: 'formacion',  label: 'Formación' },
    { value: 'servicios',  label: 'Servicios externos' },
    { value: 'otros',      label: 'Otros' },
];

function RecurringExpenseForm({ onSubmit, onCancel }) {
    const [form, setForm] = useState({
        category: '', description: '', amount: '', frequency: 'monthly',
        next_date: new Date().toISOString().split('T')[0], end_date: '',
    });
    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = e => {
        e.preventDefault();
        if (!form.amount || !form.next_date) return alert('Importe y fecha de inicio son obligatorios');
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Select label="Categoría" name="category" value={form.category} onChange={set} placeholder="Selecciona…" options={CATS} />
                <Input  label="Importe (€)" name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={set} required placeholder="0.00" />
                <div style={{ gridColumn: '1 / -1' }}>
                    <Input label="Descripción" name="description" value={form.description} onChange={set} placeholder="Ej: Alquiler oficina, suscripción SaaS…" />
                </div>
                <Select label="Frecuencia" name="frequency" value={form.frequency} onChange={set} options={FREQ_OPTS} />
                <Input  label="Primera fecha *" name="next_date" type="date" value={form.next_date} onChange={set} required />
                <Input  label="Fecha fin (opcional)" name="end_date" type="date" value={form.end_date} onChange={set} />
            </div>
            <FormFooter onCancel={onCancel} submitLabel="Crear recurrente" />
        </form>
    );
}

export default function RecurringExpensesTab({ token, onProcessed }) {
    const [list,     setList]     = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [showForm, setShowForm] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setList(await getRecurringExpenses(token)); }
        finally { setLoading(false); }
    }, [token]);
    useEffect(() => { if (token) load(); }, [token, load]);

    const handleCreate = async data => { await createRecurringExpense(token, data); setShowForm(false); load(); onProcessed?.(); };
    const handleStatus = async (id, status) => { await updateRecurringExpenseStatus(token, id, status); load(); onProcessed?.(); };
    const handleDelete = async id => { if (!confirm('¿Eliminar este gasto recurrente?')) return; await deleteRecurringExpense(token, id); load(); onProcessed?.(); };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{list.length} gasto{list.length !== 1 ? 's' : ''} recurrente{list.length !== 1 ? 's' : ''}</p>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nuevo gasto recurrente</button>
            </div>

            {loading ? (
                <div className="table-wrap">{[...Array(3)].map((_, i) => <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5' }}><div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} /></div>)}</div>
            ) : list.length === 0 ? (
                <div className="table-wrap"><div className="empty-state"><div className="empty-icon"><RefreshCcw size={22} /></div><p className="empty-title">Sin gastos recurrentes</p><p className="empty-desc">Configura gastos fijos (alquiler, SaaS…) para que se registren solos con la frecuencia que necesites</p></div></div>
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>Descripción</th><th>Categoría</th><th>Frecuencia</th><th>Próximo cargo</th><th>Fin</th><th style={{ textAlign: 'right' }}>Importe</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                        <tbody>
                            {list.map((r, idx) => (
                                <tr key={r.id} style={{ animationDelay: `${idx * 20}ms` }}>
                                    <td style={{ fontWeight: 500 }}>{r.description || '—'}</td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{r.category || '—'}</td>
                                    <td><span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 99, border: '1px solid var(--border)' }}>{FREQ_LABEL[r.frequency]}</span></td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtDate(r.next_date)}</td>
                                    <td style={{ fontSize: 13, color: 'var(--text-disabled)' }}>{r.end_date ? fmtDate(r.end_date) : '—'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.amount)}</td>
                                    <td>
                                        <span style={{ fontSize: 11.5, fontWeight: 600, color: STATUS_COL[r.status] || 'var(--text-disabled)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COL[r.status], flexShrink: 0 }} />
                                            {r.status === 'active' ? 'Activo' : r.status === 'paused' ? 'Pausado' : 'Finalizado'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {r.status === 'active'  && <button className="btn-icon" title="Pausar"   aria-label="Pausar"   onClick={() => handleStatus(r.id, 'paused')} style={{ marginRight: 4, display: 'inline-flex' }}><Pause size={12} /></button>}
                                        {r.status === 'paused'  && <button className="btn-icon" title="Reanudar" aria-label="Reanudar" onClick={() => handleStatus(r.id, 'active')} style={{ marginRight: 4, display: 'inline-flex' }}><Play  size={12} /></button>}
                                        <button className="btn-icon" title="Eliminar" aria-label="Eliminar" onClick={() => handleDelete(r.id)} style={{ display: 'inline-flex', background: 'var(--error-light)', color: 'var(--error)' }}><Trash2 size={12} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal open={showForm} title="Nuevo gasto recurrente" onClose={() => setShowForm(false)}>
                <RecurringExpenseForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
            </Modal>
        </div>
    );
}
