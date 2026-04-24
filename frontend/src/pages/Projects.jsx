import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ProjectForm from '../components/ProjectForm';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { getProjects, createProject, updateProject, deleteProject } from '../api/projects';
import { getClients } from '../api/clients';
import { Plus, FolderOpen, CalendarDays, Search, LayoutGrid, List } from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS = {
    pending:     { label: 'Pendiente',   cls: 'badge badge-pending',     color: '#FF9800' },
    in_progress: { label: 'En progreso', cls: 'badge badge-in_progress', color: '#0288D1' },
    completed:   { label: 'Completado',  cls: 'badge badge-completed',   color: '#4CAF50' },
    cancelled:   { label: 'Cancelado',   cls: 'badge badge-cancelled',   color: '#9E9E9E' },
};

const KANBAN_COLS     = ['pending', 'in_progress', 'completed', 'cancelled'];
const PAGE_SIZE       = 15;
const STATUS_FILTERS  = ['all', 'pending', 'in_progress', 'completed', 'cancelled'];
const FILTER_LABELS   = { all: 'Todos', pending: 'Pendiente', in_progress: 'En progreso', completed: 'Completado', cancelled: 'Cancelado' };

function KanbanCard({ project, onEdit, onDelete, isDragging, onDragStart, onDragEnd }) {
    return (
        <div className={`kanban-card${isDragging ? ' dragging' : ''}`}
            draggable onDragStart={() => onDragStart(project)} onDragEnd={onDragEnd}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{project.title}</div>
            {project.client_name && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 8 }}>{project.client_name}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                {project.end_date && <span style={{ fontSize: 11, color: 'var(--text-disabled)', display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={10} />{fmtDate(project.end_date)}</span>}
                {project.budget   && <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--secondary)' }}>{fmt(project.budget)}</span>}
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button className="action-link action-link-primary" style={{ fontSize: 11.5 }} onClick={() => onEdit(project)}>Editar</button>
                <button className="action-link action-link-danger"  style={{ fontSize: 11.5 }} onClick={() => onDelete(project)}>Eliminar</button>
            </div>
        </div>
    );
}

export default function Projects() {
    const { token } = useContext(AuthContext);
    const [projects,     setProjects]     = useState([]);
    const [clients,      setClients]      = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState('');
    const [search,       setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [view,         setView]         = useState('table');
    const [page,         setPage]         = useState(1);
    const [showForm,     setShowForm]     = useState(false);
    const [editing,      setEditing]      = useState(null);
    const [toDelete,     setToDelete]     = useState(null);
    const [dragging,     setDragging]     = useState(null);

    const load = async () => {
        setLoading(true); setError('');
        try { const [p, c] = await Promise.all([getProjects(token), getClients(token)]); setProjects(p); setClients(c); }
        catch { setError('No se pudieron cargar los proyectos.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { if (token) load(); }, [token]);

    const handleCreate = async d => { await createProject(token, d); setShowForm(false); load(); };
    const handleEdit   = async d => { await updateProject(token, editing.id, d); setEditing(null); load(); };
    const handleDelete = async () => { await deleteProject(token, toDelete.id); setToDelete(null); load(); };
    const openEdit     = p => { setEditing(p); setShowForm(true); };
    const closeModal   = () => { setShowForm(false); setEditing(null); };

    const handleDrop = async newStatus => {
        if (!dragging || dragging.status === newStatus) return;
        setProjects(prev => prev.map(p => p.id === dragging.id ? { ...p, status: newStatus } : p));
        await updateProject(token, dragging.id, { ...dragging, status: newStatus });
        setDragging(null);
    };

    const filtered = projects.filter(p => {
        const q = search.toLowerCase();
        return (!q || p.title.toLowerCase().includes(q) || (p.client_name||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q))
            && (statusFilter === 'all' || p.status === statusFilter);
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                <div className="page-header">
                    <div>
                        <h1 className="page-title">Proyectos</h1>
                        <p className="page-subtitle">{projects.length} proyecto{projects.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                            {[['table', <List size={15}/>], ['kanban', <LayoutGrid size={15}/>]].map(([v, icon]) => (
                                <button key={v} onClick={() => setView(v)} style={{ padding: '6px 10px', border: 'none', cursor: 'pointer', background: view === v ? 'var(--primary)' : 'var(--card-bg)', color: view === v ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', transition: 'all .15s' }}>{icon}</button>
                            ))}
                        </div>
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                            <Plus size={15} /> Nuevo proyecto
                        </button>
                    </div>
                </div>

                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: '1 1 200px', minWidth: 200 }}>
                        <Search size={14} className="search-bar-icon" />
                        <input className="form-input" style={{ paddingLeft: 34 }} placeholder="Buscar…" value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {STATUS_FILTERS.map(f => (
                            <button key={f} className={`filter-chip${statusFilter === f ? ' active' : ''}`}
                                onClick={() => { setStatusFilter(f); setPage(1); }}>
                                {FILTER_LABELS[f]}
                                <span style={{ marginLeft: 5, opacity: 0.65, fontSize: 11 }}>
                                    {f === 'all' ? projects.length : projects.filter(p => p.status === f).length}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* TABLA */}
                {view === 'table' && (
                    loading ? (
                        <div className="table-wrap">{[...Array(4)].map((_, i) => <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)' }}><div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 10, width: '25%' }} /></div>)}</div>
                    ) : filtered.length === 0 ? (
                        <div className="table-wrap"><div className="empty-state"><div className="empty-icon"><FolderOpen size={22}/></div><p className="empty-title">{search || statusFilter !== 'all' ? 'Sin resultados' : 'Sin proyectos'}</p><p className="empty-desc">{search || statusFilter !== 'all' ? 'Prueba con otros términos' : 'Crea tu primer proyecto'}</p>{!search && statusFilter === 'all' && <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}><Plus size={14}/>Nuevo proyecto</button>}</div></div>
                    ) : (
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead><tr><th>Proyecto</th><th>Cliente</th><th>Estado</th><th>Fechas</th><th>Presupuesto</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                                <tbody>
                                    {paginated.map((p, idx) => {
                                        const s = STATUS[p.status] || { label: p.status, cls: 'badge' };
                                        return (
                                            <tr key={p.id} style={{ animationDelay: `${idx * 25}ms` }}>
                                                <td><div style={{ fontWeight: 500 }}>{p.title}</div>{p.description && <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{p.client_name}</td>
                                                <td><span className={s.cls}><span className="badge-dot"/>{s.label}</span></td>
                                                <td><div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-secondary)' }}><CalendarDays size={12} color="var(--text-disabled)"/>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</div></td>
                                                <td style={{ fontWeight: 600 }}>{p.budget ? fmt(p.budget) : <span style={{ color: 'var(--text-disabled)' }}>—</span>}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="action-link action-link-primary" onClick={() => openEdit(p)}>Editar</button>
                                                    <button className="action-link action-link-danger" style={{ marginLeft: 4 }} onClick={() => setToDelete(p)}>Eliminar</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
                        </div>
                    )
                )}

                {/* KANBAN */}
                {view === 'kanban' && !loading && (
                    <div className="kanban-board">
                        {KANBAN_COLS.map(col => {
                            const s    = STATUS[col];
                            const cols = filtered.filter(p => p.status === col);
                            return (
                                <div key={col} className="kanban-col"
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => handleDrop(col)}>
                                    <div className="kanban-col-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                                            <span style={{ color: s.color }}>{s.label}</span>
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-disabled)' }}>{cols.length}</span>
                                    </div>
                                    <div className="kanban-col-body">
                                        {cols.map(p => <KanbanCard key={p.id} project={p} isDragging={dragging?.id === p.id} onDragStart={setDragging} onDragEnd={() => setDragging(null)} onEdit={openEdit} onDelete={setToDelete} />)}
                                        {cols.length === 0 && <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, color: 'var(--text-disabled)' }}>Suelta aquí</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <Modal open={showForm} size="lg" title={editing ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={closeModal}>
                <ProjectForm initialData={editing} clients={clients} onSubmit={editing ? handleEdit : handleCreate} onCancel={closeModal} />
            </Modal>
            <Modal open={!!toDelete} title="Eliminar proyecto" onClose={() => setToDelete(null)}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>¿Eliminar <strong style={{ color: 'var(--text-primary)' }}>{toDelete?.title}</strong>? No se puede deshacer.</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>
        </div>
    );
}