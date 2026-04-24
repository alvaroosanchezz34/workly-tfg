import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
import Sidebar from '../components/Sidebar';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';
import AlertBox from '../components/AlertBox';
import QuickActions from '../components/QuickActions';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle } from 'lucide-react';

const fmt = v => new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' }).format(v ?? 0);

const STATUS_META = {
    pending:     { label:'Pendiente',   cls:'badge badge-pending' },
    in_progress: { label:'En progreso', cls:'badge badge-in_progress' },
    completed:   { label:'Completado',  cls:'badge badge-completed' },
    cancelled:   { label:'Cancelado',   cls:'badge badge-cancelled' },
};

const SkeletonRow = () => (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:16, marginBottom:24 }}>
        {[...Array(5)].map((_,i) => (
            <div key={i} className="metric-card" style={{ height:96 }}>
                <div className="skeleton" style={{ height:11, width:'45%', marginBottom:14 }} />
                <div className="skeleton" style={{ height:24, width:'60%' }} />
            </div>
        ))}
    </div>
);

const Dashboard = () => {
    const { token, user } = useContext(AuthContext);
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        setError('');
        getDashboard(token)
            .then(setData)
            .catch(() => setError('No se pudieron cargar los datos del dashboard.'))
            .finally(() => setLoading(false));
    }, [token]);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* HEADER */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">
                            Hola, {user?.name?.split(' ')[0] || 'de vuelta'} 👋
                        </h1>
                        <p className="page-subtitle">
                            {new Date().toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                        </p>
                    </div>
                </div>

                {error && (
                    <AlertBox type="danger" title="Error" description={error} />
                )}

                {loading ? <SkeletonRow /> : (
                    <>
                        {/* ALERTAS */}
                        {(data?.overdueInvoices > 0 || data?.pendingInvoices > 0) && (
                            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                                {data.overdueInvoices > 0 && (
                                    <AlertBox type="danger" title="Facturas vencidas"
                                        description={`Tienes ${data.overdueInvoices} factura(s) vencida(s) sin cobrar.`} />
                                )}
                                {data.pendingInvoices > 0 && (
                                    <AlertBox type="warning" title="Facturas pendientes"
                                        description={`${data.pendingInvoices} factura(s) pendientes de cobro.`} />
                                )}
                            </div>
                        )}

                        {/* MÉTRICAS — grid de 5 columnas para que queden iguales */}
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:16, marginBottom:24 }}>
                            <MetricCard title="Ingresos totales"  value={fmt(data?.income)}   accentColor="#4CAF50" icon={<TrendingUp size={16}/>} />
                            <MetricCard title="Gastos totales"    value={fmt(data?.expenses)}  accentColor="#F44336" icon={<TrendingDown size={16}/>} />
                            <MetricCard title="Beneficio neto"    value={fmt(data?.profit)}    accentColor={(data?.profit ?? 0) >= 0 ? '#1976D2' : '#F44336'} icon={<DollarSign size={16}/>} />
                            <MetricCard title="Fact. pendientes"  value={data?.pendingInvoices ?? 0}  accentColor="#FF9800" icon={<Clock size={16}/>} />
                            <MetricCard title="Fact. vencidas"    value={data?.overdueInvoices ?? 0}  accentColor="#F44336" icon={<AlertCircle size={16}/>} />
                        </div>

                        {/* GRÁFICA + TOP CLIENTES */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:18, marginBottom:18 }}>
                            {data?.monthlyIncome?.length > 0
                                ? <ChartCard data={data.monthlyIncome} />
                                : (
                                    <div className="card card-p" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:200 }}>
                                        <p style={{ color:'var(--text-disabled)', fontSize:13 }}>Sin datos de ingresos todavía</p>
                                    </div>
                                )
                            }

                            {data?.topClients?.length > 0 && (
                                <div className="card card-p">
                                    <h3 style={{ fontSize:13.5, fontWeight:600, marginBottom:14, color:'var(--text-primary)' }}>
                                        Top clientes
                                    </h3>
                                    {data.topClients.map((c, i) => (
                                        <div key={c.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i < data.topClients.length-1 ? '1px solid #F5F5F5' : 'none' }}>
                                            <div style={{ width:26, height:26, borderRadius:6, background:['var(--primary-light)','var(--secondary-light)','var(--warning-light)'][i], color:['var(--primary)','var(--secondary)','var(--warning)'][i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                                                {i+1}
                                            </div>
                                            <div style={{ flex:1, fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                                            <div style={{ fontSize:13, fontWeight:600, color:'var(--secondary)', flexShrink:0 }}>{fmt(c.total)}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* PROYECTOS POR ESTADO + ACCIONES RÁPIDAS */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
                            {data?.projectsByStatus?.length > 0 && (
                                <div className="card card-p">
                                    <h3 style={{ fontSize:13.5, fontWeight:600, marginBottom:14, color:'var(--text-primary)' }}>
                                        Proyectos por estado
                                    </h3>
                                    {data.projectsByStatus.map(p => {
                                        const meta = STATUS_META[p.status] || { label:p.status, cls:'badge' };
                                        return (
                                            <div key={p.status} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F9F9F9' }}>
                                                <span className={meta.cls}><span className="badge-dot"/>{meta.label}</span>
                                                <span style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)' }}>{p.total}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <QuickActions />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default Dashboard;