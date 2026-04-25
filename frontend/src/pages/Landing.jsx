import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const NAV_LINKS = ['Inicio', 'Características', 'Precios', 'Contacto'];

const FEATURES = [
    { icon: '👥', title: 'Gestión de clientes', desc: 'Centraliza toda la información de tus clientes, historial de proyectos y facturas en un solo lugar.' },
    { icon: '📁', title: 'Proyectos y Kanban', desc: 'Organiza tus proyectos con tablero Kanban. Arrastra y suelta para actualizar el estado al instante.' },
    { icon: '🧾', title: 'Facturación ERP', desc: 'Genera facturas profesionales en PDF con IVA, presupuestos, notas de crédito y control de pagos.' },
    { icon: '💸', title: 'Control de gastos', desc: 'Registra y categoriza tus gastos. Exporta todo a Excel para tu contabilidad.' },
    { icon: '📊', title: 'Dashboard financiero', desc: 'Visualiza tus ingresos, gastos pendientes y evolución mensual con gráficas en tiempo real.' },
    { icon: '✉️', title: 'Envío de facturas', desc: 'Envía facturas por email directamente con el PDF adjunto. El cliente recibe un email profesional.' },
];

const PLANS = [
    {
        name: 'Starter',
        price: '12.99',
        color: '#1976D2',
        popular: false,
        features: [
            'Clientes ilimitados',
            'Proyectos activos ilimitados',
            'Creación de facturas',
            'Facturas en PDF profesionales',
            'Registro básico de gastos',
            'Soporte estándar',
        ],
    },
    {
        name: 'Pro',
        price: '24.99',
        color: '#121212',
        popular: true,
        features: [
            'Todo lo del Starter',
            'Presupuestos y notas de crédito',
            'Facturación recurrente',
            'Dashboard financiero avanzado',
            'Exportación a Excel',
            'Envío de facturas por email',
            'Soporte prioritario',
        ],
    },
    {
        name: 'Business',
        price: null,
        color: '#4CAF50',
        popular: false,
        features: [
            'Todo lo del Pro',
            'Gestión multitenant',
            'Roles y permisos de equipo',
            'Integraciones avanzadas',
            'Soporte dedicado',
            'Funcionalidades a medida',
        ],
    },
];

const useInView = (threshold = 0.15) => {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, inView];
};

export default function Landing() {
    const [billing, setBilling]     = useState('monthly');
    const [menuOpen, setMenuOpen]   = useState(false);
    const [scrolled, setScrolled]   = useState(false);
    const [form, setForm]           = useState({ name: '', email: '', message: '' });
    const [sent, setSent]           = useState(false);

    const [featRef, featInView]     = useInView();
    const [pricRef, pricInView]     = useInView();
    const [ctaRef,  ctaInView]      = useInView();

    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', h);
        return () => window.removeEventListener('scroll', h);
    }, []);

    const scrollTo = id => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMenuOpen(false);
    };

    const handleContact = e => {
        e.preventDefault();
        setSent(true);
        setForm({ name: '', email: '', message: '' });
    };

    const annualDiscount = p => (Number(p) * 0.8).toFixed(2);

    return (
        <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", background: '#FAFAFA', color: '#0F1117', overflowX: 'hidden' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html { scroll-behavior: smooth; }
                .fade-up { opacity: 0; transform: translateY(32px); transition: opacity 0.65s ease, transform 0.65s ease; }
                .fade-up.visible { opacity: 1; transform: translateY(0); }
                .fade-up.d1 { transition-delay: 0.1s; }
                .fade-up.d2 { transition-delay: 0.2s; }
                .fade-up.d3 { transition-delay: 0.3s; }
                .fade-up.d4 { transition-delay: 0.4s; }
                .fade-up.d5 { transition-delay: 0.5s; }
                .fade-up.d6 { transition-delay: 0.6s; }
                @keyframes heroFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
                @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
                @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.97)} }
                .hero-badge { animation: pulse 3s ease infinite; }
                .plan-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
                .plan-card:hover { transform: translateY(-6px); box-shadow: 0 24px 60px rgba(0,0,0,0.12); }
                .feat-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
                .feat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.09); }
                .nav-link { cursor: pointer; font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.75); transition: color 0.15s; text-decoration: none; }
                .nav-link:hover { color: #fff; }
                .nav-link-dark { color: #374151; }
                .nav-link-dark:hover { color: #1976D2; }
                .btn-primary-lg { background: #1976D2; color: #fff; border: none; padding: 14px 32px; border-radius: 10px; font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 20px rgba(25,118,210,0.35); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
                .btn-primary-lg:hover { background: #1565C0; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(25,118,210,0.45); }
                .btn-ghost-lg { background: transparent; color: #1976D2; border: 2px solid #1976D2; padding: 12px 28px; border-radius: 10px; font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
                .btn-ghost-lg:hover { background: #1976D2; color: #fff; }
                input, textarea { outline: none; font-family: inherit; }
                ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }
            `}</style>

            {/* ── NAV ─────────────────────────────────────────── */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                padding: '0 5%',
                background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
                backdropFilter: scrolled ? 'blur(12px)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.3s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                height: 64,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#1976D2,#FF9800)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: '#fff' }}>W</div>
                    <span style={{ fontWeight: 800, fontSize: 17, color: scrolled ? '#0F1117' : '#fff', letterSpacing: '0.02em' }}>Workly</span>
                </div>

                <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                    {NAV_LINKS.map(l => (
                        <span key={l}
                            className={`nav-link${scrolled ? ' nav-link-dark' : ''}`}
                            onClick={() => scrollTo(l.toLowerCase().replace('í','i').replace('á','a').replace('é','e'))}>
                            {l}
                        </span>
                    ))}
                    <Link to="/login" className="btn-primary-lg" style={{ padding: '9px 22px', fontSize: 14 }}>
                        Empieza gratis
                    </Link>
                </div>
            </nav>

            {/* ── HERO ────────────────────────────────────────── */}
            <section id="inicio" style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0D47A1 0%, #1976D2 40%, #0288D1 70%, #01579B 100%)',
                backgroundSize: '300% 300%',
                animation: 'gradShift 8s ease infinite',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '100px 5% 80px',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -80, left: -80, width: 380, height: 380, borderRadius: '50%', background: 'rgba(255,152,0,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: '30%', left: '8%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

                <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 99, padding: '7px 18px', fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500, marginBottom: 28, backdropFilter: 'blur(8px)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4CAF50' }} />
                    Plataforma de gestión para freelancers
                </div>

                <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(42px, 6vw, 76px)', fontWeight: 400, color: '#fff', lineHeight: 1.1, marginBottom: 24, maxWidth: 820, letterSpacing: '-0.01em' }}>
                    Menos gestión.<br />
                    <em>Más tiempo para lo que importa.</em>
                </h1>

                <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.72)', maxWidth: 560, lineHeight: 1.65, marginBottom: 44 }}>
                    Gestiona clientes, proyectos, facturación y gastos desde una única plataforma diseñada para freelancers y pequeñas empresas.
                </p>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link to="/register" className="btn-primary-lg" style={{ background: '#fff', color: '#1976D2', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                        Empieza en segundos →
                    </Link>
                    <button className="btn-ghost-lg" style={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}
                        onClick={() => scrollTo('caracteristicas')}>
                        Ver características
                    </button>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 48, marginTop: 72, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[['100%', 'Código abierto'], ['PDF', 'Facturas profesionales'], ['0€', 'Para empezar']].map(([n, l]) => (
                        <div key={l} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{n}</div>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{l}</div>
                        </div>
                    ))}
                </div>

                {/* Scroll indicator */}
                <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => scrollTo('caracteristicas')}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Scroll</span>
                    <div style={{ width: 1, height: 32, background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)' }} />
                </div>
            </section>

            {/* ── CARACTERÍSTICAS ──────────────────────────────── */}
            <section id="caracteristicas" style={{ padding: '100px 5%', background: '#fff' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div ref={featRef} style={{ textAlign: 'center', marginBottom: 64 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1976D2' }}>Características</span>
                        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(32px, 4vw, 52px)', marginTop: 12, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                            Todo lo que necesitas,<br /><em style={{ color: '#1976D2' }}>nada más.</em>
                        </h2>
                        <p style={{ fontSize: 17, color: '#6B7280', marginTop: 16, maxWidth: 520, margin: '16px auto 0' }}>
                            Una plataforma completa sin la complejidad de las herramientas enterprise.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                        {FEATURES.map((f, i) => (
                            <div key={f.title}
                                className={`feat-card fade-up d${i + 1}${featInView ? ' visible' : ''}`}
                                style={{ background: '#FAFAFA', border: '1.5px solid #F0F0F0', borderRadius: 16, padding: '28px 28px 24px' }}>
                                <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
                                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                                <p style={{ fontSize: 14.5, color: '#6B7280', lineHeight: 1.65 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRECIOS ──────────────────────────────────────── */}
            <section id="precios" style={{ padding: '100px 5%', background: 'linear-gradient(180deg, #F8FAFF 0%, #fff 100%)' }}>
                <div style={{ maxWidth: 1050, margin: '0 auto' }}>
                    <div ref={pricRef} style={{ textAlign: 'center', marginBottom: 48 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1976D2' }}>Pricing</span>
                        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(32px, 4vw, 52px)', marginTop: 12, letterSpacing: '-0.01em' }}>
                            Planes y precios
                        </h2>
                        <p style={{ fontSize: 16, color: '#6B7280', marginTop: 12 }}>
                            Sin permanencia. Cancela cuando quieras.
                        </p>

                        {/* Toggle mensual/anual */}
                        <div style={{ display: 'inline-flex', background: '#F3F4F6', borderRadius: 99, padding: 4, marginTop: 24, gap: 2 }}>
                            {['monthly', 'yearly'].map(b => (
                                <button key={b} onClick={() => setBilling(b)} style={{
                                    padding: '8px 22px', borderRadius: 99, border: 'none', cursor: 'pointer',
                                    fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                                    background: billing === b ? '#fff' : 'transparent',
                                    color: billing === b ? '#0F1117' : '#9CA3AF',
                                    boxShadow: billing === b ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s',
                                }}>
                                    {b === 'monthly' ? 'Mensual' : 'Anual'}{b === 'yearly' && <span style={{ marginLeft: 6, fontSize: 11, background: '#E8F5E9', color: '#2E7D32', padding: '2px 7px', borderRadius: 99 }}>-20%</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' }}>
                        {PLANS.map((plan, i) => (
                            <div key={plan.name}
                                className={`plan-card fade-up d${i + 1}${pricInView ? ' visible' : ''}`}
                                style={{
                                    background: plan.popular ? plan.color : '#fff',
                                    border: plan.popular ? 'none' : '1.5px solid #E5E7EB',
                                    borderRadius: 20,
                                    padding: '36px 32px',
                                    position: 'relative',
                                    boxShadow: plan.popular ? '0 20px 60px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
                                }}>
                                {plan.popular && (
                                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#FF9800', color: '#fff', fontSize: 11, fontWeight: 800, padding: '5px 18px', borderRadius: 99, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                        ★ Popular
                                    </div>
                                )}
                                <div style={{ fontSize: 13, fontWeight: 700, color: plan.popular ? 'rgba(255,255,255,0.6)' : '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    {plan.name} Plan
                                </div>

                                {plan.price ? (
                                    <div style={{ marginBottom: 28 }}>
                                        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 52, color: plan.popular ? '#fff' : '#0F1117', lineHeight: 1 }}>
                                            {billing === 'yearly' ? annualDiscount(plan.price) : plan.price}€
                                        </span>
                                        <span style={{ fontSize: 14, color: plan.popular ? 'rgba(255,255,255,0.5)' : '#9CA3AF', marginLeft: 6 }}>/mes</span>
                                    </div>
                                ) : (
                                    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, color: plan.popular ? '#fff' : '#0F1117', marginBottom: 28, lineHeight: 1 }}>
                                        A medida
                                    </div>
                                )}

                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
                                    {plan.features.map(f => (
                                        <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: plan.popular ? 'rgba(255,255,255,0.85)' : '#374151' }}>
                                            <span style={{ color: plan.popular ? '#4CAF50' : plan.color, flexShrink: 0, marginTop: 1, fontWeight: 700 }}>✓</span>
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <Link to={plan.price ? '/register' : '#contacto'}
                                    onClick={!plan.price ? () => scrollTo('contacto') : undefined}
                                    style={{
                                        display: 'block', textAlign: 'center', textDecoration: 'none',
                                        padding: '13px 24px', borderRadius: 12,
                                        fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
                                        background: plan.popular ? '#fff' : plan.price ? plan.color : '#4CAF50',
                                        color: plan.popular ? plan.color : '#fff',
                                        transition: 'all 0.2s',
                                        boxShadow: plan.popular ? '0 4px 16px rgba(0,0,0,0.15)' : 'none',
                                    }}>
                                    {plan.price ? (plan.popular ? 'Prueba gratis 7 días' : 'Empezar ahora') : 'Contáctanos'}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA CENTRAL ──────────────────────────────────── */}
            <section ref={ctaRef} style={{ padding: '80px 5%', background: '#fff' }}>
                <div className={`fade-up${ctaInView ? ' visible' : ''}`} style={{
                    maxWidth: 780, margin: '0 auto', textAlign: 'center',
                    background: 'linear-gradient(135deg, #1976D2, #0288D1)',
                    borderRadius: 24, padding: '64px 48px',
                    boxShadow: '0 20px 60px rgba(25,118,210,0.3)',
                }}>
                    <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(28px, 3.5vw, 44px)', color: '#fff', marginBottom: 16, letterSpacing: '-0.01em' }}>
                        ¿Listo para simplificar tu negocio?
                    </h2>
                    <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', marginBottom: 36, lineHeight: 1.6 }}>
                        Únete a los freelancers que ya gestionan su negocio con Workly. Empieza gratis hoy.
                    </p>
                    <Link to="/register" className="btn-primary-lg" style={{ background: '#fff', color: '#1976D2', fontSize: 16, padding: '15px 36px' }}>
                        Crear cuenta gratis →
                    </Link>
                </div>
            </section>

            {/* ── CONTACTO ─────────────────────────────────────── */}
            <section id="contacto" style={{ padding: '100px 5%', background: '#F8FAFF' }}>
                <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1976D2' }}>Contacto</span>
                    <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(28px, 3.5vw, 48px)', marginTop: 12, marginBottom: 12, letterSpacing: '-0.01em' }}>
                        Contáctanos
                    </h2>
                    <p style={{ fontSize: 16, color: '#6B7280', marginBottom: 40 }}>
                        ¿Tienes alguna pregunta? Responderemos en las próximas 24 horas.
                    </p>

                    {sent ? (
                        <div style={{ background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 16, padding: '40px 32px' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2E7D32', marginBottom: 8 }}>Mensaje enviado</h3>
                            <p style={{ color: '#388E3C', fontSize: 15 }}>Gracias por contactarnos. Te responderemos pronto.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleContact} style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
                            {[
                                { label: '👤 Nombre', key: 'name', type: 'text', placeholder: 'Nombre y apellidos' },
                                { label: '✉️ Email', key: 'email', type: 'email', placeholder: 'ejemplo@ejemplo.com' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{f.label}</label>
                                    <input type={f.type} required placeholder={f.placeholder} value={form[f.key]}
                                        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                        style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#0F1117', transition: 'border-color 0.15s', background: '#FAFAFA' }}
                                        onFocus={e => e.target.style.borderColor = '#1976D2'}
                                        onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>💬 Mensaje</label>
                                <textarea required placeholder="Escribe tu mensaje..." rows={4} value={form.message}
                                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#0F1117', resize: 'vertical', transition: 'border-color 0.15s', background: '#FAFAFA' }}
                                    onFocus={e => e.target.style.borderColor = '#1976D2'}
                                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                            </div>
                            <button type="submit" className="btn-primary-lg" style={{ justifyContent: 'center', marginTop: 8 }}>
                                Enviar mensaje
                            </button>
                        </form>
                    )}
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────────────────── */}
            <footer style={{ background: '#0F1117', color: 'rgba(255,255,255,0.5)', padding: '48px 5% 32px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 48 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#1976D2,#FF9800)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>W</div>
                                <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Workly</span>
                            </div>
                            <p style={{ fontSize: 13.5, lineHeight: 1.7 }}>Simplifica la gestión de tu negocio como freelance o pequeño emprendedor.</p>
                        </div>
                        <div>
                            <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Información</h4>
                            {['Inicio', 'Características', 'Precios', 'Contacto'].map(l => (
                                <div key={l} style={{ marginBottom: 10 }}>
                                    <span onClick={() => scrollTo(l.toLowerCase().replace('í','i').replace('á','a').replace('é','e'))}
                                        style={{ cursor: 'pointer', fontSize: 14, transition: 'color 0.15s' }}
                                        onMouseEnter={e => e.target.style.color = '#fff'}
                                        onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>{l}</span>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Acceso</h4>
                            {[['Iniciar sesión', '/login'], ['Crear cuenta', '/register']].map(([l, href]) => (
                                <div key={l} style={{ marginBottom: 10 }}>
                                    <Link to={href} style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
                                        onMouseEnter={e => e.target.style.color = '#fff'}
                                        onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}>{l}</Link>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
                        <span>© {new Date().getFullYear()} Workly. Todos los derechos reservados.</span>
                        <div style={{ display: 'flex', gap: 20 }}>
                            <span style={{ cursor: 'pointer' }}>Política de privacidad</span>
                            <span style={{ cursor: 'pointer' }}>Términos y condiciones</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}