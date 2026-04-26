import { useNavigate } from 'react-router-dom';
import { Crown, X, Zap } from 'lucide-react';

const LIMIT_MESSAGES = {
    clients:      { title: 'Límite de clientes alcanzado', desc: 'El plan Free incluye hasta 5 clientes. Actualiza a Pro para clientes ilimitados.' },
    projects:     { title: 'Límite de proyectos alcanzado', desc: 'El plan Free incluye hasta 3 proyectos activos. Actualiza a Pro para proyectos ilimitados.' },
    invoices:     { title: 'Límite de facturas alcanzado', desc: 'El plan Free incluye hasta 10 facturas por mes. Actualiza a Pro para facturación ilimitada.' },
    email_send:   { title: 'Función exclusiva de Pro', desc: 'El envío de facturas por email está disponible desde el plan Pro.' },
    excel_export: { title: 'Función exclusiva de Pro', desc: 'La exportación a Excel está disponible desde el plan Pro.' },
    stats:        { title: 'Función exclusiva de Pro', desc: 'Las estadísticas fiscales avanzadas están disponibles desde el plan Pro.' },
    recurring:    { title: 'Función exclusiva de Pro', desc: 'Las facturas recurrentes están disponibles desde el plan Pro.' },
    quotes:       { title: 'Función exclusiva de Pro', desc: 'Los presupuestos están disponibles desde el plan Pro.' },
    team_members: { title: 'Función exclusiva de Business', desc: 'La gestión de equipo multitenant está disponible en el plan Business.' },
};

export default function UpgradeModal({ feature, message, onClose }) {
    const navigate  = useNavigate();
    const meta      = LIMIT_MESSAGES[feature] || { title: 'Actualiza tu plan', desc: message || 'Esta función requiere un plan superior.' };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.15s ease' }}>
            <div style={{ background: 'var(--card-bg)', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', overflow: 'hidden', animation: 'slideUp 0.2s ease' }}>

                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg,#1976D2,#0288D1)', padding: '28px 28px 24px', position: 'relative' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                        <X size={14} />
                    </button>
                    <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                        <Crown size={24} color="#FFA726" />
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{meta.title}</h2>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{meta.desc}</p>
                </div>

                {/* Features del plan Pro */}
                <div style={{ padding: '20px 28px' }}>
                    <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
                        Con Pro obtienes
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                        {[
                            'Clientes, proyectos y facturas ilimitados',
                            'Envío de facturas por email con PDF adjunto',
                            'Exportación a Excel',
                            'Presupuestos y facturas recurrentes',
                            'Estadísticas fiscales avanzadas',
                        ].map(f => (
                            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text-secondary)' }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Zap size={11} color="var(--primary)" />
                                </div>
                                {f}
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
                            Ahora no
                        </button>
                        <button
                            onClick={() => { navigate('/billing'); onClose(); }}
                            style={{ flex: 2, padding: '11px 20px', background: '#1976D2', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(25,118,210,0.35)' }}>
                            <Crown size={15} /> Ver planes
                        </button>
                    </div>

                    <p style={{ fontSize: 11.5, color: 'var(--text-disabled)', textAlign: 'center', marginTop: 12 }}>
                        Desde 12.99€/mes · 7 días gratis · Cancela cuando quieras
                    </p>
                </div>
            </div>
        </div>
    );
}