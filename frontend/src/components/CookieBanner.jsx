import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [prefs, setPrefs] = useState({ necessary: true, analytics: false, marketing: false });

    useEffect(() => {
        const consent = localStorage.getItem('workly_cookie_consent');
        if (!consent) setVisible(true);
    }, []);

    const accept = (all = true) => {
        const consent = all
            ? { necessary: true, analytics: true, marketing: true }
            : prefs;
        localStorage.setItem('workly_cookie_consent', JSON.stringify({ ...consent, date: new Date().toISOString() }));
        setVisible(false);
    };

    const reject = () => {
        localStorage.setItem('workly_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false, date: new Date().toISOString() }));
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, padding: '0 16px 16px', pointerEvents: 'none' }}>
            <div style={{ maxWidth: 780, margin: '0 auto', background: '#1A1D24', border: '1px solid #2A2D35', borderRadius: 16, padding: showConfig ? '24px 28px' : '20px 24px', boxShadow: '0 -4px 40px rgba(0,0,0,0.4)', pointerEvents: 'all', animation: 'slideUp 0.3s ease' }}>

                {!showConfig ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 260 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 18 }}>🍪</span>
                                <span style={{ fontWeight: 700, fontSize: 15, color: '#F0F0F0' }}>Usamos cookies</span>
                            </div>
                            <p style={{ fontSize: 13, color: '#9BA3AF', lineHeight: 1.6, margin: 0 }}>
                                Utilizamos cookies propias y de terceros para mejorar tu experiencia y analizar el uso de la plataforma.
                                Consulta nuestra{' '}
                                <Link to="/privacidad" style={{ color: '#1976D2', textDecoration: 'none' }}>política de privacidad</Link>.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                            <button onClick={() => setShowConfig(true)}
                                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #2A2D35', background: 'transparent', color: '#9BA3AF', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', transition: 'all 0.15s' }}
                                onMouseEnter={e => e.target.style.color = '#fff'}
                                onMouseLeave={e => e.target.style.color = '#9BA3AF'}>
                                Configurar
                            </button>
                            <button onClick={reject}
                                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #2A2D35', background: 'transparent', color: '#9BA3AF', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                                Rechazar
                            </button>
                            <button onClick={() => accept(true)}
                                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#1976D2', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(25,118,210,0.4)' }}>
                                Aceptar todas
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: 20 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F0', marginBottom: 4 }}>Configuración de cookies</h3>
                            <p style={{ fontSize: 13, color: '#9BA3AF' }}>Activa o desactiva cada categoría según tus preferencias.</p>
                        </div>

                        {[
                            { key: 'necessary', label: 'Necesarias', desc: 'Imprescindibles para el funcionamiento del sitio. No se pueden desactivar.', forced: true },
                            { key: 'analytics', label: 'Analíticas', desc: 'Nos ayudan a entender cómo usas la plataforma para mejorarla (PostHog, GA4).' },
                            { key: 'marketing', label: 'Marketing', desc: 'Permiten mostrarte publicidad relevante en otras plataformas.' },
                        ].map(cat => (
                            <div key={cat.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #2A2D35' }}>
                                <div style={{ flex: 1, paddingRight: 20 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#E0E0E0', marginBottom: 3 }}>{cat.label}</div>
                                    <div style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.5 }}>{cat.desc}</div>
                                </div>
                                <div onClick={() => !cat.forced && setPrefs(p => ({ ...p, [cat.key]: !p[cat.key] }))}
                                    style={{
                                        width: 44, height: 24, borderRadius: 99, flexShrink: 0,
                                        background: prefs[cat.key] ? '#1976D2' : '#374151',
                                        position: 'relative', cursor: cat.forced ? 'not-allowed' : 'pointer',
                                        opacity: cat.forced ? 0.6 : 1, transition: 'background 0.2s',
                                    }}>
                                    <div style={{
                                        position: 'absolute', top: 3, left: prefs[cat.key] ? 23 : 3,
                                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                    }} />
                                </div>
                            </div>
                        ))}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                            <button onClick={() => setShowConfig(false)}
                                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #2A2D35', background: 'transparent', color: '#9BA3AF', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                                Cancelar
                            </button>
                            <button onClick={() => accept(false)}
                                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#1976D2', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                                Guardar preferencias
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}