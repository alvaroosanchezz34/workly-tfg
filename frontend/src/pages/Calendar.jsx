// frontend/src/pages/Calendar.jsx
import { useContext, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
    ChevronLeft, ChevronRight, FileText, FolderOpen,
    CheckSquare, Calendar as CalIcon, Filter,
} from 'lucide-react';

// ── API helpers ───────────────────────────────────────────
// VITE_API_URL ya incluye el prefijo /api (p.ej. http://localhost:3000/api),
// así que path NO debe repetirlo (evita el 404 por /api/api/...)
const api = (token, path) =>
    fetch(`${import.meta.env.VITE_API_URL || ''}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
    }).then(r => {
        if (!r.ok) throw new Error(`Error ${r.status} al cargar ${path}`);
        return r.json();
    });

// ── Constantes ────────────────────────────────────────────
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const EVENT_TYPES = {
    invoice:  { label: 'Factura',     color: '#1976D2', bg: 'rgba(25,118,210,0.12)',  icon: <FileText  size={10}/> },
    quote:    { label: 'Presupuesto', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  icon: <FileText  size={10}/> },
    project:  { label: 'Proyecto',    color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: <FolderOpen size={10}/> },
    task:     { label: 'Tarea',       color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  icon: <CheckSquare size={10}/> },
};

const STATUS_COLOR = {
    draft:      '#9E9E9E',
    sent:       '#1976D2',
    paid:       '#10B981',
    overdue:    '#F44336',
    pending:    '#F59E0B',
    accepted:   '#10B981',
    rejected:   '#F44336',
    expired:    '#9E9E9E',
    active:     '#10B981',
    completed:  '#1976D2',
    paused:     '#F59E0B',
    todo:       '#6366F1',
    in_progress:'#F59E0B',
    review:     '#0EA5E9',
    done:       '#10B981',
};

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

// ── Utilidades de fecha ───────────────────────────────────
const toKey = d => {
    if (!d) return null;
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

// primer lunes del grid (puede ser del mes anterior)
const getGridStart = (year, month) => {
    const first = new Date(year, month, 1);
    const dow = (first.getDay() + 6) % 7; // 0=lun
    const start = new Date(first);
    start.setDate(start.getDate() - dow);
    return start;
};

// ── Componente principal ──────────────────────────────────
export default function CalendarPage() {
    const { token } = useContext(AuthContext);
    const navigate  = useNavigate();

    const now = new Date();
    const [year,  setYear]  = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const [filter, setFilter] = useState({ invoice: true, quote: true, project: true, task: true });
    const [selected, setSelected] = useState(null); // key 'YYYY-MM-DD'
    const [events,   setEvents]   = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState('');

    // Cargar datos
    useEffect(() => {
        if (!token) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos async, no derivable en el render
        setLoading(true);
        setError('');
        Promise.all([
            api(token, '/invoices?limit=200'),
            api(token, '/quotes?limit=200'),
            api(token, '/projects?limit=200'),
        ]).then(([inv, quo, proj]) => {
            const evs = [];

            // Facturas → fecha vencimiento
            const invoices = Array.isArray(inv) ? inv : (inv?.data || inv?.invoices || []);
            invoices.forEach(i => {
                const key = toKey(i.due_date);
                if (!key) return;
                evs.push({
                    id: `inv-${i.id}`, key, type: 'invoice',
                    label: i.invoice_number,
                    sub: fmt(i.total_amount),
                    status: i.status,
                    link: '/invoices',
                });
            });

            // Presupuestos → fecha expiración
            const quotes = Array.isArray(quo) ? quo : (quo?.data || quo?.quotes || []);
            quotes.forEach(q => {
                const key = toKey(q.expiry_date);
                if (!key) return;
                evs.push({
                    id: `quo-${q.id}`, key, type: 'quote',
                    label: q.quote_number,
                    sub: fmt(q.total_amount),
                    status: q.status,
                    link: '/invoices',
                });
            });

            // Proyectos → fecha fin (end_date o due_date)
            const projects = Array.isArray(proj) ? proj : (proj?.data || proj?.projects || []);
            projects.forEach(p => {
                const key = toKey(p.end_date || p.due_date);
                if (!key) return;
                evs.push({
                    id: `proj-${p.id}`, key, type: 'project',
                    label: p.title || p.name,
                    sub: p.status,
                    status: p.status,
                    link: `/projects/${p.id}/tasks`,
                });
            });

            setEvents(evs);
        }).catch(err => {
            console.error(err);
            setError('No se pudieron cargar los eventos del calendario.');
        }).finally(() => setLoading(false));
    }, [token]);

    // Mapa key → eventos
    const eventMap = useMemo(() => {
        const map = {};
        events.forEach(ev => {
            if (!filter[ev.type]) return;
            if (!map[ev.key]) map[ev.key] = [];
            map[ev.key].push(ev);
        });
        return map;
    }, [events, filter]);

    // Navegar mes
    const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelected(null); };
    const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0);  } else setMonth(m => m + 1); setSelected(null); };
    const goToday   = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelected(null); };

    // Grid de días (42 celdas = 6 semanas)
    const gridStart = getGridStart(year, month);
    const cells = Array.from({ length: 42 }, (_, i) => {
        const d = new Date(gridStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    const todayKey = toKey(now);

    const selectedEvents = selected ? (eventMap[selected] || []) : [];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* HEADER */}
                <div className="page-header" style={{ marginBottom: 20 }}>
                    <div>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CalIcon size={20} style={{ color: 'var(--primary)' }} />
                            Calendario
                        </h1>
                        <p className="page-subtitle">Vencimientos de facturas, presupuestos y proyectos</p>
                    </div>

                    {/* Filtros */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
                        {Object.entries(EVENT_TYPES).map(([type, meta]) => (
                            <button
                                key={type}
                                onClick={() => setFilter(f => ({ ...f, [type]: !f[type] }))}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', border: `1.5px solid ${filter[type] ? meta.color : 'var(--border)'}`,
                                    background: filter[type] ? meta.bg : 'transparent',
                                    color: filter[type] ? meta.color : 'var(--text-secondary)',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {meta.icon} {meta.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="calendar-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
                    {/* ── CALENDARIO ── */}
                    <div style={{ background: 'var(--card-bg)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>

                        {/* Controles mes */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                            <button onClick={prevMonth} style={navBtn}>
                                <ChevronLeft size={16} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {MONTHS_ES[month]} {year}
                                </span>
                                <button onClick={goToday} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}>
                                    Hoy
                                </button>
                            </div>
                            <button onClick={nextMonth} style={navBtn}>
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Cabecera días */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
                            {DAYS_ES.map(d => (
                                <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Grid días */}
                        {error ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#F44336', fontSize: 14 }}>
                                {error}
                            </div>
                        ) : loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                                Cargando eventos…
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                                {cells.map((day, i) => {
                                    const key     = toKey(day);
                                    const isToday = key === todayKey;
                                    const isCurM  = day.getMonth() === month;
                                    const isSel   = key === selected;
                                    const dayEvs  = eventMap[key] || [];
                                    const hasOverdue = dayEvs.some(e => e.status === 'overdue');

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => setSelected(isSel ? null : key)}
                                            style={{
                                                minHeight: 82,
                                                padding: '6px 8px',
                                                borderRight:  (i + 1) % 7 === 0 ? 'none' : '1px solid var(--border)',
                                                borderBottom: i < 35 ? '1px solid var(--border)' : 'none',
                                                background: isSel
                                                    ? 'rgba(25,118,210,0.06)'
                                                    : isToday
                                                        ? 'rgba(25,118,210,0.03)'
                                                        : 'transparent',
                                                cursor: dayEvs.length > 0 ? 'pointer' : 'default',
                                                transition: 'background 0.1s',
                                            }}
                                        >
                                            {/* Número de día */}
                                            <div style={{
                                                width: 26, height: 26, borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12.5, fontWeight: isToday ? 800 : 500,
                                                color: isToday ? '#fff' : isCurM ? 'var(--text-primary)' : 'var(--text-disabled)',
                                                background: isToday ? 'var(--primary)' : 'transparent',
                                                marginBottom: 4,
                                                outline: isSel && !isToday ? '2px solid var(--primary)' : 'none',
                                            }}>
                                                {day.getDate()}
                                            </div>

                                            {/* Eventos (máx 2 + badge) */}
                                            {dayEvs.slice(0, 2).map(ev => {
                                                const meta = EVENT_TYPES[ev.type];
                                                const sc   = STATUS_COLOR[ev.status] || meta.color;
                                                return (
                                                    <div key={ev.id} style={{
                                                        fontSize: 10, fontWeight: 600,
                                                        color: sc,
                                                        background: `${sc}18`,
                                                        borderRadius: 4,
                                                        padding: '1px 5px',
                                                        marginBottom: 2,
                                                        display: 'flex', alignItems: 'center', gap: 3,
                                                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                                        maxWidth: '100%',
                                                    }}>
                                                        {meta.icon}
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.label}</span>
                                                    </div>
                                                );
                                            })}
                                            {dayEvs.length > 2 && (
                                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, paddingLeft: 2 }}>
                                                    +{dayEvs.length - 2} más
                                                </div>
                                            )}
                                            {hasOverdue && (
                                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F44336', position: 'absolute', top: 6, right: 6 }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── PANEL LATERAL ── */}
                    <div>
                        {/* Leyenda */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Tipos de evento
                            </div>
                            {Object.entries(EVENT_TYPES).map(([type, meta]) => (
                                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: meta.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{meta.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Eventos del día seleccionado */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CalIcon size={14} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {selected
                                        ? new Date(selected + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
                                        : 'Selecciona un día'
                                    }
                                </span>
                            </div>

                            <div style={{ padding: 12, maxHeight: 420, overflowY: 'auto' }}>
                                {!selected ? (
                                    <p style={{ fontSize: 12.5, color: 'var(--text-disabled)', textAlign: 'center', padding: '20px 0' }}>
                                        Haz clic en cualquier día con eventos para ver el detalle.
                                    </p>
                                ) : selectedEvents.length === 0 ? (
                                    <p style={{ fontSize: 12.5, color: 'var(--text-disabled)', textAlign: 'center', padding: '20px 0' }}>
                                        Sin eventos este día
                                    </p>
                                ) : (
                                    selectedEvents.map(ev => {
                                        const meta = EVENT_TYPES[ev.type];
                                        const sc   = STATUS_COLOR[ev.status] || meta.color;
                                        return (
                                            <div
                                                key={ev.id}
                                                onClick={() => navigate(ev.link)}
                                                style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: 10,
                                                    padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                                                    border: `1px solid var(--border)`,
                                                    cursor: 'pointer', transition: 'background 0.1s',
                                                    background: 'var(--bg)',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
                                            >
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, flexShrink: 0 }}>
                                                    {meta.icon}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {ev.label}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ev.sub}</span>
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: sc, background: `${sc}18`, borderRadius: 4, padding: '1px 5px' }}>
                                                            {ev.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Próximos 7 días con eventos */}
                        <UpcomingPanel eventMap={eventMap} todayKey={todayKey} navigate={navigate} />
                    </div>
                </div>
            </main>
        </div>
    );
}

// ── Panel próximos eventos ────────────────────────────────
function UpcomingPanel({ eventMap, todayKey, navigate }) {
    const upcoming = useMemo(() => {
        const result = [];
        const base = new Date(todayKey + 'T12:00:00');
        for (let i = 0; i <= 14; i++) {
            const d = new Date(base);
            d.setDate(d.getDate() + i);
            const key = toKey(d);
            if (eventMap[key]?.length) {
                result.push({ key, date: d, events: eventMap[key] });
            }
        }
        return result.slice(0, 5);
    }, [eventMap, todayKey]);

    if (upcoming.length === 0) return null;

    return (
        <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', marginTop: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Próximos 14 días
                </span>
            </div>
            <div style={{ padding: 12 }}>
                {upcoming.map(({ key, date, events }) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                            {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        {events.map(ev => {
                            const meta = EVENT_TYPES[ev.type];
                            const sc   = STATUS_COLOR[ev.status] || meta.color;
                            return (
                                <div
                                    key={ev.id}
                                    onClick={() => navigate(ev.link)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        fontSize: 12, padding: '5px 8px', borderRadius: 7,
                                        cursor: 'pointer', color: 'var(--text-primary)',
                                        marginBottom: 3,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ color: meta.color }}>{meta.icon}</div>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.label}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: sc, background: `${sc}18`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                                        {ev.sub}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Estilos inline reutilizables ──────────────────────────
const navBtn = {
    background: 'var(--bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 8,
    padding: '5px 9px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-primary)',
};