// frontend/src/pages/TimeTracker.jsx
import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
    getTimeEntries, getActiveEntry, getTimeStats,
    startTimer, stopTimer, addManualEntry, deleteTimeEntry,
} from '../api/timeTracking';
import { getProjects } from '../api/projects';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import { Play, Square, Plus, Trash2, Clock, TrendingUp, Euro, BarChart2, Timer } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────
const fmt     = v  => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d  => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtSecs = s => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

const fmtDuration = s => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

// ── Componente temporizador activo ────────────────────────
function ActiveTimer({ entry, onStop }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!entry) return;
        const started = new Date(entry.started_at).getTime();
        const tick    = () => setElapsed(Math.floor((Date.now() - started) / 1000));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [entry]);

    if (!entry) return null;

    const earned = entry.hourly_rate > 0 ? (elapsed / 3600 * entry.hourly_rate) : 0;

    return (
        <div style={{
            background:   'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            borderRadius: 16, padding: '20px 24px', marginBottom: 24,
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 16,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Pulso animado */}
                <div style={{ position: 'relative' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#10b981' }} />
                    <div style={{
                        position: 'absolute', inset: -4, borderRadius: '50%',
                        border: '2px solid rgba(16,185,129,0.4)',
                        animation: 'pulse-ring 1.5s ease-out infinite',
                    }} />
                </div>
                <div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
                        {entry.project_name || 'Sin proyecto'} · Temporizador activo
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                        {entry.description || 'Sin descripción'}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                {/* Tiempo */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
                        {fmtSecs(elapsed)}
                    </div>
                    {earned > 0 && (
                        <div style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                            {fmt(earned)} generados
                        </div>
                    )}
                </div>

                {/* Botón parar */}
                <button
                    onClick={onStop}
                    style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: '#ef4444', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(239,68,68,0.5)',
                        transition: 'transform 0.1s',
                    }}
                    title="Parar temporizador"
                >
                    <Square size={20} color="#fff" fill="#fff" />
                </button>
            </div>

            <style>{`
                @keyframes pulse-ring {
                    0%   { transform: scale(1);   opacity: 1; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

// ── Formulario inicio temporizador ────────────────────────
function StartForm({ projects, onStart, onManual }) {
    const [desc,      setDesc]      = useState('');
    const [projectId, setProjectId] = useState('');
    const [billable,  setBillable]  = useState(true);
    const [showManual, setShowManual] = useState(false);
    // Manual form
    const [mDate,  setMDate]  = useState(new Date().toISOString().split('T')[0]);
    const [mHours, setMHours] = useState('');
    const [mMins,  setMMins]  = useState('');
    const [mDesc,  setMDesc]  = useState('');
    const [mProj,  setMProj]  = useState('');

    const handleStart = () => {
        onStart({ description: desc, project_id: projectId || null, billable });
        setDesc(''); setProjectId('');
    };

    const handleManual = e => {
        e.preventDefault();
        if (!mDate || (!mHours && !mMins)) return alert('Fecha y duración son obligatorias');
        onManual({ project_id: mProj || null, description: mDesc, date: mDate, hours: mHours || 0, minutes: mMins || 0, billable });
        setShowManual(false); setMHours(''); setMMins(''); setMDesc('');
    };

    return (
        <div className="card card-p" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStart()}
                    placeholder="¿En qué estás trabajando?"
                    className="form-input"
                    style={{ flex: '1 1 280px', minWidth: 200 }}
                />
                <select value={projectId} onChange={e => setProjectId(e.target.value)} className="form-select" style={{ minWidth: 160 }}>
                    <option value="">Sin proyecto</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={billable} onChange={e => setBillable(e.target.checked)} />
                    Facturable
                </label>
                <button onClick={handleStart} className="btn btn-primary" style={{ gap: 6 }}>
                    <Play size={14} fill="currentColor" /> Iniciar
                </button>
                <button onClick={() => setShowManual(true)} className="btn btn-ghost" style={{ gap: 6 }}>
                    <Plus size={14} /> Manual
                </button>
            </div>

            {/* Modal entrada manual */}
            <Modal open={showManual} title="Añadir tiempo manualmente" onClose={() => setShowManual(false)}>
                <form onSubmit={handleManual} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Fecha *</label>
                            <input type="date" value={mDate} onChange={e => setMDate(e.target.value)} className="form-input" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Proyecto</label>
                            <select value={mProj} onChange={e => setMProj(e.target.value)} className="form-select">
                                <option value="">Sin proyecto</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <input value={mDesc} onChange={e => setMDesc(e.target.value)} className="form-input" placeholder="¿En qué trabajaste?" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Horas</label>
                            <input type="number" min="0" max="23" value={mHours} onChange={e => setMHours(e.target.value)} className="form-input" placeholder="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Minutos</label>
                            <input type="number" min="0" max="59" value={mMins} onChange={e => setMMins(e.target.value)} className="form-input" placeholder="0" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowManual(false)}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Añadir</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────
export default function TimeTracker() {
    const { token } = useContext(AuthContext);

    const [entries,    setEntries]    = useState([]);
    const [active,     setActive]     = useState(null);
    const [stats,      setStats]      = useState(null);
    const [projects,   setProjects]   = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [tab,        setTab]        = useState('timer'); // 'timer' | 'stats'
    const [toDelete,   setToDelete]   = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [data, act, st, proj] = await Promise.all([
                getTimeEntries(token),
                getActiveEntry(token),
                getTimeStats(token),
                getProjects(token),
            ]);
            setEntries(data.entries ?? []);
            setActive(act);
            setStats(st);
            const projList = Array.isArray(proj) ? proj : (proj?.data ?? []);
            setProjects(projList);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { if (token) load(); }, [token, load]);

    const handleStart = async data => {
        await startTimer(token, data);
        load();
    };

    const handleStop = async () => {
        if (!active) return;
        await stopTimer(token, active.id);
        load();
    };

    const handleManual = async data => {
        await addManualEntry(token, data);
        load();
    };

    const handleDelete = async () => {
        await deleteTimeEntry(token, toDelete.id);
        setToDelete(null); load();
    };

    // KPIs del mes
    const monthSeconds = Number(stats?.month?.total_seconds  || 0);
    const monthEarned  = Number(stats?.month?.total_earned   || 0);
    const monthEntries = Number(stats?.month?.total_entries  || 0);
    const avgDuration  = Number(stats?.month?.avg_duration   || 0);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* HEADER */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Control de horas</h1>
                        <p className="page-subtitle">Registra tu tiempo y mide tu productividad</p>
                    </div>
                    <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                        {[['timer', <Timer size={14}/>, 'Temporizador'], ['stats', <BarChart2 size={14}/>, 'Estadísticas']].map(([v, icon, label]) => (
                            <button key={v} onClick={() => setTab(v)} style={{ padding: '7px 14px', border: 'none', cursor: 'pointer', background: tab === v ? 'var(--primary)' : 'var(--card-bg)', color: tab === v ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                                {icon} {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* TEMPORIZADOR ACTIVO */}
                <ActiveTimer entry={active} onStop={handleStop} />

                {tab === 'timer' && (
                    <>
                        {/* KPIs */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                            {[
                                { label: 'Horas este mes',    value: fmtDuration(monthSeconds), icon: <Clock size={16}/>,       color: '#6366f1' },
                                { label: 'Facturado',         value: fmt(monthEarned),           icon: <Euro size={16}/>,        color: '#10b981' },
                                { label: 'Registros',         value: monthEntries,               icon: <TrendingUp size={16}/>,  color: '#f59e0b' },
                                { label: 'Media por registro', value: fmtDuration(avgDuration),  icon: <BarChart2 size={16}/>,   color: '#0ea5e9' },
                            ].map(k => (
                                <div key={k.label} className="metric-card" style={{ borderLeft: `3px solid ${k.color}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <span style={{ color: k.color }}>{k.icon}</span>
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.label}</span>
                                    </div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{k.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* FORM INICIAR */}
                        <StartForm projects={projects} onStart={handleStart} onManual={handleManual} />

                        {/* LISTA ENTRADAS */}
                        <div className="table-wrap">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
                                        <div className="skeleton" style={{ height: 12, width: '50%', marginBottom: 8 }} />
                                        <div className="skeleton" style={{ height: 10, width: '30%' }} />
                                    </div>
                                ))
                            ) : entries.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon"><Clock size={22} /></div>
                                    <p className="empty-title">Sin registros todavía</p>
                                    <p className="empty-desc">Inicia el temporizador o añade tiempo manualmente</p>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Descripción</th>
                                            <th>Proyecto</th>
                                            <th>Fecha</th>
                                            <th style={{ textAlign: 'right' }}>Duración</th>
                                            <th style={{ textAlign: 'right' }}>Ganado</th>
                                            <th style={{ textAlign: 'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {entries.map((e, idx) => (
                                            <tr key={e.id} style={{ animationDelay: `${idx * 20}ms` }}>
                                                <td>
                                                    <div style={{ fontWeight: 500, fontSize: 13 }}>{e.description || <span style={{ color: 'var(--text-disabled)' }}>Sin descripción</span>}</div>
                                                    {e.billable ? (
                                                        <span style={{ fontSize: 10.5, color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.1)', borderRadius: 4, padding: '1px 5px' }}>Facturable</span>
                                                    ) : (
                                                        <span style={{ fontSize: 10.5, color: 'var(--text-disabled)', background: 'var(--border)', borderRadius: 4, padding: '1px 5px' }}>No facturable</span>
                                                    )}
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{e.project_name || '—'}</td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{fmtDate(e.started_at)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                                                    {e.duration ? fmtDuration(e.duration) : (
                                                        <span style={{ color: '#10b981', fontWeight: 700 }}>● En curso</span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: e.earned > 0 ? '#10b981' : 'var(--text-disabled)' }}>
                                                    {e.earned > 0 ? fmt(e.earned) : '—'}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="action-link action-link-danger" onClick={() => setToDelete(e)}>
                                                        <Trash2 size={12} style={{ verticalAlign: 'middle' }} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}

                {tab === 'stats' && stats && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                        {/* Horas por día */}
                        <div className="card card-p">
                            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Horas por día (últimos 7 días)</h3>
                            {stats.byDay?.length === 0 ? (
                                <p style={{ color: 'var(--text-disabled)', fontSize: 13 }}>Sin datos esta semana</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {stats.byDay?.map(d => {
                                        const hours = d.seconds / 3600;
                                        const pct   = Math.min(100, (hours / 8) * 100);
                                        const label = new Date(d.day).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                                        return (
                                            <div key={d.day}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                                                    <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{label}</span>
                                                    <span style={{ fontWeight: 700 }}>{fmtDuration(d.seconds)}</span>
                                                </div>
                                                <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: 99, transition: 'width 0.4s' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Horas por proyecto */}
                        <div className="card card-p">
                            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Horas por proyecto (este mes)</h3>
                            {stats.byProject?.length === 0 ? (
                                <p style={{ color: 'var(--text-disabled)', fontSize: 13 }}>Sin datos este mes</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {stats.byProject?.map((p, i) => {
                                        const maxSecs = stats.byProject[0]?.seconds || 1;
                                        const pct = (p.seconds / maxSecs) * 100;
                                        const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#0ea5e9'];
                                        return (
                                            <div key={i}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                                                    <span style={{ fontWeight: 500 }}>{p.project || 'Sin proyecto'}</span>
                                                    <div style={{ display: 'flex', gap: 12 }}>
                                                        <span style={{ fontWeight: 700 }}>{fmtDuration(p.seconds)}</span>
                                                        {p.earned > 0 && <span style={{ color: '#10b981', fontWeight: 700 }}>{fmt(p.earned)}</span>}
                                                    </div>
                                                </div>
                                                <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: 99, transition: 'width 0.4s' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* MODAL ELIMINAR */}
            <Modal open={!!toDelete} title="Eliminar registro" onClose={() => setToDelete(null)}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    ¿Eliminar este registro de <strong>{toDelete?.duration ? fmtDuration(toDelete.duration) : '?'}</strong>?
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>
        </div>
    );
}
