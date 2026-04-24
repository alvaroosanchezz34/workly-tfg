import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import Modal from '../Modal';
import InvoiceItems from '../InvoiceItems';
import { Select, Textarea } from '../FormComponents';
import { getQuotes, createQuote, updateQuote, deleteQuote, convertQuote } from '../../api/quotes';
import { Plus, FileText, ArrowRight, CheckCircle } from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS = {
    draft:    { label: 'Borrador',  cls: 'badge badge-draft'    },
    sent:     { label: 'Enviado',   cls: 'badge badge-sent'     },
    accepted: { label: 'Aceptado',  cls: 'badge badge-paid'     },
    rejected: { label: 'Rechazado', cls: 'badge badge-overdue'  },
    expired:  { label: 'Expirado',  cls: 'badge badge-cancelled' },
};

const genId = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

function QuoteForm({ clients, projects, services, initialData, onSubmit, onCancel }) {
    const fmt2d = d => (!d ? '' : d.split('T')[0]);
    const [form, setForm] = useState({
        client_id: initialData?.client_id || '', project_id: initialData?.project_id || '',
        issue_date: fmt2d(initialData?.issue_date), expiry_date: fmt2d(initialData?.expiry_date),
        status: initialData?.status || 'draft', notes: initialData?.notes || '',
    });
    const [items, setItems] = useState(
        initialData?.items?.length
            ? initialData.items.map(i => ({ ...i, id: i.id || genId() }))
            : [{ id: genId(), description: '', quantity: 1, unit_price: 0, tax_rate: 21, subtotal: 0, tax_amount: 0, total: 0 }]
    );
    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    const subtotal = items.reduce((s, i) => s + Number(i.subtotal || 0), 0);
    const taxTotal = items.reduce((s, i) => s + Number(i.tax_amount || 0), 0);

    const STATUS_OPTS = [
        { value: 'draft', label: 'Borrador' }, { value: 'sent', label: 'Enviado' },
        { value: 'accepted', label: 'Aceptado' }, { value: 'rejected', label: 'Rechazado' },
    ];

    const handleSubmit = e => {
        e.preventDefault();
        if (!form.client_id || !form.issue_date) return alert('Cliente y fecha son obligatorios');
        onSubmit({ ...form, items, id: initialData?.id });
    };

    return (
        <form id="quote-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Cliente *</label>
                    <select name="client_id" value={form.client_id} onChange={set} className="form-select" required>
                        <option value="">Selecciona cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Proyecto</label>
                    <select name="project_id" value={form.project_id} onChange={set} className="form-select">
                        <option value="">Sin proyecto</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha emisión *</label>
                    <input type="date" name="issue_date" className="form-input" value={form.issue_date} onChange={set} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha expiración</label>
                    <input type="date" name="expiry_date" className="form-input" value={form.expiry_date} onChange={set} />
                </div>
            </div>
            <Select label="Estado" name="status" value={form.status} onChange={set} options={STATUS_OPTS} />
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Líneas</label>
            <InvoiceItems items={items} setItems={setItems} services={services} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ minWidth: 220, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                    {[['Base', fmt(subtotal)], ['IVA', fmt(taxTotal)], ['Total', fmt(subtotal + taxTotal)]].map(([l, v], i) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l}</span>
                            <span style={{ fontWeight: i === 2 ? 800 : 600, fontSize: i === 2 ? 16 : 13, color: i === 2 ? 'var(--primary)' : 'var(--text-primary)' }}>{v}</span>
                        </div>
                    ))}
                </div>
            </div>
            <Textarea label="Notas" name="notes" value={form.notes} onChange={set} rows={2} placeholder="Condiciones, validez del presupuesto…" />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar presupuesto</button>
            </div>
        </form>
    );
}

export default function QuotesTab({ token, clients, projects, services }) {
    const [quotes,   setQuotes]   = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing,  setEditing]  = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [converting, setConverting] = useState(null);
    const [convDates,  setConvDates]  = useState({ issue_date: new Date().toISOString().split('T')[0], due_date: '' });

    const load = async () => {
        setLoading(true);
        try { setQuotes(await getQuotes(token)); }
        finally { setLoading(false); }
    };
    useEffect(() => { if (token) load(); }, [token]);

    const handleSubmit = async data => {
        if (data.id) await updateQuote(token, data.id, data);
        else         await createQuote(token, data);
        setShowForm(false); setEditing(null); load();
    };
    const handleDelete = async () => { await deleteQuote(token, toDelete.id); setToDelete(null); load(); };
    const handleConvert = async () => {
        try {
            const result = await convertQuote(token, converting.id, convDates);
            alert(`Factura ${result.invoice_number} creada correctamente`);
            setConverting(null); load();
        } catch (err) { alert(err.message); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{quotes.length} presupuesto{quotes.length !== 1 ? 's' : ''}</p>
                <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                    <Plus size={14} /> Nuevo presupuesto
                </button>
            </div>

            {loading ? (
                <div className="table-wrap">{[...Array(3)].map((_, i) => <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5' }}><div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 10, width: '25%' }} /></div>)}</div>
            ) : quotes.length === 0 ? (
                <div className="table-wrap"><div className="empty-state"><div className="empty-icon"><FileText size={22} /></div><p className="empty-title">Sin presupuestos</p><p className="empty-desc">Crea presupuestos y conviértelos en facturas con un clic</p></div></div>
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>Número</th><th>Cliente</th><th>Estado</th><th>Emisión</th><th>Expiración</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                        <tbody>
                            {quotes.map((q, idx) => {
                                const s = STATUS[q.status] || STATUS.draft;
                                return (
                                    <tr key={q.id} style={{ animationDelay: `${idx * 20}ms` }}>
                                        <td style={{ fontWeight: 600, fontSize: 13 }}>{q.quote_number}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{q.client_name}</td>
                                        <td><span className={s.cls}><span className="badge-dot" />{s.label}</span></td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtDate(q.issue_date)}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtDate(q.expiry_date)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(q.total_amount)}</td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {!q.converted_to_invoice_id && q.status !== 'rejected' && (
                                                <button className="action-link" style={{ color: 'var(--secondary)', marginRight: 4 }}
                                                    onClick={() => setConverting(q)}
                                                    title="Convertir a factura">
                                                    <ArrowRight size={13} style={{ verticalAlign: 'middle' }} /> Facturar
                                                </button>
                                            )}
                                            {q.converted_to_invoice_id && (
                                                <span style={{ fontSize: 11, color: 'var(--secondary)', marginRight: 8, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                    <CheckCircle size={11} /> Facturado
                                                </span>
                                            )}
                                            <button className="action-link action-link-primary" onClick={() => { setEditing(q); setShowForm(true); }}>Editar</button>
                                            <button className="action-link action-link-danger" style={{ marginLeft: 4 }} onClick={() => setToDelete(q)}>Eliminar</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal open={showForm} size="lg" title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'} onClose={() => { setShowForm(false); setEditing(null); }}>
                <QuoteForm clients={clients} projects={projects} services={services} initialData={editing}
                    onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} />
            </Modal>

            <Modal open={!!toDelete} title="Eliminar presupuesto" onClose={() => setToDelete(null)}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    ¿Eliminar el presupuesto <strong>{toDelete?.quote_number}</strong>?
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>

            <Modal open={!!converting} title={`Convertir a factura — ${converting?.quote_number}`} onClose={() => setConverting(null)}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Se creará una factura borrador con todas las líneas del presupuesto.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div className="form-group">
                        <label className="form-label">Fecha de emisión</label>
                        <input type="date" className="form-input" value={convDates.issue_date} onChange={e => setConvDates(f => ({ ...f, issue_date: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Fecha de vencimiento</label>
                        <input type="date" className="form-input" value={convDates.due_date} onChange={e => setConvDates(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setConverting(null)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleConvert}>
                        <ArrowRight size={14} /> Crear factura
                    </button>
                </div>
            </Modal>
        </div>
    );
}