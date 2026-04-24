import Modal from '../Modal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtK = v => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k€`;
    return `${v}€`;
};

const STATUS_COLOR = { draft: '#9E9E9E', sent: '#0288D1', paid: '#4CAF50', overdue: '#F44336' };
const STATUS_LABEL = { draft: 'Borrador', sent: 'Enviada', paid: 'Pagada', overdue: 'Vencida' };

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const fmtMonth  = str => {
    if (!str) return str;
    const [, m] = str.split('-');
    return MONTHS_ES[parseInt(m, 10) - 1] || str;
};

export default function InvoiceStatsPanel({ stats, onClose }) {
    const { byMonth = [], topClients = [], taxSummary = {}, byStatus = [], avgDays } = stats;

    return (
        <Modal open size="lg" title="Estadísticas de facturación" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Resumen fiscal del año */}
                <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                        Resumen fiscal — {new Date().getFullYear()}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                        {[
                            { label: 'Base imponible',  value: fmt(taxSummary.base_imponible), color: 'var(--primary)'   },
                            { label: 'IVA repercutido', value: fmt(taxSummary.total_iva),       color: 'var(--warning)'   },
                            { label: 'Total facturado', value: fmt(taxSummary.total_con_iva),   color: 'var(--secondary)' },
                        ].map(k => (
                            <div key={k.label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 10.5, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.label}</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Métricas rápidas */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {byStatus.map(s => (
                        <div key={s.status} style={{ flex: '1 1 120px', background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', border: `1.5px solid ${STATUS_COLOR[s.status] || '#ccc'}20` }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLOR[s.status] || '#9E9E9E', textTransform: 'uppercase', marginBottom: 4 }}>
                                {STATUS_LABEL[s.status] || s.status}
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{s.count}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{fmt(s.total)}</div>
                        </div>
                    ))}
                    {avgDays != null && (
                        <div style={{ flex: '1 1 120px', background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', border: '1.5px solid var(--border)' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', marginBottom: 4 }}>Cobro medio</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{Math.round(avgDays)} días</div>
                        </div>
                    )}
                </div>

                {/* Gráfico ingresos por mes */}
                {byMonth.length > 0 && (
                    <div>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                            Ingresos últimos 12 meses
                        </h3>
                        <div style={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: 'var(--text-disabled)' }} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'var(--text-disabled)' }} axisLine={false} tickLine={false} width={48} />
                                    <Tooltip formatter={v => fmt(v)} labelFormatter={fmtMonth} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)' }} />
                                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                                        {byMonth.map((_, i) => (
                                            <Cell key={i} fill={i === byMonth.length - 1 ? 'var(--primary)' : 'var(--primary-light)'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Top clientes */}
                {topClients.length > 0 && (
                    <div>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                            Top clientes por facturación cobrada
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {topClients.map((c, i) => {
                                const maxTotal = topClients[0].total;
                                const pct      = Math.round((c.total / maxTotal) * 100);
                                return (
                                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                                <span style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                                                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--secondary)', flexShrink: 0, marginLeft: 8 }}>{fmt(c.total)}</span>
                                            </div>
                                            <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--secondary)', borderRadius: 3, transition: 'width .4s ease' }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}