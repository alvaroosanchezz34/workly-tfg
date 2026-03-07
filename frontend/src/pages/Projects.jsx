import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ProjectForm from '../components/ProjectForm';
import Modal from '../components/Modal';
import { getProjects, createProject, updateProject, deleteProject } from '../api/projects';
import { getClients } from '../api/clients';
import { Plus, FolderOpen, CalendarDays } from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS = {
    pending:     { label: 'Pendiente',   cls: 'badge badge-pending'     },
    in_progress: { label: 'En progreso', cls: 'badge badge-in_progress' },
    completed:   { label: 'Completado',  cls: 'badge badge-completed'   },
    cancelled:   { label: 'Cancelado',   cls: 'badge badge-cancelled'   },
};

export default function Projects() {
    const { token } = useContext(AuthContext);
    const [projects, setProjects] = useState([]);
    const [clients,  setClients]  = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing,  setEditing]  = useState(null);
    const [toDelete, setToDelete] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const [p, c] = await Promise.all([getProjects(token), getClients(token)]);
            setProjects(p); setClients(c);
        } finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const handleCreate = async d => { await createProject(token, d); setShowForm(false); load(); };
    const handleEdit   = async d => { await updateProject(token, editing.id, d); setEditing(null); load(); };
    const handleDelete = async () => { await deleteProject(token, toDelete.id); setToDelete(null); load(); };

    const openEdit = p => { setEditing(p); setShowForm(true); };
    const closeModal = () => { setShowForm(false); setEditing(null); };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* ── HEADER ── */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Proyectos</h1>
                        <p className="page-subtitle">{projects.length} proyecto{projects.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                        <Plus size={15} /> Nuevo proyecto
                    </button>
                </div>

                {/* ── TABLA ── */}
                {loading ? (
                    <div className="table-wrap">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5' }}>
                                <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} />
                                <div className="skeleton" style={{ height: 10, width: '25%' }} />
                            </div>
                        ))}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><FolderOpen size={22} /></div>
                            <p className="empty-title">Sin proyectos</p>
                            <p className="empty-desc">Crea tu primer proyecto y asócialo a un cliente existente</p>
                            <button className="btn btn-primary" style={{ marginTop: 10 }}
                                onClick={() => setShowForm(true)}>
                                <Plus size={14} /> Nuevo proyecto
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Proyecto</th>
                                    <th>Cliente</th>
                                    <th>Estado</th>
                                    <th>Fechas</th>
                                    <th>Presupuesto</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map((p, idx) => {
                                    const s = STATUS[p.status] || { label: p.status, cls: 'badge' };
                                    return (
                                        <tr key={p.id} style={{ animationDelay: `${idx * 25}ms` }}>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{p.title}</div>
                                                {p.description && (
                                                    <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {p.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{p.client_name}</td>
                                            <td>
                                                <span className={s.cls}>
                                                    <span className="badge-dot" />{s.label}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                                    <CalendarDays size={12} color="var(--text-disabled)" />
                                                    {fmtDate(p.start_date)} → {fmtDate(p.end_date)}
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {p.budget ? fmt(p.budget) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="action-link action-link-primary" onClick={() => openEdit(p)}>Editar</button>
                                                <button className="action-link action-link-danger" style={{ marginLeft: 4 }} onClick={() => setToDelete(p)}>Eliminar</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* ── MODAL FORM ── */}
            <Modal open={showForm} size="lg" title={editing ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={closeModal}>
                <ProjectForm
                    initialData={editing}
                    clients={clients}
                    onSubmit={editing ? handleEdit : handleCreate}
                    onCancel={closeModal}
                />
            </Modal>

            {/* ── MODAL CONFIRMAR BORRADO ── */}
            <Modal open={!!toDelete} title="Eliminar proyecto" onClose={() => setToDelete(null)}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    ¿Eliminar el proyecto{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{toDelete?.title}</strong>?
                    {' '}Esta acción no se puede deshacer.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>
        </div>
    );
}