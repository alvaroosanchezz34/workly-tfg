import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import {
    getTeamMembers, inviteMember, updateMemberRole,
    updateMemberStatus, removeMember, getTeamDashboard,
} from '../api/company';
import {
    Users, Plus, Shield, Wrench, MoreVertical,
    UserX, UserCheck, Trash2, BarChart2, Crown,
    Mail, Phone, Clock,
} from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ROLE_META = {
    admin:      { label: 'Admin',    icon: <Shield size={12} />,  color: 'var(--primary)',   bg: 'var(--primary-light)'   },
    technician: { label: 'Técnico',  icon: <Wrench size={12} />,  color: 'var(--secondary)', bg: 'var(--secondary-light)' },
};
const STATUS_META = {
    active:    { label: 'Activo',    color: 'var(--secondary)' },
    invited:   { label: 'Invitado',  color: 'var(--warning)'   },
    suspended: { label: 'Suspendido',color: 'var(--error)'     },
};

const initials = name => name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
const COLORS   = ['#1976D2','#4CAF50','#FF9800','#0288D1','#9C27B0','#F44336'];
const colorFor = id => COLORS[id % COLORS.length];

// ── Menú de acciones por miembro ──────────────────────────
function MemberMenu({ member, currentUserId, onRole, onStatus, onRemove }) {
    const [open, setOpen] = useState(false);
    const isSelf = member.id === currentUserId;

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => setOpen(v => !v)}
                className="btn-icon" style={{ display: 'inline-flex' }}>
                <MoreVertical size={14} />
            </button>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setOpen(false)} />
                    <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 200, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', minWidth: 180, padding: 4 }}>
                        {/* Cambiar rol */}
                        {!isSelf && member.company_role !== 'admin' && (
                            <button className="popup-item" onClick={() => { onRole(member.id, 'admin'); setOpen(false); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Shield size={13} /> Hacer admin
                            </button>
                        )}
                        {!isSelf && member.company_role !== 'technician' && (
                            <button className="popup-item" onClick={() => { onRole(member.id, 'technician'); setOpen(false); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Wrench size={13} /> Hacer técnico
                            </button>
                        )}
                        {/* Suspender / reactivar */}
                        {!isSelf && member.member_status !== 'suspended' && (
                            <button className="popup-item" onClick={() => { onStatus(member.id, 'suspended'); setOpen(false); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warning)' }}>
                                <UserX size={13} /> Suspender
                            </button>
                        )}
                        {!isSelf && member.member_status === 'suspended' && (
                            <button className="popup-item" onClick={() => { onStatus(member.id, 'active'); setOpen(false); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--secondary)' }}>
                                <UserCheck size={13} /> Reactivar
                            </button>
                        )}
                        {/* Eliminar */}
                        {!isSelf && (
                            <>
                                <div className="popup-separator" />
                                <button className="popup-item popup-item-danger" onClick={() => { onRemove(member.id); setOpen(false); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Trash2 size={13} /> Eliminar del equipo
                                </button>
                            </>
                        )}
                        {isSelf && (
                            <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-disabled)' }}>Eres tú</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Página principal ──────────────────────────────────────
export default function Team() {
    const { token, user, company, isCompanyAdmin } = useContext(AuthContext);

    const [members,   setMembers]   = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [showInvite, setShowInvite] = useState(false);
    const [showStats,  setShowStats]  = useState(false);
    const [invite, setInvite] = useState({ name: '', email: '', role: 'technician' });
    const [inviting, setInviting] = useState(false);
    const [inviteResult, setInviteResult] = useState(null);

    const load = async () => {
        setLoading(true); setError('');
        try {
            const [m, d] = await Promise.all([
                getTeamMembers(token),
                isCompanyAdmin ? getTeamDashboard(token) : Promise.resolve(null),
            ]);
            setMembers(m); setDashboard(d);
        } catch { setError('No se pudo cargar el equipo.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { if (token) load(); }, [token]);

    const handleInvite = async e => {
        e.preventDefault();
        setInviting(true);
        try {
            const result = await inviteMember(token, invite);
            setInviteResult(result);
            setInvite({ name: '', email: '', role: 'technician' });
            load();
        } catch (err) { alert(err.message || 'Error al invitar'); }
        finally { setInviting(false); }
    };

    const handleRole = async (userId, role) => {
        await updateMemberRole(token, userId, role); load();
    };
    const handleStatus = async (userId, status) => {
        if (!confirm(`¿${status === 'suspended' ? 'Suspender' : 'Reactivar'} este miembro?`)) return;
        await updateMemberStatus(token, userId, status); load();
    };
    const handleRemove = async userId => {
        if (!confirm('¿Eliminar este miembro del equipo? Perderá acceso a la empresa.')) return;
        await removeMember(token, userId); load();
    };

    const active    = members.filter(m => m.member_status === 'active');
    const invited   = members.filter(m => m.member_status === 'invited');
    const suspended = members.filter(m => m.member_status === 'suspended');

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* HEADER */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Equipo</h1>
                        <p className="page-subtitle">
                            {company?.name || 'Tu empresa'} ·{' '}
                            {active.length} miembro{active.length !== 1 ? 's' : ''} activo{active.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {isCompanyAdmin && dashboard && (
                            <button className="btn btn-ghost" onClick={() => setShowStats(true)}>
                                <BarChart2 size={14} /> Métricas
                            </button>
                        )}
                        {isCompanyAdmin && (
                            <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
                                <Plus size={15} /> Invitar miembro
                            </button>
                        )}
                    </div>
                </div>

                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

                {/* DASHBOARD CONSOLIDADO */}
                {isCompanyAdmin && dashboard && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                        {[
                            { label: 'Clientes totales',  value: dashboard.totals?.total_clients   || 0, color: 'var(--primary)'   },
                            { label: 'Proyectos activos', value: dashboard.totals?.total_projects  || 0, color: 'var(--secondary)' },
                            { label: 'Facturado',         value: fmt(dashboard.totals?.total_invoiced), color: 'var(--secondary)' },
                            { label: 'Pendiente cobro',   value: fmt(dashboard.pending_amount),         color: 'var(--error)'     },
                        ].map(k => (
                            <div key={k.label} className="metric-card">
                                <div style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.label}</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* LISTA DE MIEMBROS */}
                {loading ? (
                    <div className="table-wrap">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5', display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton" style={{ height: 12, width: '30%', marginBottom: 6 }} />
                                    <div className="skeleton" style={{ height: 10, width: '45%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : members.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><Users size={22} /></div>
                            <p className="empty-title">Sin miembros en el equipo</p>
                            <p className="empty-desc">Invita a tus técnicos para que gestionen clientes y proyectos</p>
                            {isCompanyAdmin && (
                                <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setShowInvite(true)}>
                                    <Plus size={14} /> Invitar primer miembro
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                        {/* Activos */}
                        {active.length > 0 && (
                            <div className="table-wrap">
                                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Activos ({active.length})
                                </div>
                                {active.map((m, idx) => <MemberRow key={m.id} member={m} idx={idx} currentUserId={user?.id} isAdmin={isCompanyAdmin} onRole={handleRole} onStatus={handleStatus} onRemove={handleRemove} />)}
                            </div>
                        )}

                        {/* Invitados pendientes */}
                        {invited.length > 0 && (
                            <div className="table-wrap">
                                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Pendientes de aceptar ({invited.length})
                                </div>
                                {invited.map((m, idx) => <MemberRow key={m.id} member={m} idx={idx} currentUserId={user?.id} isAdmin={isCompanyAdmin} onRole={handleRole} onStatus={handleStatus} onRemove={handleRemove} />)}
                            </div>
                        )}

                        {/* Suspendidos */}
                        {suspended.length > 0 && (
                            <div className="table-wrap" style={{ opacity: 0.7 }}>
                                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Suspendidos ({suspended.length})
                                </div>
                                {suspended.map((m, idx) => <MemberRow key={m.id} member={m} idx={idx} currentUserId={user?.id} isAdmin={isCompanyAdmin} onRole={handleRole} onStatus={handleStatus} onRemove={handleRemove} />)}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* MODAL INVITAR */}
            <Modal open={showInvite} title="Invitar nuevo miembro" onClose={() => { setShowInvite(false); setInviteResult(null); }}>
                {inviteResult ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>¡Miembro invitado!</h3>
                        {inviteResult.tempPassword && (
                            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginBottom: 4 }}>Contraseña temporal (cópiala ahora)</div>
                                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>{inviteResult.tempPassword}</div>
                            </div>
                        )}
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                            El miembro podrá acceder con estas credenciales y cambiar su contraseña desde el perfil.
                        </p>
                        <button className="btn btn-primary" onClick={() => { setShowInvite(false); setInviteResult(null); }}>Entendido</button>
                    </div>
                ) : (
                    <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">Nombre completo *</label>
                            <input className="form-input" value={invite.name} onChange={e => setInvite(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del técnico" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email *</label>
                            <input type="email" className="form-input" value={invite.email} onChange={e => setInvite(f => ({ ...f, email: e.target.value }))} placeholder="tecnico@empresa.com" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rol</label>
                            <select className="form-select" value={invite.role} onChange={e => setInvite(f => ({ ...f, role: e.target.value }))}>
                                <option value="technician">Técnico — solo ve sus propios datos</option>
                                <option value="admin">Admin — ve y gestiona todo el equipo</option>
                            </select>
                        </div>
                        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            Se creará una cuenta nueva con contraseña temporal. El miembro podrá cambiarla al entrar.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                            <button type="button" className="btn btn-ghost" onClick={() => setShowInvite(false)}>Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={inviting}>
                                {inviting ? 'Invitando…' : 'Invitar miembro'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* MODAL MÉTRICAS POR TÉCNICO */}
            {showStats && dashboard && (
                <Modal open size="lg" title="Rendimiento del equipo" onClose={() => setShowStats(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(dashboard.byMember || []).map((m, i) => (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${colorFor(m.id)}18`, color: colorFor(m.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                    {initials(m.name)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                                        {m.clients} cliente{m.clients !== 1 ? 's' : ''} · {m.projects} proyecto{m.projects !== 1 ? 's' : ''} · {m.invoices} factura{m.invoices !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--secondary)', fontVariantNumeric: 'tabular-nums' }}>
                                    {fmt(m.invoiced)}
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ── Fila de miembro ───────────────────────────────────────
function MemberRow({ member, idx, currentUserId, isAdmin, onRole, onStatus, onRemove }) {
    const isSelf   = member.id === currentUserId;
    const roleMeta = ROLE_META[member.company_role] || ROLE_META.technician;
    const staMeta  = STATUS_META[member.member_status] || STATUS_META.active;
    const color    = colorFor(member.id);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderBottom: '1px solid var(--border)', animationDelay: `${idx * 20}ms` }}>
            {/* Avatar */}
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                {member.avatar_url
                    ? <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials(member.name)
                }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{member.name}</span>
                    {isSelf && <span style={{ fontSize: 10, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 7px', borderRadius: 99, fontWeight: 700 }}>Tú</span>}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: roleMeta.color, background: roleMeta.bg, padding: '2px 8px', borderRadius: 99 }}>
                        {roleMeta.icon} {roleMeta.label}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {member.email && (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Mail size={10} /> {member.email}
                        </span>
                    )}
                    {member.phone && (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={10} /> {member.phone}
                        </span>
                    )}
                    {member.last_login && (
                        <span style={{ fontSize: 12, color: 'var(--text-disabled)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={10} /> Último acceso: {new Date(member.last_login).toLocaleDateString('es-ES')}
                        </span>
                    )}
                </div>
            </div>

            {/* Estado */}
            <span style={{ fontSize: 11.5, fontWeight: 600, color: staMeta.color, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: staMeta.color }} />
                {staMeta.label}
            </span>

            {/* Acciones */}
            {isAdmin && (
                <MemberMenu
                    member={{ ...member, company_role: member.company_role }}
                    currentUserId={currentUserId}
                    onRole={onRole}
                    onStatus={onStatus}
                    onRemove={onRemove}
                />
            )}
        </div>
    );
}