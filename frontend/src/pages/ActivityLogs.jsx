import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getActivityLogs } from '../api/activityLogs';
import { FilePlus, FileEdit, Trash2, RotateCcw, Activity } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const ACTION_META = {
    created:  { icon: <FilePlus  size={13} />, cls: 'badge badge-paid',    label: 'Creado'     },
    updated:  { icon: <FileEdit  size={13} />, cls: 'badge badge-sent',    label: 'Editado'    },
    deleted:  { icon: <Trash2   size={13} />, cls: 'badge badge-overdue', label: 'Eliminado'  },
    restored: { icon: <RotateCcw size={13} />, cls: 'badge badge-pending', label: 'Restaurado' },
};

const ENTITY_LABEL = {
    client: 'Cliente', project: 'Proyecto', invoice: 'Factura',
    expense: 'Gasto',  service: 'Servicio',
};

const timeAgo = d => {
    const diff = Math.floor((Date.now() - new Date(d)) / 1000);
    if (diff < 60)    return 'Ahora mismo';
    if (diff < 3600)  return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function ActivityLogs() {
    const { token } = useContext(AuthContext);
    const [logs,    setLogs]    = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getActivityLogs(token).then(setLogs).finally(() => setLoading(false));
    }, []);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                <div className="page-header">
                    <div>
                        <h1 className="page-title">Registro de actividad</h1>
                        <p className="page-subtitle">Historial de acciones realizadas en el sistema</p>
                    </div>
                </div>

                {loading ? (
                    <div className="table-wrap">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5', display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton" style={{ height: 12, width: '32%', marginBottom: 6 }} />
                                    <div className="skeleton" style={{ height: 10, width: '20%' }} />
                                </div>
                                <div className="skeleton" style={{ height: 10, width: 70 }} />
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><Activity size={22} /></div>
                            <p className="empty-title">Sin actividad registrada</p>
                            <p className="empty-desc">Las acciones que realices en el sistema aparecerán aquí</p>
                        </div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Acción</th>
                                    <th>Entidad</th>
                                    <th>Usuario</th>
                                    <th style={{ textAlign: 'right' }}>Cuándo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, i) => {
                                    const meta = ACTION_META[log.action] || {
                                        icon: <Activity size={13} />,
                                        cls:  'badge badge-draft',
                                        label: log.action,
                                    };
                                    return (
                                        <tr key={log.id} style={{ animationDelay: `${i * 18}ms` }}>
                                            <td>
                                                <span className={meta.cls} style={{ gap: 6 }}>
                                                    {meta.icon}
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 500 }}>
                                                    {ENTITY_LABEL[log.entity] || log.entity}
                                                </span>
                                                <span style={{ color: 'var(--text-disabled)', fontSize: 12, marginLeft: 5 }}>
                                                    #{log.entity_id}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                                {log.user_name || <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                                            </td>
                                            <td style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--text-disabled)' }}>
                                                {timeAgo(log.created_at)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}