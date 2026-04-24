import { useEffect, useState } from 'react';
import Modal from '../Modal';
import { getPayments, addPayment, deletePayment } from '../../api/invoices';
import { Plus, Trash2 } from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const METHOD_OPTS = [
    { value: 'transfer', label: 'Transferencia' },
    { value: 'card',     label: 'Tarjeta'       },
    { value: 'cash',     label: 'Efectivo'      },
    { value: 'bizum',    label: 'Bizum'         },
    { value: 'paypal',   label: 'PayPal'        },
    { value: 'other',    label: 'Otro'          },
];

export default function InvoicePaymentsModal({ token, invoice, onClose }) {
    const [payments, setPayments] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [form,     setForm]     = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], method: 'transfer', reference: '', notes: '' });
    const [saving,   setSaving]   = useState(false);

    const load = async () => {
        setLoading(true);
        try { setPayments(await getPayments(token, invoice.id)); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const totalPaid    = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalAmount  = Number(invoice.total_amount);
    const pending      = Math.max(0, totalAmount - totalPaid);
    const pct          = Math.min(100, Math.round((totalPaid / totalAmount) * 100));

    const handleAdd = async e => {
        e.preventDefault();
        if (!form.amount || Number(form.amount) <= 0) return alert('Importe inválido');
        setSaving(true);
        try { await addPayment(token, invoice.id, form); await load(); setForm(f => ({ ...f, amount: '', reference: '', notes: '' })); }
        catch (err) { alert(err.message || 'Error al registrar pago'); }
        finally { setSaving(false); }
    };

    const handleDelete = async payId => {
        if (!confirm('¿Eliminar este pago?')) return;
        await deletePayment(token, invoice.id, payId);
        load();
    };

    return (
        <Modal open size="lg" title={`Pagos — ${invoice.invoice_number}`} onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Barra de progreso */}
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Cobrado: <strong style={{ color: 'var(--secondary)' }}>{fmt(totalPaid)}</strong></span>
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Pendiente: <strong style={{ color: pending > 0 ? 'var(--error)' : 'var(--secondary)' }}>{fmt(pending)}</strong></span>
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Total: <strong>{fmt(totalAmount)}</strong></span>
                    </div>
                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--secondary)' : 'var(--primary)', borderRadius: 4, transition: 'width .4s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 4, textAlign: 'right' }}>{pct}% cobrado</div>
                </div>

                {/* Historial de pagos */}
                {loading ? (
                    <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="skeleton" style={{ height: 12, width: '50%' }} />
                    </div>
                ) : payments.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text-disabled)', textAlign: 'center', padding: '12px 0' }}>Sin pagos registrados aún</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <h4 style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Historial de pagos</h4>
                        {payments.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.amount)}</span>
                                        <span style={{ fontSize: 11.5, color: 'var(--text-disabled)' }}>{fmtDate(p.payment_date)}</span>
                                        <span style={{ fontSize: 11, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 7px', borderRadius: 99, fontWeight: 600 }}>
                                            {METHOD_OPTS.find(m => m.value === p.method)?.label || p.method}
                                        </span>
                                    </div>
                                    {p.reference && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>Ref: {p.reference}</div>}
                                    {p.notes     && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1 }}>{p.notes}</div>}
                                </div>
                                <button onClick={() => handleDelete(p.id)}
                                    style={{ width: 26, height: 26, border: 'none', borderRadius: 6, background: 'var(--error-light)', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Formulario nuevo pago */}
                {pending > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                        <h4 style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Registrar pago</h4>
                        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Importe (€) *</label>
                                    <input type="number" name="amount" min="0.01" step="0.01" max={pending}
                                        className="form-input" value={form.amount} onChange={set}
                                        placeholder={fmt(pending)} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Fecha *</label>
                                    <input type="date" name="payment_date" className="form-input" value={form.payment_date} onChange={set} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Método</label>
                                    <select name="method" className="form-select" value={form.method} onChange={set}>
                                        {METHOD_OPTS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Referencia</label>
                                    <input type="text" name="reference" className="form-input" value={form.reference} onChange={set} placeholder="Nº transferencia, etc." />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Notas</label>
                                    <input type="text" name="notes" className="form-input" value={form.notes} onChange={set} placeholder="Observaciones" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Plus size={14} /> {saving ? 'Guardando…' : 'Registrar pago'}
                                </button>
                                <button type="button" className="btn btn-ghost"
                                    onClick={() => setForm(f => ({ ...f, amount: String(Math.round(pending * 100) / 100) }))}
                                    style={{ fontSize: 12 }}>
                                    Pago total ({fmt(pending)})
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {pending <= 0 && (
                    <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13, color: 'var(--secondary)', fontWeight: 600 }}>
                        ✓ Factura completamente cobrada
                    </div>
                )}
            </div>
        </Modal>
    );
}