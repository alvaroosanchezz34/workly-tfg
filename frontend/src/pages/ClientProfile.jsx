import { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getClientProfile } from '../api/clients';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import ClientForm from '../components/ClientForm';
import { updateClient } from '../api/clients';
import {
    ArrowLeft, Building2, Mail, Phone, FileText, FolderOpen,
    TrendingUp, Clock, AlertTriangle, CheckCircle, Edit2,
    Download, Calendar, MoreHorizontal,
} from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateShort = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—';

const COLORS  = ['#1976D2','#4CAF50','#FF9800','#0288D1','#9C27B0','#F44336'];
const colorFor = id => COLORS[Number(id) % COLORS.length];
const initials = name => name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';

const STATUS_INV = {
    draft:   { label: 'Borrador', cls: 'badge badge-draft'   },
    sent:    { label: 'Enviada',  cls: 'badge badge-sent'    },
    paid:    { label: 'Pagada',   cls: 'badge badge-paid'    },
    overdue: { label: 'Vencida',  cls: 'badge badge-overdue' },
};
const STATUS_PROJ = {
    pending:     { label: 'Pendiente',   color: '#FF9800' },
    in_progress: { label: 'En progreso', color: '#1976D2' },
    completed:   { label: 'Completado',  color: '#4CAF50' },
    cancelled:   { label: 'Cancelado',   color: '#9E9E9E' },
};

const TABS = ['resumen', 'proyectos', 'facturas'];
const TAB_LABEL = { resumen: 'Resumen', proyectos: 'Proyectos', facturas: 'Facturas' };

export default function ClientProfile() {
    const { id }     = useParams();
    const navigate   = useNavigate();
    const { token }  = useContext(AuthContext);
    const [data,     setData]    = useState(null);
    const [loading,  setLoading] = useState(true);
    const [tab,      setTab]     = useState('resumen');
    const [editing,  setEditing] = useState(false);

    const load = async () => {
        setLoading(true);
        try { setData(await getClientProfile(token, id)); }
        catch { navigate('/clients'); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token, id]);

    const handleEdit = async form => {
        await updateClient(token, id, form);
        setEditing(false);
        load();
    };

    if (loading) return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
                    {[...Array(4)].map((_,i) => (
                        <div key={i} className="skeleton" style={{ height: i === 0 ? 120 : 60, borderRadius: 12 }} />
                    ))}
                </div>
            </main>
        </div>
    );

    const { client, projects, invoices, kpis } = data;
    const color = colorFor(client.id);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content" style={{ maxWidth: 960 }}>

                {/* ── BREADCRUMB ── */}
                <button
                    onClick={() => navigate('/clients')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-secondary)', fontSize: 13, padding: '0 0 16px',
                        fontFamily: 'Inter, sans-serif',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                    <ArrowLeft size={14} /> Volver a Clientes
                </button>

                {/* ── HERO CARD ── */}
                <div style={{
                    background: 'var(--card-bg)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 16,
                    padding: '28px 28px 0',
                    marginBottom: 20,
                    boxShadow: 'var(--shadow-sm)',
                }}>
                    {/* Cabecera */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 24 }}>
                        {/* Avatar grande */}
                        <div style={{
                            width: 68, height: 68, borderRadius: 16, flexShrink: 0,
                            background: `${color}18`, color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22, fontWeight: 700,
                            border: `2px solid ${color}30`,
                        }}>
                            {initials(client.name)}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                    {client.name}
                                </h1>
                                {/* Indicador de actividad */}
                                {kpis.last_invoice_date && (
                                    <span style={{
                                        fontSize: 10.5, fontWeight: 600,
                                        padding: '2px 8px', borderRadius: 99,
                                        background: 'var(--secondary-light)', color: 'var(--secondary)',
                                    }}>
                                        Activo
                                    </span>
                                )}
                            </div>

                            {/* Datos de contacto */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
                                {client.company && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)' }}>
                                        <Building2 size={12} /> {client.company}
                                    </span>
                                )}
                                {client.email && (
                                    <a href={`mailto:${client.email}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--primary)', textDecoration: 'none' }}>
                                        <Mail size={12} /> {client.email}
                                    </a>
                                )}
                                {client.phone && (
                                    <a href={`tel:${client.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                                        <Phone size={12} /> {client.phone}
                                    </a>
                                )}
                                {client.document && (
                                    <span style={{ fontSize: 13, color: 'var(--text-disabled)' }}>
                                        NIF: {client.document}
                                    </span>
                                )}
                            </div>

                            {client.notes && (
                                <div style={{
                                    marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)',
                                    background: 'var(--bg)', borderRadius: 6, padding: '6px 10px',
                                    borderLeft: `3px solid ${color}`,
                                    maxWidth: 500,
                                }}>
                                    {client.notes}
                                </div>
                            )}
                        </div>

                        {/* Botón editar */}
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditing(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                        >
                            <Edit2 size={13} /> Editar
                        </button>
                    </div>

                    {/* ── KPIs ── */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                        borderTop: '1px solid var(--border)',
                        margin: '0 -28px',
                    }}>
                        {[
                            { icon: <TrendingUp size={15}/>,    color: 'var(--secondary)',  label: 'Total cobrado',     value: fmt(kpis.total_paid)    },
                            { icon: <Clock size={15}/>,         color: 'var(--warning)',    label: 'Pendiente de cobro',value: fmt(kpis.total_pending) },
                            { icon: <AlertTriangle size={15}/>, color: 'var(--error)',      label: 'Vencido',           value: fmt(kpis.total_overdue), alert: kpis.total_overdue > 0 },
                            { icon: <CheckCircle size={15}/>,   color: 'var(--primary)',    label: 'Proyectos',         value: `${kpis.projects_completed}/${kpis.project_count} completados` },
                        ].map((k, i) => (
                            <div key={i} style={{
                                padding: '16px 20px',
                                borderRight: i < 3 ? '1px solid var(--border)' : 'none',
                                borderLeft: i === 0 ? '1px solid transparent' : 'none',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                                    <span style={{ color: k.alert ? 'var(--error)' : k.color }}>{k.icon}</span>
                                    <span style={{ fontSize: 10.5, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        {k.label}
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: 18, fontWeight: 800,
                                    color: k.alert ? 'var(--error)' : 'var(--text-primary)',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>
                                    {k.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── TABS ── */}
                    <div style={{ display: 'flex', gap: 0, margin: '0 -28px', borderTop: '1px solid var(--border)', marginTop: 0 }}>
                        {TABS.map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                style={{
                                    padding: '12px 20px',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 13, fontWeight: tab === t ? 600 : 400,
                                    color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
                                    borderBottom: `2px solid ${tab === t ? 'var(--primary)' : 'transparent'}`,
                                    marginBottom: -1,
                                    fontFamily: 'Inter, sans-serif',
                                    transition: 'color .15s',
                                }}
                            >
                                {TAB_LABEL[t]}
                                <span style={{
                                    marginLeft: 6, fontSize: 10.5,
                                    background: tab === t ? 'var(--primary-light)' : 'var(--border)',
                                    color: tab === t ? 'var(--primary)' : 'var(--text-disabled)',
                                    padding: '1px 6px', borderRadius: 99, fontWeight: 600,
                                }}>
                                    {t === 'proyectos' ? projects.length : t === 'facturas' ? invoices.length : ''}
                                    {t === 'resumen' ? '★' : ''}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══ TAB: RESUMEN ══════════════════════════════════════════ */}
                {tab === 'resumen' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                        {/* Proyectos recientes */}
                        <div style={{ background: 'var(--card-bg)', border: '1.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                    Proyectos recientes
                                </h3>
                                <NavLink to="/projects" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>
                                    Ver todos →
                                </NavLink>
                            </div>
                            {projects.length === 0 ? (
                                <p style={{ color: 'var(--text-disabled)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                                    Sin proyectos aún
                                </p>
                            ) : projects.slice(0, 4).map(p => {
                                const s = STATUS_PROJ[p.status] || { label: p.status, color: '#9E9E9E' };
                                return (
                                    <div key={p.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '8px 0',
                                        borderBottom: '1px solid var(--border)',
                                    }}>
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: s.color, flexShrink: 0,
                                        }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {p.title}
                                            </div>
                                            {p.end_date && (
                                                <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 1 }}>
                                                    Hasta {fmtDateShort(p.end_date)}
                                                </div>
                                            )}
                                        </div>
                                        {p.budget && (
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                                                {fmt(p.budget)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Facturas recientes */}
                        <div style={{ background: 'var(--card-bg)', border: '1.5px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                    Facturas recientes
                                </h3>
                                <NavLink to="/invoices" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>
                                    Ver todas →
                                </NavLink>
                            </div>
                            {invoices.length === 0 ? (
                                <p style={{ color: 'var(--text-disabled)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                                    Sin facturas aún
                                </p>
                            ) : invoices.slice(0, 4).map(inv => {
                                const s = STATUS_INV[inv.status] || { label: inv.status, cls: 'badge' };
                                return (
                                    <div key={inv.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '8px 0',
                                        borderBottom: '1px solid var(--border)',
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                                {inv.invoice_number}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 1 }}>
                                                {fmtDate(inv.issue_date)}
                                            </div>
                                        </div>
                                        <span className={s.cls} style={{ flexShrink: 0 }}>
                                            <span className="badge-dot" />{s.label}
                                        </span>
                                        <div style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                                            {fmt(inv.total_amount)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ══ TAB: PROYECTOS ════════════════════════════════════════ */}
                {tab === 'proyectos' && (
                    <div style={{ background: 'var(--card-bg)', border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                        {projects.length === 0 ? (
                            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                                <FolderOpen size={28} color="var(--text-disabled)" style={{ marginBottom: 12 }} />
                                <p style={{ color: 'var(--text-disabled)', fontSize: 13 }}>Sin proyectos para este cliente</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Proyecto</th>
                                        <th>Estado</th>
                                        <th>Fechas</th>
                                        <th style={{ textAlign: 'right' }}>Presupuesto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.map((p, idx) => {
                                        const s = STATUS_PROJ[p.status] || { label: p.status, color: '#9E9E9E' };
                                        return (
                                            <tr key={p.id} style={{ animationDelay: `${idx * 20}ms` }}>
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{p.title}</div>
                                                    {p.description && (
                                                        <div style={{ fontSize: 11.5, color: 'var(--text-disabled)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {p.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                                        padding: '3px 8px', borderRadius: 99,
                                                        fontSize: 11.5, fontWeight: 600,
                                                        background: `${s.color}15`, color: s.color,
                                                    }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                                                        {s.label}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <Calendar size={11} color="var(--text-disabled)" />
                                                        {fmtDate(p.start_date)} → {fmtDate(p.end_date)}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                                    {p.budget ? fmt(p.budget) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ══ TAB: FACTURAS ═════════════════════════════════════════ */}
                {tab === 'facturas' && (
                    <div style={{ background: 'var(--card-bg)', border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                        {invoices.length === 0 ? (
                            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                                <FileText size={28} color="var(--text-disabled)" style={{ marginBottom: 12 }} />
                                <p style={{ color: 'var(--text-disabled)', fontSize: 13 }}>Sin facturas para este cliente</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Número</th>
                                        <th>Estado</th>
                                        <th>Emisión</th>
                                        <th>Vencimiento</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv, idx) => {
                                        const s = STATUS_INV[inv.status] || { label: inv.status, cls: 'badge' };
                                        return (
                                            <tr key={inv.id} style={{ animationDelay: `${idx * 20}ms` }}>
                                                <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{inv.invoice_number}</td>
                                                <td>
                                                    <span className={s.cls}>
                                                        <span className="badge-dot" />{s.label}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{fmtDate(inv.issue_date)}</td>
                                                <td style={{
                                                    fontSize: 13, fontWeight: inv.status === 'overdue' ? 700 : 400,
                                                    color: inv.status === 'overdue' ? 'var(--error)' : 'var(--text-secondary)',
                                                }}>
                                                    {fmtDate(inv.due_date)}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                                    {fmt(inv.total_amount)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </main>

            {/* Modal editar cliente */}
            <Modal open={editing} title="Editar cliente" onClose={() => setEditing(false)}>
                <ClientForm
                    initialData={client}
                    onSubmit={handleEdit}
                    onCancel={() => setEditing(false)}
                />
            </Modal>
        </div>
    );
}