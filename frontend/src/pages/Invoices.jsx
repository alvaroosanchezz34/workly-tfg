// frontend/src/pages/Invoices.jsx
import { useContext, useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import InvoiceForm from '../components/InvoiceForm';
import InvoiceFilters from '../components/invoice/InvoiceFilters';
import Pagination from '../components/Pagination';
import useIsMobile from '../hooks/useIsMobile';

// Cargados bajo demanda: solo se montan al abrir su pestaña/modal, y
// InvoiceStatsPanel arrastra recharts, el mayor peso de esta página.
const InvoiceStatsPanel    = lazy(() => import('../components/invoice/InvoiceStatsPanel'));
const InvoicePaymentsModal = lazy(() => import('../components/invoice/InvoicePaymentsModal'));
const QuotesTab            = lazy(() => import('../components/invoice/QuotesTab'));
const RecurringTab         = lazy(() => import('../components/invoice/RecurringTab'));
const CreditNotesTab       = lazy(() => import('../components/invoice/CreditNotesTab'));
const InvoiceSettingsModal = lazy(() => import('../components/invoice/InvoiceSettingsModal'));

import {
    getInvoices, getInvoiceById, createInvoice, updateInvoice,
    deleteInvoice, downloadInvoicePDF, updateInvoiceStatus, getInvoiceStats,
    sendInvoiceByEmail, bulkDeleteInvoices, bulkUpdateInvoiceStatus,
    issueInvoice, voidInvoice, rectifyInvoice,
} from '../api/invoices';
import { getClients } from '../api/clients';
import { getProjects } from '../api/projects';
import { getServices } from '../api/services';
import { Plus, FileText, Download, Receipt, BarChart2, Settings, Eye, ChevronDown, Send, Mail } from 'lucide-react';
import { MotionTbody, MotionTr, staggerContainer, staggerRow } from '../utils/motion';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const INV_STATUS = {
    draft:   { label: 'Borrador', cls: 'badge badge-draft'   },
    sent:    { label: 'Emitida',  cls: 'badge badge-sent'    },
    paid:    { label: 'Pagada',   cls: 'badge badge-paid'    },
    overdue: { label: 'Vencida',  cls: 'badge badge-overdue' },
    void:    { label: 'Anulada',  cls: 'badge badge-overdue' },
};
const PAY_STATUS = {
    unpaid:  { label: 'Sin pagar', color: 'var(--error)'     },
    partial: { label: 'Parcial',   color: 'var(--warning)'   },
    paid:    { label: 'Cobrado',   color: 'var(--secondary)'  },
};
const STATUS_TRANSITIONS = {
    draft:   [],
    sent:    ['paid', 'overdue'],
    overdue: ['paid', 'sent'],
    paid:    [],
    void:    [],
};
const invoiceLabel = inv => inv?.invoice_number || 'Borrador';
const TABS = ['facturas', 'presupuestos', 'recurrentes', 'notas-credito'];
const TAB_LABEL = { facturas: 'Facturas', presupuestos: 'Presupuestos', recurrentes: 'Recurrentes', 'notas-credito': 'Notas de crédito' };

// ── Dropdown cambio de estado ──────────────────────────────────
function StatusDropdown({ invoice, onUpdate }) {
    const [open, setOpen] = useState(false);
    const transitions = STATUS_TRANSITIONS[invoice.status] || [];
    if (transitions.length === 0) {
        const s = INV_STATUS[invoice.status] || { label: invoice.status, cls: 'badge' };
        return <span className={s.cls}><span className="badge-dot"/>{s.label}</span>;
    }
    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                className={INV_STATUS[invoice.status]?.cls || 'badge'}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, border: 'none', fontFamily: 'inherit' }}>
                <span className="badge-dot"/>
                {INV_STATUS[invoice.status]?.label}
                <ChevronDown size={10}/>
            </button>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setOpen(false)}/>
                    <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 200, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', minWidth: 150, padding: 4 }}>
                        {transitions.map(s => (
                            <button key={s}
                                onClick={e => { e.stopPropagation(); onUpdate(invoice.id, s); setOpen(false); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--text-primary)', borderRadius: 6, fontFamily: 'inherit' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                <span className={`${INV_STATUS[s]?.cls || 'badge'}`} style={{ padding: '2px 7px', fontSize: 11 }}>
                                    <span className="badge-dot"/>{INV_STATUS[s]?.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Vista previa ───────────────────────────────────────────────
function InvoicePreview({ invoice }) {
    const fmtD = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    return (
        <div style={{ fontFamily: 'inherit', fontSize: 13 }}>
            <div style={{ background: 'linear-gradient(135deg,#1976D2,#1565C0)', borderRadius: 10, padding: '20px 24px', marginBottom: 20, color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                        <div style={{ fontSize: 10, opacity: .65, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>FACTURA</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{invoiceLabel(invoice)}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, opacity: .8 }}>
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
                {invoice.client_document && <div style={{ color: 'var(--text-disabled)' }}>NIF: {invoice.customer_tax_id || invoice.client_document}</div>}
                {(invoice.customer_fiscal_address || invoice.client_address) && <div style={{ color: 'var(--text-secondary)' }}>{invoice.customer_fiscal_address || invoice.client_address}</div>}
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, minWidth: 400 }}>
                    <thead>
                        <tr style={{ background: 'var(--bg)' }}>
                            {['Descripción','Cant.','Precio/u.','IVA%','IVA €','Total'].map((h,i) => (
                                <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, textAlign: i>0?'right':'left', color: 'var(--text-disabled)', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(invoice.items||[]).map((item,i) => (
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
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ minWidth: 200 }}>
                    {[
                        { label: 'Base imponible', value: fmt(invoice.subtotal_amount), bold: false },
                        { label: 'IVA',            value: fmt(invoice.tax_amount),      bold: false },
                        ...(Number(invoice.equivalence_surcharge_amount) ? [{ label: 'Recargo de equivalencia', value: fmt(invoice.equivalence_surcharge_amount), bold: false }] : []),
                        ...(Number(invoice.irpf_amount) ? [{ label: `IRPF ${invoice.irpf_rate}%`, value: `-${fmt(invoice.irpf_amount)}`, bold: false }] : []),
                        { label: 'TOTAL',          value: fmt(invoice.total_amount),    bold: true  },
                    ].map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 12, color: row.bold?'var(--text-primary)':'var(--text-secondary)', fontWeight: row.bold?700:400 }}>{row.label}</span>
                            <span style={{ fontWeight: row.bold?800:400, fontSize: row.bold?16:13, color: row.bold?'var(--primary)':'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>
            {invoice.verifactu_legend && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 12.5 }}>
                    <strong>QR tributario: </strong>{invoice.verifactu_legend}
                </div>
            )}
            {invoice.notes && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Notas: </strong>{invoice.notes}
                </div>
            )}
        </div>
    );
}

// ── Página principal ───────────────────────────────────────────
export default function Invoices() {
    const { token } = useContext(AuthContext);
    const isMobile  = useIsMobile();

    const [invoices,   setInvoices]   = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 20, totalPages: 1 });
    const [page,       setPage]       = useState(1);
    const [clients,    setClients]    = useState([]);
    const [projects,   setProjects]   = useState([]);
    const [services,   setServices]   = useState([]);
    const [stats,      setStats]      = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState('');
    const [tab,        setTab]        = useState('facturas');

    const [showForm,     setShowForm]     = useState(false);
    const [showStats,    setShowStats]    = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [editing,      setEditing]      = useState(null);
    const [toDelete,     setToDelete]     = useState(null);
    const [paymentsInv,  setPaymentsInv]  = useState(null);
    const [previewInv,   setPreviewInv]   = useState(null);
    const [downloading,  setDownloading]  = useState(null);
    const [showSend,     setShowSend]     = useState(null);
    const [sendEmail,    setSendEmail]    = useState('');
    const [sending,      setSending]      = useState(false);
    const [sendOk,       setSendOk]       = useState('');
    const [selectedIds,  setSelectedIds]  = useState([]);
    const [bulkBusy,     setBulkBusy]     = useState(false);
    const [fiscal,       setFiscal]       = useState(null);
    const [voidReason,   setVoidReason]   = useState('');
    const [rectifyMethod, setRectifyMethod] = useState('substitution');
    const [fiscalBusy,   setFiscalBusy]   = useState(false);

    const [filters, setFilters] = useState({
        status: '', client_id: '', date_from: '', date_to: '', min_amount: '', max_amount: '',
    });

    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const [inv, cli, proj, svc] = await Promise.all([
                getInvoices(token, { ...filters, page }),
                getClients(token),
                getProjects(token),
                getServices(token),
            ]);
            const invArr = Array.isArray(inv) ? inv : (inv?.data ?? []);
            setInvoices(invArr);
            if (inv?.pagination) setPagination(inv.pagination);
            setClients(Array.isArray(cli) ? cli : (cli?.data ?? []));
            setProjects(proj); setServices(svc);
            setSelectedIds([]);
        } catch { setError('No se pudieron cargar las facturas.'); }
        finally { setLoading(false); }
    }, [token, filters, page]);

    useEffect(() => { if (token) load(); }, [token, load]);

    // Volver a la página 1 cuando cambian los filtros
    useEffect(() => { setPage(1); }, [filters]);

    const loadStats = async () => {
        try { const s = await getInvoiceStats(token); setStats(s); setShowStats(true); }
        catch { alert('Error al cargar estadísticas'); }
    };

    const handleEdit   = async inv => {
        if (inv.status && inv.status !== 'draft') return alert('Una factura emitida no se edita. Puedes anularla o crear una rectificativa.');
        const full = await getInvoiceById(token, inv.id);
        setEditing(full); setShowForm(true);
    };
    const handleSubmit = async data => {
        try {
            if (data.id) await updateInvoice(token, data.id, data);
            else await createInvoice(token, data);
            setShowForm(false); setEditing(null); load();
        } catch (err) { alert(err.message); }
    };
    const handleDelete = async () => {
        const res = await deleteInvoice(token, toDelete.id);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            alert(data.message || 'No se pudo eliminar');
            return;
        }
        setToDelete(null); load();
    };
    const closeForm    = () => { setShowForm(false); setEditing(null); };
    const handleStatusChange = async (id, status) => {
        try { await updateInvoiceStatus(token, id, status); load(); }
        catch (err) { alert(err.message); }
    };
    const openFiscal = (type, invoice) => {
        setVoidReason('');
        setRectifyMethod('substitution');
        setFiscal({ type, invoice });
    };
    const handleFiscal = async () => {
        if (!fiscal) return;
        setFiscalBusy(true);
        try {
            if (fiscal.type === 'issue') await issueInvoice(token, fiscal.invoice.id);
            else if (fiscal.type === 'void') await voidInvoice(token, fiscal.invoice.id, voidReason.trim());
            else await rectifyInvoice(token, fiscal.invoice.id, rectifyMethod);
            setFiscal(null);
            load();
        } catch (err) { alert(err.message); }
        finally { setFiscalBusy(false); }
    };

    const toggleSelect = id => setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
    const toggleSelectAll = () => setSelectedIds(ids => ids.length === invoices.length ? [] : invoices.map(i => i.id));
    const handleBulkDelete = async () => {
        if (!confirm(`¿Eliminar ${selectedIds.length} factura(s)? Solo se borran los borradores. Las emitidas se omiten.`)) return;
        setBulkBusy(true);
        try { const res = await bulkDeleteInvoices(token, selectedIds); alert(res.message); load(); }
        finally { setBulkBusy(false); }
    };
    const handleBulkStatus = async status => {
        setBulkBusy(true);
        try { const res = await bulkUpdateInvoiceStatus(token, selectedIds, status); alert(res.message); load(); }
        finally { setBulkBusy(false); }
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
    const openSendModal = async inv => {
        try { const full = await getInvoiceById(token, inv.id); setSendEmail(full.client_email||''); setSendOk(''); setShowSend(full); }
        catch { setSendEmail(''); setSendOk(''); setShowSend(inv); }
    };
    const handleSendEmail = async () => {
        if (!sendEmail.trim()) return alert('Introduce un email destinatario');
        setSending(true);
        try { const data = await sendInvoiceByEmail(token, showSend.id, sendEmail.trim()); setSendOk(data.message); load(); }
        catch (err) { alert(err.message); }
        finally { setSending(false); }
    };

    const totalAll     = invoices.reduce((s, i) => s + Number(i.total_amount||0), 0);
    const totalPending = invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + Number(i.pending_amount||0), 0);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* HEADER */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Facturación</h1>
                        <p className="page-subtitle">
                            {invoices.length} factura{invoices.length!==1?'s':''} · Total: <strong>{fmt(totalAll)}</strong> · Pendiente cobro: <span style={{ color:'var(--error)', fontWeight:600 }}>{fmt(totalPending)}</span>
                        </p>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {!isMobile && (
                            <>
                                <button className="btn btn-ghost" onClick={loadStats}><BarChart2 size={14}/> Estadísticas</button>
                                <button className="btn btn-ghost" onClick={() => setShowSettings(true)}><Settings size={14}/></button>
                            </>
                        )}
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                            <Plus size={15}/> Nueva factura
                        </button>
                    </div>
                </div>

                {/* TABS — scroll horizontal en móvil */}
                <div style={{ display:'flex', borderBottom:'2px solid var(--border)', marginBottom:20, overflowX:'auto' }}>
                    {TABS.map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding:'9px 14px', background:'none', border:'none', cursor:'pointer',
                            fontSize:13, fontWeight: tab===t?600:400,
                            color: tab===t?'var(--primary)':'var(--text-secondary)',
                            borderBottom:`2px solid ${tab===t?'var(--primary)':'transparent'}`,
                            marginBottom:-2, fontFamily:'inherit', whiteSpace:'nowrap', transition:'color .15s',
                        }}>
                            {TAB_LABEL[t]}
                        </button>
                    ))}
                </div>

                {error && <div className="alert alert-danger" style={{ marginBottom:16 }}>{error}</div>}

                {/* TAB FACTURAS */}
                {tab === 'facturas' && (
                    <>
                        <InvoiceFilters
                            filters={filters} onChange={setFilters} clients={clients}
                            onReset={() => setFilters({ status:'', client_id:'', date_from:'', date_to:'', min_amount:'', max_amount:'' })}
                        />

                        {selectedIds.length > 0 && !isMobile && (
                            <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--primary-light)', border:'1px solid var(--primary)', borderRadius:8, padding:'8px 14px', marginBottom:14, flexWrap:'wrap' }}>
                                <span style={{ fontSize:13, fontWeight:600, color:'var(--primary)' }}>{selectedIds.length} seleccionada{selectedIds.length !== 1 ? 's' : ''}</span>
                                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginLeft:'auto' }}>
                                    <button className="btn btn-ghost btn-sm" disabled={bulkBusy} onClick={() => handleBulkStatus('paid')}>Marcar pagada</button>
                                    <button className="btn btn-danger btn-sm" disabled={bulkBusy} onClick={handleBulkDelete}>Eliminar</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds([])}>Cancelar</button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="table-wrap">
                                {[...Array(5)].map((_,i) => (
                                    <div key={i} style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)' }}>
                                        <div className="skeleton" style={{ height:12, width:'35%', marginBottom:8 }}/>
                                        <div className="skeleton" style={{ height:10, width:'22%' }}/>
                                    </div>
                                ))}
                            </div>
                        ) : invoices.length === 0 ? (
                            <div className="table-wrap">
                                <div className="empty-state">
                                    <div className="empty-icon"><Receipt size={22}/></div>
                                    <p className="empty-title">Sin facturas</p>
                                    <p className="empty-desc">Crea tu primera factura o ajusta los filtros</p>
                                    <button className="btn btn-primary" style={{ marginTop:10 }} onClick={() => setShowForm(true)}><Plus size={14}/> Nueva factura</button>
                                </div>
                            </div>
                        ) : isMobile ? (
                            /* ── Cards móvil ── */
                            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                                {invoices.map(inv => {
                                    const payMeta   = PAY_STATUS[inv.payment_status] || PAY_STATUS.unpaid;
                                    const isOverdue = inv.status === 'overdue';
                                    return (
                                        <div key={inv.id} style={{ background:'var(--card-bg)', border:'1.5px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                                            {/* Cabecera */}
                                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                                    <div style={{ width:28, height:28, borderRadius:6, background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                                        <FileText size={13} color="var(--primary)"/>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight:700, fontSize:14, fontVariantNumeric:'tabular-nums' }}>{invoiceLabel(inv)}</div>
                                                        <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:1 }}>{inv.client_name}</div>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize:18, fontWeight:800, fontVariantNumeric:'tabular-nums' }}>{fmt(inv.total_amount)}</div>
                                            </div>
                                            {/* Estado + cobro + fechas */}
                                            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                                                <StatusDropdown invoice={inv} onUpdate={handleStatusChange}/>
                                                <button onClick={() => setPaymentsInv(inv)}
                                                    style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
                                                    <span style={{ fontSize:11, fontWeight:600, color:payMeta.color, display:'flex', alignItems:'center', gap:4 }}>
                                                        <span style={{ width:7, height:7, borderRadius:'50%', background:payMeta.color, flexShrink:0 }}/>
                                                        {payMeta.label}
                                                    </span>
                                                </button>
                                            </div>
                                            <div style={{ fontSize:12, color: isOverdue?'var(--error)':'var(--text-disabled)', marginBottom:12 }}>
                                                Vence: <strong>{fmtDate(inv.due_date)}</strong>
                                                {isOverdue && ' ⚠️'}
                                            </div>
                                            {/* Acciones */}
                                            <div style={{ display:'flex', flexWrap:'wrap', gap:6, borderTop:'1px solid var(--border)', paddingTop:10 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handlePreview(inv)}><Eye size={12}/></button>
                                                <button className="btn btn-ghost btn-sm" disabled={downloading===inv.id} onClick={() => handleDownload(inv)}><Download size={12}/></button>
                                                {inv.status === 'draft' && <button className="btn btn-primary btn-sm" onClick={() => openFiscal('issue', inv)}>Emitir</button>}
                                                {inv.status === 'draft' && <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(inv)}>Editar</button>}
                                                {inv.status === 'draft' && <button className="btn btn-danger btn-sm" onClick={() => setToDelete(inv)}>Eliminar</button>}
                                                {inv.status !== 'draft' && inv.status !== 'void' && <button className="btn btn-ghost btn-sm" onClick={() => openSendModal(inv)}><Send size={12}/></button>}
                                                {inv.status !== 'draft' && inv.status !== 'void' && <button className="btn btn-ghost btn-sm" onClick={() => openFiscal('rectify', inv)}>Rectificar</button>}
                                                {inv.status !== 'draft' && inv.status !== 'void' && <button className="btn btn-ghost btn-sm" onClick={() => openFiscal('void', inv)}>Anular</button>}
                                            </div>
                                        </div>
                                    );
                                })}
                                <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} onPage={p => setPage(p)}/>
                            </div>
                        ) : (
                            /* ── Tabla desktop ── */
                            <div className="table-wrap">
                                <table className="data-table fm-rows">
                                    <thead>
                                        <tr>
                                            <th style={{ width:32 }}>
                                                <input type="checkbox" aria-label="Seleccionar todas"
                                                    checked={selectedIds.length === invoices.length && invoices.length > 0}
                                                    onChange={toggleSelectAll} />
                                            </th>
                                            <th>Número</th><th>Cliente</th><th>Estado</th><th>Cobro</th>
                                            <th>Emisión</th><th>Vencimiento</th>
                                            <th style={{ textAlign:'right' }}>Base</th>
                                            <th style={{ textAlign:'right' }}>IVA</th>
                                            <th style={{ textAlign:'right' }}>Total</th>
                                            <th style={{ textAlign:'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <MotionTbody variants={staggerContainer} initial="hidden" animate="show">
                                        {invoices.map((inv) => {
                                            const isOverdue = inv.status === 'overdue';
                                            const payMeta   = PAY_STATUS[inv.payment_status] || PAY_STATUS.unpaid;
                                            return (
                                                <MotionTr key={inv.id} variants={staggerRow}>
                                                    <td>
                                                        <input type="checkbox" aria-label={`Seleccionar factura ${inv.invoice_number}`}
                                                            checked={selectedIds.includes(inv.id)}
                                                            onChange={() => toggleSelect(inv.id)} />
                                                    </td>
                                                    <td>
                                                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                                            <div style={{ width:28, height:28, borderRadius:6, background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                                                <FileText size={13} color="var(--primary)"/>
                                                            </div>
                                                            <span style={{ fontWeight:600, fontSize:13, fontVariantNumeric:'tabular-nums' }}>{invoiceLabel(inv)}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ color:'var(--text-secondary)', fontSize:13 }}>{inv.client_name}</td>
                                                    <td><StatusDropdown invoice={inv} onUpdate={handleStatusChange}/></td>
                                                    <td>
                                                        <button onClick={() => setPaymentsInv(inv)} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
                                                            <span style={{ fontSize:11, fontWeight:600, color:payMeta.color, display:'flex', alignItems:'center', gap:4 }}>
                                                                <span style={{ width:7, height:7, borderRadius:'50%', background:payMeta.color, flexShrink:0 }}/>{payMeta.label}
                                                            </span>
                                                        </button>
                                                    </td>
                                                    <td style={{ color:'var(--text-secondary)', fontSize:13 }}>{fmtDate(inv.issue_date)}</td>
                                                    <td style={{ fontSize:13, fontWeight:isOverdue?700:400, color:isOverdue?'var(--error)':'var(--text-secondary)' }}>{fmtDate(inv.due_date)}</td>
                                                    <td style={{ textAlign:'right', fontSize:12.5, color:'var(--text-secondary)', fontVariantNumeric:'tabular-nums' }}>{fmt(inv.subtotal_amount)}</td>
                                                    <td style={{ textAlign:'right', fontSize:12.5, color:'var(--warning)', fontVariantNumeric:'tabular-nums' }}>{fmt(inv.tax_amount)}</td>
                                                    <td style={{ textAlign:'right', fontWeight:700, fontSize:14, fontVariantNumeric:'tabular-nums' }}>{fmt(inv.total_amount)}</td>
                                                    <td style={{ textAlign:'right', whiteSpace:'nowrap' }}>
                                                        <button className="btn-icon" title="Vista previa" onClick={() => handlePreview(inv)} style={{ display:'inline-flex', marginRight:2 }}><Eye size={13}/></button>
                                                        <button className="btn-icon" title="Descargar PDF" disabled={downloading===inv.id} style={{ display:'inline-flex', verticalAlign:'middle', marginLeft:4, opacity:downloading===inv.id?0.5:1 }} onClick={() => handleDownload(inv)}><Download size={13}/></button>
                                                        {inv.status === 'draft' && <button className="action-link action-link-primary" onClick={() => openFiscal('issue', inv)}>Emitir</button>}
                                                        {inv.status === 'draft' && <button className="action-link action-link-primary" onClick={() => handleEdit(inv)}>Editar</button>}
                                                        {inv.status === 'draft' && <button className="action-link action-link-danger" style={{ marginLeft:4 }} onClick={() => setToDelete(inv)}>Eliminar</button>}
                                                        {inv.status !== 'draft' && inv.status !== 'void' && <button className="btn-icon" title="Enviar por email" style={{ display:'inline-flex', verticalAlign:'middle', marginLeft:4 }} onClick={() => openSendModal(inv)}><Send size={13}/></button>}
                                                        {inv.status !== 'draft' && inv.status !== 'void' && <button className="action-link" onClick={() => openFiscal('rectify', inv)}>Rectificar</button>}
                                                        {inv.status !== 'draft' && inv.status !== 'void' && <button className="action-link action-link-danger" onClick={() => openFiscal('void', inv)}>Anular</button>}
                                                    </td>
                                                </MotionTr>
                                            );
                                        })}
                                    </MotionTbody>
                                </table>
                                <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} onPage={p => setPage(p)}/>
                            </div>
                        )}
                    </>
                )}

                <Suspense fallback={<div className="table-wrap" style={{ padding: 24 }}><div className="skeleton" style={{ height: 12, width: '30%' }} /></div>}>
                    {tab==='presupuestos'  && <QuotesTab     token={token} clients={clients} projects={projects} services={services}/>}
                    {tab==='recurrentes'   && <RecurringTab   token={token} clients={clients} projects={projects} services={services} onProcessed={load}/>}
                    {tab==='notas-credito' && <CreditNotesTab token={token} invoices={invoices}/>}
                </Suspense>

            </main>

            {/* Modales — sin cambios */}
            <Modal open={showForm} size="lg" title={editing?'Editar factura':'Nueva factura'} onClose={closeForm}>
                <InvoiceForm clients={clients} projects={projects} services={services} initialData={editing} onSubmit={handleSubmit}/>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:18, borderTop:'1px solid var(--border)', marginTop:4 }}>
                    <button className="btn btn-ghost" onClick={closeForm}>Cancelar</button>
                    <button className="btn btn-primary" form="invoice-form" type="submit">Guardar factura</button>
                </div>
            </Modal>

            <Modal open={!!toDelete} title="Eliminar factura" onClose={() => setToDelete(null)}>
                <p style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:20 }}>
                    ¿Eliminar el borrador <strong style={{ color:'var(--text-primary)' }}>{invoiceLabel(toDelete)}</strong>? Una factura ya emitida no se borra: se anula.
                </p>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>

            <Suspense fallback={null}>
                {paymentsInv && <InvoicePaymentsModal token={token} invoice={paymentsInv} onClose={() => { setPaymentsInv(null); load(); }}/>}
                {showStats && stats && <InvoiceStatsPanel stats={stats} onClose={() => setShowStats(false)}/>}
                {showSettings && <InvoiceSettingsModal token={token} onClose={() => setShowSettings(false)}/>}
            </Suspense>

            {previewInv && (
                <Modal open size="lg" title={`Vista previa — ${previewInv.invoice_number}`} onClose={() => setPreviewInv(null)}>
                    <InvoicePreview invoice={previewInv}/>
                </Modal>
            )}

            <Modal open={!!fiscal} title={fiscal?.type === 'issue' ? 'Emitir factura' : fiscal?.type === 'void' ? 'Anular factura' : 'Factura rectificativa'} onClose={() => setFiscal(null)}>
                {fiscal?.type === 'issue' && (
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Se asignará el siguiente número de la serie y se guardará una copia de los datos fiscales. Después ya no se podrá editar.
                    </p>
                )}
                {fiscal?.type === 'void' && (
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label className="form-label">Motivo de la anulación</label>
                        <input className="form-input" value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="Por ejemplo: error en el cliente" />
                    </div>
                )}
                {fiscal?.type === 'rectify' && (
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label className="form-label">Método</label>
                        <select className="form-select" value={rectifyMethod} onChange={e => setRectifyMethod(e.target.value)}>
                            <option value="substitution">Por sustitución</option>
                            <option value="difference">Por diferencias</option>
                        </select>
                        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 8 }}>
                            Se crea un borrador nuevo. El número se asigna cuando lo emitas.
                        </p>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setFiscal(null)}>Cancelar</button>
                    <button className="btn btn-primary" disabled={fiscalBusy} onClick={handleFiscal}>
                        {fiscalBusy ? 'Guardando…' : 'Confirmar'}
                    </button>
                </div>
            </Modal>

            <Modal open={!!showSend} title={`Enviar — ${invoiceLabel(showSend)}`} onClose={() => { setShowSend(null); setSendOk(''); }}>
                {sendOk ? (
                    <div style={{ textAlign:'center', padding:'20px 0' }}>
                        <div style={{ fontSize:44, marginBottom:12 }}>✅</div>
                        <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>Factura enviada</h3>
                        <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>{sendOk}</p>
                        <button className="btn btn-primary" onClick={() => { setShowSend(null); setSendOk(''); }}>Cerrar</button>
                    </div>
                ) : (
                    <>
                        <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:16 }}>
                            Se enviará un email con el PDF adjunto. El envío no cambia el número ni el estado fiscal: la factura tiene que estar emitida.
                        </p>
                        <div style={{ background:'var(--bg)', borderRadius:8, padding:'12px 16px', marginBottom:16, border:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div>
                                <div style={{ fontSize:13, fontWeight:600 }}>{showSend?.invoice_number}</div>
                                <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{showSend?.client_name}</div>
                            </div>
                            <div style={{ fontSize:16, fontWeight:800, color:'var(--primary)' }}>{showSend?fmt(showSend.total_amount):''}</div>
                        </div>
                        <div className="form-group" style={{ marginBottom:20 }}>
                            <label className="form-label" style={{ display:'flex', alignItems:'center', gap:5 }}>
                                <Mail size={12}/> Destinatario *
                            </label>
                            <input type="email" className="form-input" value={sendEmail}
                                onChange={e => setSendEmail(e.target.value)}
                                placeholder="email@cliente.com"
                                onKeyDown={e => e.key==='Enter' && handleSendEmail()}/>
                            {showSend && !showSend.client_email && (
                                <span style={{ fontSize:11.5, color:'var(--warning)', marginTop:4, display:'block' }}>
                                    ⚠️ El cliente no tiene email registrado. Introdúcelo manualmente.
                                </span>
                            )}
                        </div>
                        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:16, borderTop:'1px solid var(--border)' }}>
                            <button className="btn btn-ghost" onClick={() => setShowSend(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSendEmail}
                                disabled={sending||!sendEmail.trim()}
                                style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <Send size={14}/>{sending?'Enviando…':'Enviar factura'}
                            </button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}