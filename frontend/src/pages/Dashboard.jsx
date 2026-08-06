// frontend/src/pages/Dashboard.jsx
import { useContext, useEffect, useState, lazy, Suspense } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
import Sidebar from '../components/Sidebar';
import MetricCard from '../components/MetricCard';
// Diferido: arrastra chart.js/react-chartjs-2, la mayor parte del peso de esta página
const ChartCard = lazy(() => import('../components/ChartCard'));
import AlertBox from '../components/AlertBox';
import QuickActions from '../components/QuickActions';
import AISummaryWidget from '../components/ai/AISummaryWidget';
import AIChat from '../components/ai/AIChat';
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { MotionDiv, staggerContainer, staggerItem } from '../utils/motion';

const fmt = v => new Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' }).format(v ?? 0);

const STATUS_META = {
    pending:     { label:'Pendiente',   cls:'badge badge-pending' },
    in_progress: { label:'En progreso', cls:'badge badge-in_progress' },
    completed:   { label:'Completado',  cls:'badge badge-completed' },
    cancelled:   { label:'Cancelado',   cls:'badge badge-cancelled' },
};

const SkeletonRow = () => (
    <div className="metrics-grid" style={{ display:'grid', gap:16, marginBottom:24 }}>
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos async, no derivable en el render
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

                {error && <AlertBox type="danger" title="Error" description={error} />}

                {/* WIDGET IA */}
                <AISummaryWidget />

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

                        {/* MÉTRICAS — 5 col desktop, 2 col tablet, 2 col móvil */}
                        <MotionDiv
                            className="metrics-grid"
                            style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:16, marginBottom:24 }}
                            variants={staggerContainer}
                            initial="hidden"
                            animate="show"
                        >
                            <MotionDiv variants={staggerItem}><MetricCard title="Ingresos totales"  value={fmt(data?.income)}   accentColor="#4CAF50" icon={<TrendingUp size={16}/>} /></MotionDiv>
                            <MotionDiv variants={staggerItem}><MetricCard title="Gastos totales"    value={fmt(data?.expenses)}  accentColor="#F44336" icon={<TrendingDown size={16}/>} /></MotionDiv>
                            <MotionDiv variants={staggerItem}><MetricCard title="Beneficio neto"    value={fmt(data?.profit)}    accentColor={(data?.profit ?? 0) >= 0 ? '#1976D2' : '#F44336'} icon={<DollarSign size={16}/>} /></MotionDiv>
                            <MotionDiv variants={staggerItem}><MetricCard title="Fact. pendientes"  value={data?.pendingInvoices ?? 0}  accentColor="#FF9800" icon={<Clock size={16}/>} /></MotionDiv>
                            <MotionDiv variants={staggerItem}><MetricCard title="Fact. vencidas"    value={data?.overdueInvoices ?? 0}  accentColor="#F44336" icon={<AlertCircle size={16}/>} /></MotionDiv>
                        </MotionDiv>

                        {/* GRÁFICA + TOP CLIENTES — lado a lado desktop, apilado móvil */}
                        <div
                            className="dashboard-main-grid"
                            style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:18, marginBottom:18 }}
                        >
                            {data?.monthlyIncome?.length > 0
                                ? (
                                    <Suspense fallback={<div className="card card-p" style={{ minHeight: 200 }}><div className="skeleton" style={{ height: 160 }} /></div>}>
                                        <ChartCard data={data.monthlyIncome} />
                                    </Suspense>
                                )
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
                                        <div key={c.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom: i < data.topClients.length-1 ? '1px solid var(--border)' : 'none' }}>
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

                        {/* PROYECTOS + ACCIONES RÁPIDAS — mitad/mitad desktop, apilado móvil */}
                        <div
                            className="dashboard-half-grid"
                            style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}
                        >
                            {data?.projectsByStatus?.length > 0 && (
                                <div className="card card-p">
                                    <h3 style={{ fontSize:13.5, fontWeight:600, marginBottom:14, color:'var(--text-primary)' }}>
                                        Proyectos por estado
                                    </h3>
                                    {data.projectsByStatus.map(p => {
                                        const meta = STATUS_META[p.status] || { label:p.status, cls:'badge' };
                                        return (
                                            <div key={p.status} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
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

            {/* ASISTENTE IA FLOTANTE */}
            <AIChat />
        </div>
    );
};

export default Dashboard;