// frontend/src/pages/ProjectTasks.jsx
import { useContext, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getTasks, createTask, updateTask, deleteTask, moveTask } from '../api/tasks';
import { getProjects } from '../api/projects';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import { Plus, ArrowLeft, Calendar, Flag, User, X, CheckCircle2, Clock, AlertCircle, Zap } from 'lucide-react';

// ── Constantes ────────────────────────────────────────────
const COLS = [
    { id: 'todo',        label: 'Por hacer',   color: '#6366f1', bg: 'rgba(99,102,241,0.08)'  },
    { id: 'in_progress', label: 'En progreso', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)'  },
    { id: 'review',      label: 'En revisión', color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)'  },
    { id: 'done',        label: 'Completado',  color: '#10b981', bg: 'rgba(16,185,129,0.08)'  },
];

const PRIORITY = {
    low:    { label: 'Baja',     color: '#6b7280', icon: <Flag size={11}/> },
    medium: { label: 'Media',    color: '#f59e0b', icon: <Flag size={11}/> },
    high:   { label: 'Alta',     color: '#ef4444', icon: <Flag size={11}/> },
    urgent: { label: 'Urgente',  color: '#7c3aed', icon: <Zap  size={11}/> },
};

const COL_ICON = {
    todo:        <Clock size={13}/>,
    in_progress: <AlertCircle size={13}/>,
    review:      <CheckCircle2 size={13}/>,
    done:        <CheckCircle2 size={13}/>,
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : null;
const isOverdue = d => d && new Date(d) < new Date() ? true : false;

// ── Formulario de tarea ───────────────────────────────────
function TaskForm({ initialData, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        title:       initialData?.title       || '',
        description: initialData?.description || '',
        status:      initialData?.status      || 'todo',
        priority:    initialData?.priority    || 'medium',
        due_date:    initialData?.due_date    ? initialData.due_date.split('T')[0] : '',
    });
    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = e => {
        e.preventDefault();
        if (!form.title.trim()) return alert('El título es obligatorio');
        onSubmit(form);
    };

    const PRIORITY_OPTS = [
        { value: 'low',    label: '🟢 Baja'    },
        { value: 'medium', label: '🟡 Media'   },
        { value: 'high',   label: '🔴 Alta'    },
        { value: 'urgent', label: '⚡ Urgente' },
    ];
    const STATUS_OPTS = [
        { value: 'todo',        label: 'Por hacer'   },
        { value: 'in_progress', label: 'En progreso' },
        { value: 'review',      label: 'En revisión' },
        { value: 'done',        label: 'Completado'  },
    ];

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
                <label className="form-label">Título <span style={{ color: 'var(--error)' }}>*</span></label>
                <input name="title" value={form.title} onChange={set} className="form-input"
                    placeholder="¿Qué hay que hacer?" autoFocus required />
            </div>
            <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea name="description" value={form.description} onChange={set}
                    className="form-input" rows={3} placeholder="Detalles, contexto, links…"
                    style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select name="status" value={form.status} onChange={set} className="form-select">
                        {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Prioridad</label>
                    <select name="priority" value={form.priority} onChange={set} className="form-select">
                        {PRIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha límite</label>
                    <input type="date" name="due_date" value={form.due_date} onChange={set} className="form-input" />
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                    {initialData ? 'Guardar cambios' : 'Crear tarea'}
                </button>
            </div>
        </form>
    );
}

// ── Tarjeta de tarea ──────────────────────────────────────
function TaskCard({ task, onEdit, onDelete, onDragStart, onDragEnd, isDragging }) {
    const p = PRIORITY[task.priority] || PRIORITY.medium;
    const overdue = isOverdue(task.due_date) && task.status !== 'done';

    return (
        <div
            draggable
            onDragStart={() => onDragStart(task)}
            onDragEnd={onDragEnd}
            onClick={() => onEdit(task)}
            style={{
                background:   'var(--card-bg)',
                borderRadius: 10,
                padding:      '12px 14px',
                marginBottom: 8,
                border:       `1px solid ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
                cursor:       'grab',
                opacity:      isDragging ? 0.5 : 1,
                boxShadow:    isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.04)',
                transition:   'box-shadow 0.15s, border-color 0.15s',
                userSelect:   'none',
            }}
        >
            {/* Título */}
            <div style={{
                fontSize: 13, fontWeight: 600, marginBottom: 8,
                color: task.status === 'done' ? 'var(--text-disabled)' : 'var(--text-primary)',
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
                lineHeight: 1.4,
            }}>
                {task.title}
            </div>

            {/* Descripción */}
            {task.description && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {task.description}
                </div>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Prioridad */}
                    <span style={{
                        fontSize: 10.5, fontWeight: 700, color: p.color,
                        background: `${p.color}18`, borderRadius: 4,
                        padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                        {p.icon} {p.label}
                    </span>
                    {/* Fecha */}
                    {task.due_date && (
                        <span style={{
                            fontSize: 11, color: overdue ? 'var(--error)' : 'var(--text-disabled)',
                            display: 'flex', alignItems: 'center', gap: 3, fontWeight: overdue ? 700 : 400,
                        }}>
                            <Calendar size={10} /> {fmtDate(task.due_date)}
                            {overdue && ' ⚠️'}
                        </span>
                    )}
                </div>
                {/* Eliminar */}
                <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onDelete(task); }}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-disabled)', padding: 2, borderRadius: 4,
                        display: 'flex', alignItems: 'center',
                        opacity: 0.5,
                    }}
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────
export default function ProjectTasks() {
    const { projectId } = useParams();
    const { token }     = useContext(AuthContext);
    const navigate      = useNavigate();

    const [tasks,    setTasks]    = useState([]);
    const [project,  setProject]  = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing,  setEditing]  = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [dragging, setDragging] = useState(null);
    const [dropCol,  setDropCol]  = useState(null);
    // Nueva tarea rápida por columna
    const [quickAdd, setQuickAdd] = useState(null); // col id
    const [quickTitle, setQuickTitle] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const [t, projects] = await Promise.all([
                getTasks(token, projectId),
                getProjects(token),
            ]);
            setTasks(Array.isArray(t) ? t : []);
            const proj = projects.find ? projects.find(p => String(p.id) === String(projectId))
                       : projects?.data?.find(p => String(p.id) === String(projectId));
            setProject(proj || null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (token && projectId) load(); }, [token, projectId]);

    const handleCreate = async data => {
        await createTask(token, projectId, data);
        setShowForm(false); load();
    };

    const handleEdit = async data => {
        await updateTask(token, projectId, editing.id, data);
        setEditing(null); load();
    };

    const handleDelete = async () => {
        await deleteTask(token, projectId, toDelete.id);
        setToDelete(null); load();
    };

    const handleDrop = async colId => {
        if (!dragging || dragging.status === colId) { setDragging(null); setDropCol(null); return; }
        const colTasks = tasks.filter(t => t.status === colId);
        const newPos   = colTasks.length;
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === dragging.id ? { ...t, status: colId, position: newPos } : t));
        await moveTask(token, projectId, dragging.id, colId, newPos);
        setDragging(null); setDropCol(null);
    };

    const handleQuickAdd = async colId => {
        if (!quickTitle.trim()) { setQuickAdd(null); setQuickTitle(''); return; }
        await createTask(token, projectId, { title: quickTitle.trim(), status: colId, priority: 'medium' });
        setQuickAdd(null); setQuickTitle('');
        load();
    };

    const stats = {
        total: tasks.length,
        done:  tasks.filter(t => t.status === 'done').length,
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content" style={{ overflowX: 'auto' }}>

                {/* HEADER */}
                <div className="page-header" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button
                            onClick={() => navigate('/projects')}
                            style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}
                        >
                            <ArrowLeft size={14} /> Proyectos
                        </button>
                        <div>
                            <h1 className="page-title" style={{ marginBottom: 2 }}>
                                {project?.title || 'Tareas del proyecto'}
                            </h1>
                            <p className="page-subtitle">
                                {stats.done}/{stats.total} tareas completadas
                                {stats.total > 0 && (
                                    <span style={{ marginLeft: 10, color: 'var(--primary)', fontWeight: 600 }}>
                                        {Math.round((stats.done / stats.total) * 100)}%
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                        <Plus size={15} /> Nueva tarea
                    </button>
                </div>

                {/* BARRA DE PROGRESO */}
                {stats.total > 0 && (
                    <div style={{ marginBottom: 20, background: 'var(--border)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 99,
                            background: 'linear-gradient(90deg, #6366f1, #10b981)',
                            width: `${Math.round((stats.done / stats.total) * 100)}%`,
                            transition: 'width 0.4s ease',
                        }} />
                    </div>
                )}

                {/* KANBAN */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                        {COLS.map(col => (
                            <div key={col.id} style={{ background: col.bg, borderRadius: 12, padding: 16, minHeight: 200 }}>
                                <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 16 }} />
                                {[...Array(2)].map((_, i) => (
                                    <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10, marginBottom: 8 }} />
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(240px, 1fr))', gap: 16, alignItems: 'start' }}>
                        {COLS.map(col => {
                            const colTasks = tasks
                                .filter(t => t.status === col.id)
                                .sort((a, b) => a.position - b.position);
                            const isDropTarget = dropCol === col.id && dragging?.status !== col.id;

                            return (
                                <div
                                    key={col.id}
                                    onDragOver={e => { e.preventDefault(); setDropCol(col.id); }}
                                    onDragLeave={() => setDropCol(null)}
                                    onDrop={() => handleDrop(col.id)}
                                    style={{
                                        background:    isDropTarget ? col.bg : 'var(--bg)',
                                        borderRadius:  14,
                                        padding:       12,
                                        border:        `2px dashed ${isDropTarget ? col.color : 'transparent'}`,
                                        transition:    'all 0.15s',
                                        minHeight:     120,
                                    }}
                                >
                                    {/* Cabecera columna */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 2px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                            <span style={{ color: col.color }}>{COL_ICON[col.id]}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>{col.label}</span>
                                            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-disabled)', background: 'var(--border)', borderRadius: 99, padding: '1px 7px' }}>
                                                {colTasks.length}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => { setQuickAdd(col.id); setQuickTitle(''); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: col.color, display: 'flex', alignItems: 'center', padding: 3, borderRadius: 6, opacity: 0.7 }}
                                            title="Añadir tarea rápida"
                                        >
                                            <Plus size={15} />
                                        </button>
                                    </div>

                                    {/* Tarjetas */}
                                    {colTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            isDragging={dragging?.id === task.id}
                                            onDragStart={setDragging}
                                            onDragEnd={() => { setDragging(null); setDropCol(null); }}
                                            onEdit={t => { setEditing(t); setShowForm(true); }}
                                            onDelete={setToDelete}
                                        />
                                    ))}

                                    {/* Quick add */}
                                    {quickAdd === col.id ? (
                                        <div style={{ marginTop: 4 }}>
                                            <input
                                                autoFocus
                                                value={quickTitle}
                                                onChange={e => setQuickTitle(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleQuickAdd(col.id);
                                                    if (e.key === 'Escape') { setQuickAdd(null); setQuickTitle(''); }
                                                }}
                                                placeholder="Nombre de la tarea…"
                                                className="form-input"
                                                style={{ fontSize: 13, marginBottom: 6 }}
                                            />
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => handleQuickAdd(col.id)} className="btn btn-primary" style={{ flex: 1, fontSize: 12, padding: '6px 0' }}>Añadir</button>
                                                <button onClick={() => { setQuickAdd(null); setQuickTitle(''); }} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 10px' }}>✕</button>
                                            </div>
                                        </div>
                                    ) : colTasks.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '20px 8px', color: 'var(--text-disabled)', fontSize: 12 }}>
                                            Suelta aquí o pulsa +
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* MODAL CREAR / EDITAR */}
            <Modal
                open={showForm}
                size="lg"
                title={editing ? `Editar: ${editing.title}` : 'Nueva tarea'}
                onClose={() => { setShowForm(false); setEditing(null); }}
            >
                <TaskForm
                    initialData={editing}
                    onSubmit={editing ? handleEdit : handleCreate}
                    onCancel={() => { setShowForm(false); setEditing(null); }}
                />
            </Modal>

            {/* MODAL ELIMINAR */}
            <Modal open={!!toDelete} title="Eliminar tarea" onClose={() => setToDelete(null)}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    ¿Eliminar <strong style={{ color: 'var(--text-primary)' }}>{toDelete?.title}</strong>?
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>
        </div>
    );
}
