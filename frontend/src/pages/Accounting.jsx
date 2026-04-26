import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { fetchWithAuth } from '../context/fetchWithAuth';
import { BookOpen, TrendingUp, TrendingDown, Calculator, FileText, Download } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const QUARTERS = ['1', '2', '3', '4'];
const Q_LABELS = { '1': 'T1 (Ene–Mar)', '2': 'T2 (Abr–Jun)', '3': 'T3 (Jul–Sep)', '4': 'T4 (Oct–Dic)' };
const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const TAB_OPTS = [
    { id: 'resumen',   label: 'Resumen',    icon: <TrendingUp size={14}/> },
    { id: 'libro',     label: 'Libro',      icon: <BookOpen size={14}/> },
    { id: 'm130',      label: 'Modelo 130', icon: <Calculator size={14}/> },
    { id: 'm303',      label: 'Modelo 303', icon: <FileText size={14}/> },
];

const MetricCard = ({ label, value, color = 'var(--primary)', sub }) => (
    <div className="metric-card">
        <div style={{ fontSize: 12, color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4 }}>{sub}</div>}
    </div>
);

const CasillasTable = ({ casillas, title }) => (
    <div className="table-wrap" style={{ marginTop: 20 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>{title}</div>
        <table className="data-table">
            <thead><tr><th>Casilla</th><th style={{ textAlign: 'right' }}>Importe</th></tr></thead>
            <tbody>
                {Object.entries(casillas).map(([key, val]) => (
                    <tr key={key}>
                        <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{key.replace(/_/g, ' ')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {typeof val === 'number' ? (
                                <span style={{ color: val < 0 ? 'var(--secondary)' : val > 0 ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
                                    {fmt(val)}
                                </span>
                            ) : val}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default function Accounting() {
    const { token } = useContext(AuthContext);
    const [tab,     setTab]     = useState('resumen');
    const [year,    setYear]    = useState(String(new Date().getFullYear()));
    const [quarter, setQuarter] = useState(String(Math.ceil((new Date().getMonth() + 1) / 3)));
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

    const endpoints = {
        resumen: `/accounting/summary?year=${year}&quarter=${quarter}`,
        libro:   `/accounting/libro?year=${year}`,
        m130:    `/accounting/modelo130?year=${year}&quarter=${quarter}`,
        m303:    `/accounting/modelo303?year=${year}&quarter=${quarter}`,
    };

    const load = async () => {
        setLoading(true); setError(''); setData(null);
        try {
            const res = await fetchWithAuth(`${API}${endpoints[tab]}`, token);
            if (res.status === 403) {
                const d = await res.json();
                setError(d.message || 'Esta función requiere el plan Pro.');
                return;
            }
            if (!res.ok) throw new Error('Error al cargar datos');
            setData(await res.json());
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [tab, year, quarter, token]);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Contabilidad</h1>
                        <p className="page-subtitle">Libro de ingresos y gastos · Modelos fiscales</p>
                    </div>
                    {/* Selectores de período */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select className="form-select" style={{ width: 100 }} value={year} onChange={e => setYear(e.target.value)}>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        {tab !== 'libro' && (
                            <select className="form-select" style={{ width: 160 }} value={quarter} onChange={e => setQuarter(e.target.value)}>
                                {QUARTERS.map(q => <option key={q} value={q}>{Q_LABELS[q]}</option>)}
                            </select>
                        )}
                    </div>
                </div>

                {/* TABS */}
                <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: 24 }}>
                    {TAB_OPTS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: '9px 18px', background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                            color: tab === t.id ? 'var(--primary)' : 'var(--text-secondary)',
                            borderBottom: `2px solid ${tab === t.id ? 'var(--primary)' : 'transparent'}`,
                            marginBottom: -2, fontFamily: 'Inter, sans-serif',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            {t.icon}{t.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                        {error.includes('Pro') ? (
                            <span>⚠️ {error} — <a href="/billing" style={{ color: 'var(--primary)', fontWeight: 600 }}>Actualizar plan</a></span>
                        ) : error}
                    </div>
                )}

                {loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10 }}/>)}
                    </div>
                )}

                {/* ── RESUMEN ── */}
                {!loading && !error && tab === 'resumen' && data && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                            <MetricCard label="Base imponible"   value={fmt(data.totals.base_imponible)}  color="var(--primary)" />
                            <MetricCard label="IVA repercutido"  value={fmt(data.totals.iva_repercutido)} color="var(--warning)" />
                            <MetricCard label="Total facturado"  value={fmt(data.totals.total_facturado)} color="var(--text-primary)" />
                            <MetricCard label="Total gastos"     value={fmt(data.totals.total_gastos)}    color="var(--error)" />
                            <MetricCard label="Beneficio bruto"  value={fmt(data.totals.beneficio_bruto)} color={data.totals.beneficio_bruto >= 0 ? 'var(--secondary)' : 'var(--error)'}
                                sub="Ingresos − Gastos (sin IVA)" />
                        </div>

                        {data.income.length > 0 && (
                            <div className="table-wrap" style={{ marginBottom: 20 }}>
                                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <TrendingUp size={15} color="var(--secondary)" /> Ingresos por mes
                                </div>
                                <table className="data-table">
                                    <thead><tr><th>Mes</th><th style={{ textAlign: 'right' }}>Base</th><th style={{ textAlign: 'right' }}>IVA</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Facturas</th></tr></thead>
                                    <tbody>
                                        {data.income.map(r => (
                                            <tr key={r.month}>
                                                <td style={{ fontWeight: 500 }}>{r.month}</td>
                                                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.base_imponible)}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.iva_repercutido)}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total_facturado)}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{r.num_facturas}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* ── LIBRO ── */}
                {!loading && !error && tab === 'libro' && data && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                            <MetricCard label="Total ingresos"  value={fmt(data.resumen.total_ingresos)} color="var(--secondary)" />
                            <MetricCard label="Total gastos"    value={fmt(data.resumen.total_gastos)}   color="var(--error)" />
                            <MetricCard label="Beneficio neto"  value={fmt(data.resumen.beneficio_neto)} color={data.resumen.beneficio_neto >= 0 ? 'var(--primary)' : 'var(--error)'} />
                            <MetricCard label="Nº facturas"     value={data.resumen.num_facturas}        color="var(--text-primary)" />
                        </div>

                        <div className="table-wrap" style={{ marginBottom: 20 }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={15} color="var(--secondary)" /> Libro de ingresos {year}
                            </div>
                            <table className="data-table">
                                <thead><tr><th>Nº Factura</th><th>Fecha</th><th>Cliente</th><th style={{ textAlign: 'right' }}>Base</th><th style={{ textAlign: 'right' }}>IVA</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                                <tbody>
                                    {data.ingresos.length === 0 ? (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-disabled)', padding: 24 }}>Sin ingresos en {year}</td></tr>
                                    ) : data.ingresos.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12.5 }}>{r.numero}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{new Date(r.fecha).toLocaleDateString('es-ES')}</td>
                                            <td>{r.cliente}</td>
                                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.base_imponible)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.iva)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="table-wrap">
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrendingDown size={15} color="var(--error)" /> Libro de gastos {year}
                            </div>
                            <table className="data-table">
                                <thead><tr><th>Fecha</th><th>Categoría</th><th>Concepto</th><th style={{ textAlign: 'right' }}>Importe</th></tr></thead>
                                <tbody>
                                    {data.gastos.length === 0 ? (
                                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-disabled)', padding: 24 }}>Sin gastos en {year}</td></tr>
                                    ) : data.gastos.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ color: 'var(--text-secondary)' }}>{new Date(r.fecha).toLocaleDateString('es-ES')}</td>
                                            <td><span className="badge badge-draft">{r.categoria || 'Otros'}</span></td>
                                            <td>{r.concepto}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--error)', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.importe)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* ── MODELO 130 ── */}
                {!loading && !error && tab === 'm130' && data && (
                    <div style={{ maxWidth: 680 }}>
                        <div className="alert alert-info" style={{ marginBottom: 20 }}>
                            <strong>Modelo 130</strong> — Pago fraccionado IRPF · {data.trimestre} {data.year}
                            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                                Estos datos son orientativos. Consulta con un gestor antes de presentar el modelo.
                            </div>
                        </div>
                        {data.aviso && <div className="alert alert-success" style={{ marginBottom: 16 }}>{data.aviso}</div>}
                        <CasillasTable casillas={data.casillas} title="Casillas del Modelo 130" />
                    </div>
                )}

                {/* ── MODELO 303 ── */}
                {!loading && !error && tab === 'm303' && data && (
                    <div style={{ maxWidth: 680 }}>
                        <div className="alert alert-info" style={{ marginBottom: 20 }}>
                            <strong>Modelo 303</strong> — IVA trimestral · {data.trimestre} {data.year}
                            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                                Los gastos se estiman al 21% de IVA. Ajusta según tus facturas de proveedor reales. Consulta con un gestor.
                            </div>
                        </div>
                        {data.aviso && <div className="alert alert-success" style={{ marginBottom: 16 }}>{data.aviso}</div>}

                        <div className="table-wrap" style={{ marginBottom: 20 }}>
                            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>IVA repercutido (cobrado a clientes)</div>
                            <table className="data-table">
                                <thead><tr><th>Tipo IVA</th><th style={{ textAlign: 'right' }}>Base imponible</th><th style={{ textAlign: 'right' }}>Cuota</th></tr></thead>
                                <tbody>
                                    {data.iva_repercutido.map((r, i) => (
                                        <tr key={i}>
                                            <td><span className="badge badge-sent">{r.tipo}</span></td>
                                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.base_imponible)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.cuota)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <CasillasTable casillas={data.casillas} title="Resultado Modelo 303" />
                    </div>
                )}
            </main>
        </div>
    );
}