import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getDeletedClients, restoreClient } from '../api/clients';
import Sidebar from '../components/Sidebar';
import { RotateCcw, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fmtDate = d => d
    ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const initials = name =>
    name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

export default function DeletedClients() {
    const { token } = useContext(AuthContext);
    const [clients,   setClients]   = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [restoring, setRestoring] = useState(null);
    const navigate = useNavigate();

    const load = async () => {
        setLoading(true);
        try { setClients(await getDeletedClients(token)); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const handleRestore = async id => {
        setRestoring(id);
        try { await restoreClient(token, id); load(); }
        finally { setRestoring(null); }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* ── HEADER ── */}
                <div className="page-header">
                    <div>
                        <button
                            className="btn btn-ghost btn-sm"
                            style={{ marginBottom: 8, paddingLeft: 4 }}
                            onClick={() => navigate('/clients')}
                        >
                            <ArrowLeft size={14} /> Volver a clientes
                        </button>
                        <h1 className="page-title">Clientes eliminados</h1>
                        <p className="page-subtitle">
                            {clients.length
                                ? `${clients.length} cliente${clients.length !== 1 ? 's' : ''} en papelera`
                                : 'Papelera vacía'}
                        </p>
                    </div>
                </div>

                {/* ── TABLA ── */}
                {loading ? (
                    <div className="table-wrap">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5', display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 8 }} />
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton" style={{ height: 12, width: '28%', marginBottom: 6 }} />
                                    <div className="skeleton" style={{ height: 10, width: '42%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : clients.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><Trash2 size={22} /></div>
                            <p className="empty-title">Papelera vacía</p>
                            <p className="empty-desc">Los clientes que elimines aparecerán aquí. Podrás restaurarlos cuando quieras.</p>
                        </div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Email</th>
                                    <th>Empresa</th>
                                    <th>Eliminado</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map((c, i) => (
                                    <tr
                                        key={c.id}
                                        style={{ animationDelay: `${i * 25}ms`, opacity: 0.75 }}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: 8,
                                                    background: '#F5F5F5', color: '#9E9E9E',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 12, fontWeight: 600, flexShrink: 0,
                                                }}>
                                                    {initials(c.name)}
                                                </div>
                                                <span style={{ fontWeight: 500, textDecoration: 'line-through', color: 'var(--text-secondary)' }}>
                                                    {c.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--text-disabled)', fontSize: 13 }}>
                                            {c.email || <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                                        </td>
                                        <td style={{ color: 'var(--text-disabled)', fontSize: 13 }}>
                                            {c.company || <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                                        </td>
                                        <td style={{ color: 'var(--text-disabled)', fontSize: 12.5 }}>
                                            {fmtDate(c.deleted_at)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                className="action-link action-link-success"
                                                onClick={() => handleRestore(c.id)}
                                                disabled={restoring === c.id}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, opacity: restoring === c.id ? 0.5 : 1 }}
                                            >
                                                <RotateCcw size={12} />
                                                {restoring === c.id ? 'Restaurando…' : 'Restaurar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}