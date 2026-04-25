import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { fetchWithAuth } from '../context/fetchWithAuth';
import { Crown, Zap, Building2, Check, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const PLAN_ICONS = { free: <Zap size={20}/>, pro: <Crown size={20}/>, business: <Building2 size={20}/> };
const PLAN_COLORS = { free: '#9E9E9E', pro: '#1976D2', business: '#4CAF50' };

const fmt = p => p === 0 ? 'Gratis' : `${p.toFixed(2)}€/mes`;

export default function Billing() {
    const { token, user } = useContext(AuthContext);
    const [billing,   setBilling]   = useState('monthly');
    const [status,    setStatus]    = useState(null);
    const [plans,     setPlans]     = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [checkingOut, setCheckingOut] = useState(null);
    const [openPortal,  setOpenPortal]  = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [plansRes, statusRes] = await Promise.all([
                    fetch(`${API}/billing/plans`).then(r => r.json()),
                    fetchWithAuth(`${API}/billing/status`, token).then(r => r.json()),
                ]);
                setPlans(plansRes);
                setStatus(statusRes);
            } catch { /* silencioso */ }
            finally { setLoading(false); }
        };
        if (token) load();
    }, [token]);

    const handleCheckout = async (planId) => {
        setCheckingOut(planId);
        try {
            const res  = await fetchWithAuth(`${API}/billing/checkout`, token, {
                method: 'POST',
                body:   JSON.stringify({ plan: planId, billing }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            window.location.href = data.url;
        } catch (err) {
            alert(err.message);
            setCheckingOut(null);
        }
    };

    const handlePortal = async () => {
        setOpenPortal(true);
        try {
            const res  = await fetchWithAuth(`${API}/billing/portal`, token, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            window.location.href = data.url;
        } catch (err) {
            alert(err.message);
            setOpenPortal(false);
        }
    };

    const currentPlan = status?.plan || 'free';

    const FEATURES = {
        free:     ['5 clientes', '3 proyectos', '10 facturas/mes', 'PDF descargable', 'Soporte estándar'],
        pro:      ['Clientes ilimitados', 'Proyectos ilimitados', 'Facturas ilimitadas', 'Envío por email', 'Exportación Excel', 'Presupuestos', 'Facturas recurrentes', 'Estadísticas fiscales', 'Soporte prioritario'],
        business: ['Todo lo del Pro', 'Equipo ilimitado', 'Roles y permisos', 'Dashboard consolidado', 'Soporte dedicado'],
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content" style={{ maxWidth: 1000 }}>

                <div className="page-header">
                    <div>
                        <h1 className="page-title">Plan y facturación</h1>
                        <p className="page-subtitle">
                            Plan actual:{' '}
                            <span style={{ fontWeight: 700, color: PLAN_COLORS[currentPlan], textTransform: 'capitalize' }}>
                                {currentPlan}
                            </span>
                            {status?.plan_status === 'trialing' && (
                                <span style={{ marginLeft: 8, fontSize: 12, background: 'var(--warning-light)', color: 'var(--warning-dark)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                                    Trial activo
                                </span>
                            )}
                            {status?.plan_status === 'past_due' && (
                                <span style={{ marginLeft: 8, fontSize: 12, background: 'var(--error-light)', color: 'var(--error)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
                                    Pago pendiente
                                </span>
                            )}
                        </p>
                    </div>
                    {status?.has_subscription && (
                        <button className="btn btn-ghost" onClick={handlePortal} disabled={openPortal}>
                            {openPortal ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }}/> : <ExternalLink size={14}/>}
                            Gestionar suscripción
                        </button>
                    )}
                </div>

                {/* Alerta pago fallido */}
                {status?.plan_status === 'past_due' && (
                    <div className="alert alert-danger" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AlertCircle size={16}/>
                        <span>Tu último pago falló. <button onClick={handlePortal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontWeight: 700, fontFamily: 'inherit', textDecoration: 'underline' }}>Actualiza tu método de pago</button> para no perder el acceso.</span>
                    </div>
                )}

                {/* Toggle mensual/anual */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 99, padding: 3, gap: 2 }}>
                        {['monthly', 'yearly'].map(b => (
                            <button key={b} onClick={() => setBilling(b)} style={{
                                padding: '7px 20px', borderRadius: 99, border: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
                                background: billing === b ? 'var(--primary)' : 'transparent',
                                color: billing === b ? '#fff' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                            }}>
                                {b === 'monthly' ? 'Mensual' : 'Anual'}
                            </button>
                        ))}
                    </div>
                    {billing === 'yearly' && (
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--secondary)', background: 'var(--secondary-light)', padding: '4px 12px', borderRadius: 99 }}>
                            ¡Ahorra un 20%!
                        </span>
                    )}
                </div>

                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 420, borderRadius: 16 }}/>)}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                        {['free', 'pro', 'business'].map(planId => {
                            const plan      = plans.find(p => p.id === planId) || { id: planId, name: planId, price_monthly: 0, price_yearly: 0 };
                            const isCurrent = currentPlan === planId;
                            const isPopular = planId === 'pro';
                            const price     = billing === 'yearly' ? plan.price_yearly : plan.price_monthly;
                            const color     = PLAN_COLORS[planId];
                            const features  = FEATURES[planId] || [];

                            return (
                                <div key={planId} style={{
                                    background: isPopular ? '#0F1117' : 'var(--card-bg)',
                                    border: isCurrent ? `2px solid ${color}` : isPopular ? 'none' : '1.5px solid var(--border)',
                                    borderRadius: 16, padding: '28px 24px',
                                    position: 'relative',
                                    boxShadow: isPopular ? '0 20px 60px rgba(0,0,0,0.2)' : 'var(--shadow-sm)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isPopular ? '0 20px 60px rgba(0,0,0,0.2)' : 'var(--shadow-sm)'; }}
                                >
                                    {isPopular && (
                                        <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#FF9800', color: '#fff', fontSize: 11, fontWeight: 800, padding: '5px 18px', borderRadius: 99, whiteSpace: 'nowrap' }}>
                                            ★ MÁS POPULAR
                                        </div>
                                    )}
                                    {isCurrent && (
                                        <div style={{ position: 'absolute', top: 12, right: 12, background: color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                                            ACTUAL
                                        </div>
                                    )}

                                    {/* Icon + nombre */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                                            {PLAN_ICONS[planId]}
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: isPopular ? '#fff' : 'var(--text-primary)', textTransform: 'capitalize' }}>{plan.name || planId}</span>
                                    </div>

                                    {/* Precio */}
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                            <span style={{ fontSize: 38, fontWeight: 900, color: isPopular ? '#fff' : 'var(--text-primary)', lineHeight: 1 }}>
                                                {price === 0 ? '0€' : `${price.toFixed(2)}€`}
                                            </span>
                                            {price > 0 && <span style={{ fontSize: 13, color: isPopular ? 'rgba(255,255,255,0.5)' : 'var(--text-disabled)' }}>/mes</span>}
                                        </div>
                                        {billing === 'yearly' && price > 0 && (
                                            <div style={{ fontSize: 12, color: isPopular ? 'rgba(255,255,255,0.45)' : 'var(--text-disabled)', marginTop: 4 }}>
                                                Facturado anualmente · {(price * 12).toFixed(2)}€/año
                                            </div>
                                        )}
                                        {planId === 'free' && (
                                            <div style={{ fontSize: 12, color: isPopular ? 'rgba(255,255,255,0.45)' : 'var(--text-disabled)', marginTop: 4 }}>Para siempre</div>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                                        {features.map(f => (
                                            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13.5, color: isPopular ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>
                                                <Check size={14} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA */}
                                    {isCurrent ? (
                                        <div style={{ width: '100%', padding: '12px', textAlign: 'center', borderRadius: 10, background: `${color}15`, color, fontSize: 14, fontWeight: 700, border: `1.5px solid ${color}` }}>
                                            Plan actual ✓
                                        </div>
                                    ) : planId === 'free' ? (
                                        <div style={{ width: '100%', padding: '12px', textAlign: 'center', borderRadius: 10, background: 'var(--bg)', color: 'var(--text-disabled)', fontSize: 14, fontWeight: 600, border: '1.5px solid var(--border)' }}>
                                            {currentPlan !== 'free' ? 'Cancelar suscripción' : 'Plan gratuito'}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleCheckout(planId)}
                                            disabled={!!checkingOut}
                                            style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', cursor: checkingOut ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s', background: isPopular ? '#fff' : color, color: isPopular ? '#0F1117' : '#fff', opacity: checkingOut && checkingOut !== planId ? 0.5 : 1 }}>
                                            {checkingOut === planId
                                                ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }}/>Redirigiendo…</>
                                                : planId === 'pro' ? '🚀 Empezar 7 días gratis' : 'Actualizar a Business'
                                            }
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Info adicional */}
                <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    {[
                        { icon: '🔒', title: 'Pago seguro', desc: 'Procesado por Stripe con cifrado TLS.' },
                        { icon: '↩️', title: 'Cancela cuando quieras', desc: 'Sin permanencia. Sin penalizaciones.' },
                        { icon: '🧾', title: 'Factura mensual', desc: 'Recibes factura automática cada mes.' },
                        { icon: '💬', title: 'Soporte incluido', desc: 'Escríbenos a soporte@workly.space.' },
                    ].map(item => (
                        <div key={item.title} className="card card-p" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <span style={{ fontSize: 22 }}>{item.icon}</span>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}