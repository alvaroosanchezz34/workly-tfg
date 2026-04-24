// frontend/src/components/invoice/CreditNotesTab.jsx
import { useEffect, useState } from 'react';
import Modal from '../Modal';
import InvoiceItems from '../InvoiceItems';
import { getCreditNotes, createCreditNote, issueCreditNote, deleteCreditNote } from '../../api/creditNotes';
import { Plus, FileX, CheckCircle } from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const genId   = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

function CreditNoteForm({ invoices, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        invoice_id: '', issue_date: new Date().toISOString().split('T')[0], reason: '',
    });
    const [items, setItems] = useState([{ id: genId(), description: '', quantity: 1, unit_price: 0, tax_rate: 21, subtotal: 0, tax_amount: 0, total: 0 }]);
    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = e => {
        e.preventDefault();
        if (!form.invoice_id) return alert('Debes seleccionar una factura');
        onSubmit({ ...form, items });
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Factura a rectificar *</label>
                    <select name="invoice_id" className="form-select" value={form.invoice_id} onChange={set} required>
                        <option value="">Selecciona factura</option>
                        {invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {i.client_name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha de emisión *</label>
                    <input type="date" name="issue_date" className="form-input" value={form.issue_date} onChange={set} required />
                </div>
            </div>
            <div className="form-group">
                <label className="form-label">Motivo</label>
                <input type="text" name="reason" className="form-input" value={form.reason} onChange={set} placeholder="Motivo de la rectificación…" />
            </div>
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Líneas a rectificar</label>
            <InvoiceItems items={items} setItems={setItems} services={[]} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Crear nota de crédito</button>
            </div>
        </form>
    );
}

export default function CreditNotesTab({ token, invoices }) {
    const [notes,    setNotes]    = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [showForm, setShowForm] = useState(false);

    const load = async () => {
        setLoading(true);
        try { setNotes(await getCreditNotes(token)); }
        finally { setLoading(false); }
    };
    useEffect(() => { if (token) load(); }, [token]);

    const handleCreate = async data => { await createCreditNote(token, data); setShowForm(false); load(); };
    const handleIssue  = async id   => { if (!confirm('¿Emitir esta nota de crédito? No podrás editarla.')) return; await issueCreditNote(token, id); load(); };
    const handleDelete = async id   => { if (!confirm('¿Eliminar esta nota de crédito?')) return; await deleteCreditNote(token, id); load(); };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{notes.length} nota{notes.length !== 1 ? 's' : ''} de crédito</p>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Nueva nota de crédito</button>
            </div>

            {loading ? (
                <div className="table-wrap">{[...Array(3)].map((_, i) => <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5' }}><div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} /></div>)}</div>
            ) : notes.length === 0 ? (
                <div className="table-wrap"><div className="empty-state"><div className="empty-icon"><FileX size={22} /></div><p className="empty-title">Sin notas de crédito</p><p className="empty-desc">Las notas de crédito permiten rectificar facturas ya emitidas</p></div></div>
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>Número</th><th>Factura</th><th>Cliente</th><th>Fecha</th><th>Motivo</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                        <tbody>
                            {notes.map((n, idx) => (
                                <tr key={n.id} style={{ animationDelay: `${idx * 20}ms` }}>
                                    <td style={{ fontWeight: 600, fontSize: 13 }}>{n.credit_number}</td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{n.invoice_number}</td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{n.client_name}</td>
                                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtDate(n.issue_date)}</td>
                                    <td style={{ fontSize: 12.5, color: 'var(--text-disabled)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.reason || '—'}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--error)', fontVariantNumeric: 'tabular-nums' }}>-{fmt(n.total_amount)}</td>
                                    <td>
                                        {n.status === 'issued'
                                            ? <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={11} /> Emitida</span>
                                            : <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-disabled)' }}>Borrador</span>
                                        }
                                    </td>
                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {n.status === 'draft' && (
                                            <>
                                                <button className="action-link" style={{ color: 'var(--secondary)', marginRight: 4 }} onClick={() => handleIssue(n.id)}>Emitir</button>
                                                <button className="action-link action-link-danger" onClick={() => handleDelete(n.id)}>Eliminar</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal open={showForm} size="lg" title="Nueva nota de crédito / rectificativa" onClose={() => setShowForm(false)}>
                <CreditNoteForm invoices={invoices} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
            </Modal>
        </div>
    );
}