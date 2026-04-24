import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import InvoiceForm from '../components/InvoiceForm';
import InvoiceStatsPanel from '../components/invoice/InvoiceStatsPanel';
import InvoiceFilters from '../components/invoice/InvoiceFilters';
import InvoicePaymentsModal from '../components/invoice/InvoicePaymentsModal';
import QuotesTab from '../components/invoice/QuotesTab';
import RecurringTab from '../components/invoice/RecurringTab';
import CreditNotesTab from '../components/invoice/CreditNotesTab';
import InvoiceSettingsModal from '../components/invoice/InvoiceSettingsModal';
import {
    getInvoices, getInvoiceById, createInvoice, updateInvoice,
    deleteInvoice, downloadInvoicePDF, updateInvoiceStatus, getInvoiceStats,
} from '../api/invoices';
import { getClients } from '../api/clients';
import { getProjects } from '../api/projects';
import { getServices } from '../api/services';
import { Plus, FileText, Download, Receipt, BarChart2, Settings, Eye, ChevronDown } from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const INV_STATUS = {
    draft:   { label: 'Borrador', cls: 'badge badge-draft'   },
    sent:    { label: 'Enviada',  cls: 'badge badge-sent'    },
    paid:    { label: 'Pagada',   cls: 'badge badge-paid'    },
    overdue: { label: 'Vencida',  cls: 'badge badge-overdue' },
};
const PAY_STATUS = {
    unpaid:  { label: 'Sin pagar', color: 'var(--error)'    },
    partial: { label: 'Parcial',   color: 'var(--warning)'  },
    paid:    { label: 'Cobrado',   color: 'var(--secondary)' },
};
const STATUS_TRANSITIONS = {
    draft:   ['sent', 'paid', 'overdue'],
    sent:    ['paid', 'overdue', 'draft'],
    overdue: ['paid', 'sent'],
    paid:    [],
};
const TABS = ['facturas', 'presupuestos', 'recurrentes', 'notas-credito'];
const TAB_LABEL = { facturas: 'Facturas', presupuestos: 'Presupuestos', recurrentes: 'Recurrentes', 'notas-credito': 'Notas de crédito' };

// ── Dropdown cambio de estado rápido ─────────────────────────
function StatusDropdown({ invoice, onUpdate }) {
    const [open, setOpen] = useState(false);
    const transitions = STATUS_TRANSITIONS[invoice.status] || [];

    if (transitions.length === 0) {
        const s = INV_STATUS[invoice.status] || { label: invoice.status, cls: 'badge' };
        return <span className={s.cls}><span className="badge-dot" />{s.label}</span>;
    }

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                className={INV_STATUS[invoice.status]?.cls || 'badge'}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, border: 'none', fontFamily: 'inherit' }}
            >
                <span className="badge-dot" />
                {INV_STATUS[invoice.status]?.label}
                <ChevronDown size={10} />
            </button>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setOpen(false)} />
                    <div style={{
                        position: 'absolute', top: '110%', left: 0, zIndex: 200,
                        background: 'var(--card-bg)', border: '1px solid var(--border)',
                        borderRadius: 8, boxShadow: 'var(--shadow-md)', minWidth: 150, padding: 4,
                    }}>
                        {transitions.map(s => (
                            <button
                                key={s}
                                onClick={e => { e.stopPropagation(); onUpdate(invoice.id, s); setOpen(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '7px 12px', background: 'none', border: 'none',
                                    cursor: 'pointer', fontSize: 12.5, color: 'var(--text-primary)',
                                    borderRadius: 6, fontFamily: 'inherit',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                                <span className={`${INV_STATUS[s]?.cls || 'badge'}`} style={{ padding: '2px 7px', fontSize: 11 }}>
                                    <span className="badge-dot" />{INV_STATUS[s]?.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Vista previa inline ───────────────────────────────────────
function InvoicePreview({ invoice }) {
    const fmtD = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    return (
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
            <div style={{ background: 'linear-gradient(135deg,#1976D2,#1565C0)', borderRadius: 10, padding: '20px 24px', marginBottom: 20, color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>FACTURA</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{invoice.invoice_number}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, opacity: 0.8 }}>
                        <div>Emisión: {fmtD(invoice.issue_date)}</div>
                        <div>Vencimiento: {fmtD(invoice.due_date)}</div>
                    </div>
                </div>
            </div>
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', marginBottom: 4 }}>Cliente</div>
                <div style={{ fontWeight: 700 }}>{invoice.client_name}</div>
                {invoice.client_company  && <div style={{ color: 'var(--text-secondary)' }}>{invoice.client_company}</div>}
                {invoice.client_email    && <div style={{ color: 'var(--text-secondary)' }}>{invoice.client_email}</div>}
                {invoice.client_document && <div style={{ color: 'var(--text-disabled)' }}>NIF: {invoice.client_document}</div>}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                        {['Descripción', 'Cant.', 'Precio/u.', 'IVA%', 'IVA €', 'Total'].map((h, i) => (
                            <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, textAlign: i > 0 ? 'right' : 'left', color: 'var(--text-disabled)', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {(invoice.items || []).map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '9px 10px' }}>{item.description}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>{item.tax_rate}%</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--warning)' }}>{fmt(item.tax_amount)}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700 }}>{fmt(item.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ minWidth: 240 }}>
                    {[
                        { label: 'Base imponible', value: fmt(invoice.subtotal_amount), bold: false },
                        { label: 'IVA',            value: fmt(invoice.tax_amount),      bold: false },
                        { label: 'TOTAL',          value: fmt(invoice.total_amount),    bold: true  },
                    ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 12, color: row.bold ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: row.bold ? 700 : 400 }}>{row.label}</span>
                            <span style={{ fontWeight: row.bold ? 800 : 400, fontSize: row.bold ? 16 : 13, color: row.bold ? 'var(--primary)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>
            {invoice.notes && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Notas: </strong>{invoice.notes}
                </div>
            )}
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────
export default function Invoices() {
    const { token } = useContext(AuthContext);

    const [invoices,  setInvoices]  = useState([]);
    const [clients,   setClients]   = useState([]);
    const [projects,  setProjects]  = useState([]);
    const [services,  setServices]  = useState([]);
    const [stats,     setStats]     = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [tab,       setTab]       = useState('facturas');

    const [showForm,     setShowForm]     = useState(false);
    const [showStats,    setShowStats]    = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [editing,      setEditing]      = useState(null);
    const [toDelete,     setToDelete]     = useState(null);
    const [paymentsInv,  setPaymentsInv]  = useState(null);
    const [previewInv,   setPreviewInv]   = useState(null);
    const [downloading,  setDownloading]  = useState(null);

    const [filters, setFilters] = useState({
        status: '', client_id: '', date_from: '', date_to: '', min_amount: '', max_amount: '',
    });

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [inv, cli, proj, svc] = await Promise.all([
                getInvoices(token, filters),
                getClients(token),
                getProjects(token),
                getServices(token),
            ]);
            setInvoices(inv); setClients(cli); setProjects(proj); setServices(svc);
        } catch { setError('No se pudieron cargar las facturas.'); }
        finally { setLoading(false); }
    }, [token, filters]);

    useEffect(() => { if (token) load(); }, [load]);

    const loadStats = async () => {
        try { const s = await getInvoiceStats(token); setStats(s); setShowStats(true); }
        catch { alert('Error al cargar estadísticas'); }
    };

    const handleEdit = async inv => {
        const full = await getInvoiceById(token, inv.id);
        setEditing(full); setShowForm(true);
    };
    const handleSubmit = async data => {
        if (data.id) await updateInvoice(token, data.id, data);
        else         await createInvoice(token, data);
        setShowForm(false); setEditing(null); load();
    };
    const handleDelete = async () => { await deleteInvoice(token, toDelete.id); setToDelete(null); load(); };
    const closeForm    = ()       => { setShowForm(false); setEditing(null); };

    const handleStatusChange = async (id, status) => {
        await updateInvoiceStatus(token, id, status); load();
    };
    const handleDownload = async inv => {
        setDownloading(inv.id);
        try { await downloadInvoicePDF(token, inv.id); }
        catch { alert('Error al generar el PDF'); }
        finally { setDownloading(null); }
    };
    const handlePreview = async inv => {
        try { setPreviewInv(await getInvoiceById(token, inv.id)); }
        catch { alert('Error al cargar factura'); }
    };

    const totalAll     = invoices.reduce((s, i) => s + Number(i.total_amount   || 0), 0);
    const totalPending = invoices
        .filter(i => ['sent', 'overdue'].includes(i.status))
        .reduce((s, i) => s + Number(i.pending_amount || 0), 0);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* HEADER */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Facturación</h1>
                        <p className="page-subtitle">
                            {invoices.length} factura{invoices.length !== 1 ? 's' : ''} ·{' '}
                            Total: <strong>{fmt(totalAll)}</strong> ·{' '}
                            Pendiente cobro: <span style={{ color: 'var(--error)', fontWeight: 600 }}>{fmt(totalPending)}</span>
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" onClick={loadStats}>
                            <BarChart2 size={14} /> Estadísticas
                        </button>
                        <button className="btn btn-ghost" onClick={() => setShowSettings(true)}>
                            <Settings size={14} />
                        </button>
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                            <Plus size={15} /> Nueva factura
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
                    {TABS.map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding: '9px 18px', background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 13, fontWeight: tab === t ? 600 : 400,
                            color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
                            borderBottom: `2px solid ${tab === t ? 'var(--primary)' : 'transparent'}`,
                            marginBottom: -2, fontFamily: 'Inter, sans-serif', transition: 'color .15s',
                        }}>
                            {TAB_LABEL[t]}
                        </button>
                    ))}
                </div>

                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

                {/* TAB FACTURAS */}
                {tab === 'facturas' && (
                    <>
                        <InvoiceFilters
                            filters={filters}
                            onChange={setFilters}
                            clients={clients}
                            onReset={() => setFilters({ status: '', client_id: '', date_from: '', date_to: '', min_amount: '', max_amount: '' })}
                        />

                        {loading ? (
                            <div className="table-wrap">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5' }}>
                                        <div className="skeleton" style={{ height: 12, width: '35%', marginBottom: 8 }} />
                                        <div className="skeleton" style={{ height: 10, width: '22%' }} />
                                    </div>
                                ))}
                            </div>
                        ) : invoices.length === 0 ? (
                            <div className="table-wrap">
                                <div className="empty-state">
                                    <div className="empty-icon"><Receipt size={22} /></div>
                                    <p className="empty-title">Sin facturas</p>
                                    <p className="empty-desc">Crea tu primera factura o ajusta los filtros</p>
                                    <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>
                                        <Plus size={14} /> Nueva factura
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="table-wrap">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Número</th>
                                            <th>Cliente</th>
                                            <th>Estado</th>
                                            <th>Cobro</th>
                                            <th>Emisión</th>
                                            <th>Vencimiento</th>
                                            <th style={{ textAlign: 'right' }}>Base</th>
                                            <th style={{ textAlign: 'right' }}>IVA</th>
                                            <th style={{ textAlign: 'right' }}>Total</th>
                                            <th style={{ textAlign: 'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((inv, idx) => {
                                            const isOverdue = inv.status === 'overdue';
                                            const payMeta   = PAY_STATUS[inv.payment_status] || PAY_STATUS.unpaid;
                                            return (
                                                <tr key={inv.id} style={{ animationDelay: `${idx * 18}ms` }}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <FileText size={13} color="var(--primary)" />
                                                            </div>
                                                            <span style={{ fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{inv.invoice_number}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{inv.client_name}</td>
                                                    <td><StatusDropdown invoice={inv} onUpdate={handleStatusChange} /></td>
                                                    <td>
                                                        <button onClick={() => setPaymentsInv(inv)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                            <span style={{ fontSize: 11, fontWeight: 600, color: payMeta.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: payMeta.color, flexShrink: 0 }} />
                                                                {payMeta.label}
                                                            </span>
                                                        </button>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{fmtDate(inv.issue_date)}</td>
                                                    <td style={{ fontSize: 13, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? 'var(--error)' : 'var(--text-secondary)' }}>
                                                        {fmtDate(inv.due_date)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.subtotal_amount)}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.tax_amount)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.total_amount)}</td>
                                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                        <button className="btn-icon" title="Vista previa" onClick={() => handlePreview(inv)} style={{ display: 'inline-flex', marginRight: 2 }}>
                                                            <Eye size={13} />
                                                        </button>
                                                        <button className="action-link action-link-primary" onClick={() => handleEdit(inv)}>Editar</button>
                                                        <button className="btn-icon" title="Descargar PDF" disabled={downloading === inv.id}
                                                            style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4, opacity: downloading === inv.id ? 0.5 : 1 }}
                                                            onClick={() => handleDownload(inv)}>
                                                            <Download size={13} />
                                                        </button>
                                                        <button className="action-link action-link-danger" style={{ marginLeft: 4 }} onClick={() => setToDelete(inv)}>
                                                            Eliminar
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {tab === 'presupuestos'  && <QuotesTab    token={token} clients={clients} projects={projects} services={services} />}
                {tab === 'recurrentes'   && <RecurringTab  token={token} clients={clients} projects={projects} services={services} onProcessed={load} />}
                {tab === 'notas-credito' && <CreditNotesTab token={token} invoices={invoices} />}

            </main>

            {/* MODAL FORM */}
            <Modal open={showForm} size="lg" title={editing ? 'Editar factura' : 'Nueva factura'} onClose={closeForm}>
                <InvoiceForm clients={clients} projects={projects} services={services} initialData={editing} onSubmit={handleSubmit} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 18, borderTop: '1px solid var(--border)', marginTop: 4 }}>
                    <button className="btn btn-ghost" onClick={closeForm}>Cancelar</button>
                    <button className="btn btn-primary" form="invoice-form" type="submit">Guardar factura</button>
                </div>
            </Modal>

            {/* MODAL ELIMINAR */}
            <Modal open={!!toDelete} title="Eliminar factura" onClose={() => setToDelete(null)}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    ¿Eliminar la factura <strong style={{ color: 'var(--text-primary)' }}>{toDelete?.invoice_number}</strong>?
                    Solo se pueden eliminar facturas no pagadas.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>

            {/* MODAL PAGOS */}
            {paymentsInv && (
                <InvoicePaymentsModal token={token} invoice={paymentsInv} onClose={() => { setPaymentsInv(null); load(); }} />
            )}

            {/* MODAL ESTADÍSTICAS */}
            {showStats && stats && <InvoiceStatsPanel stats={stats} onClose={() => setShowStats(false)} />}

            {/* MODAL CONFIGURACIÓN */}
            {showSettings && <InvoiceSettingsModal token={token} onClose={() => setShowSettings(false)} />}

            {/* MODAL VISTA PREVIA */}
            {previewInv && (
                <Modal open size="lg" title={`Vista previa — ${previewInv.invoice_number}`} onClose={() => setPreviewInv(null)}>
                    <InvoicePreview invoice={previewInv} />
                </Modal>
            )}
        </div>
    );
}