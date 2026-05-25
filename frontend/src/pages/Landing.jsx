// frontend/src/pages/Landing.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════
   DATOS
═══════════════════════════════════════════════════════ */
const FEATURES = [
  { icon: '👥', label: 'Clientes', desc: 'CRM completo con historial, perfil y filtros en tiempo real.' },
  { icon: '📁', label: 'Proyectos', desc: 'Kanban con drag & drop. Estado actualizado al instante.' },
  { icon: '🧾', label: 'Facturas', desc: 'PDF profesional, envío por email y control de cobros.' },
  { icon: '📊', label: 'Dashboard', desc: 'Métricas financieras, gráficas y alertas automáticas.' },
  { icon: '💸', label: 'Gastos', desc: 'Registro por categoría con exportación a Excel.' },
  { icon: '🤖', label: 'IA', desc: 'Presupuestos inteligentes, OCR de tickets y resúmenes.' },
  { icon: '⏱️', label: 'Horas', desc: 'Timer integrado con facturación automática por hora.' },
  { icon: '📅', label: 'Calendario', desc: 'Vencimientos de facturas y proyectos en una vista.' },
  { icon: '🔁', label: 'Recurrentes', desc: 'Facturas automáticas con scheduler diario.' },
  { icon: '📋', label: 'Presupuestos', desc: 'Convierte un presupuesto en factura con un clic.' },
  { icon: '🏢', label: 'Equipo', desc: 'Multi-usuario con roles admin/técnico por empresa.' },
  { icon: '📈', label: 'Contabilidad', desc: 'Modelos 130 y 303 pre-calculados para autónomos.' },
];

const PLANS = [
  {
    name: 'Starter',
    price: '12.99',
    badge: null,
    color: '#3B82F6',
    features: ['Clientes y proyectos ilimitados', 'Creación de facturas PDF', 'Registro de gastos', 'Dashboard básico', 'Soporte estándar'],
  },
  {
    name: 'Pro',
    price: '24.99',
    badge: 'Más popular',
    color: '#F59E0B',
    features: ['Todo lo del Starter', 'Presupuestos y notas de crédito', 'Facturación recurrente', 'Envío email de facturas', 'Control de horas', 'Asistente IA', 'Contabilidad avanzada', 'Exportación Excel', 'Soporte prioritario'],
  },
  {
    name: 'Business',
    price: null,
    badge: 'Empresas',
    color: '#10B981',
    features: ['Todo lo del Pro', 'Gestión de equipo', 'Roles y permisos', 'Onboarding personalizado', 'SLA garantizado', 'Funcionalidades a medida'],
  },
];

const TESTIMONIALS = [
  { initials: 'CM', name: 'Carlos M.', role: 'Diseñador UI/UX freelance', color: '#3B82F6', stars: 5, text: 'Antes tardaba horas en facturar. Ahora genero una factura profesional en 2 minutos y se la envío al cliente desde la propia app. Completamente diferente.' },
  { initials: 'LP', name: 'Laura P.', role: 'Consultora de marketing', color: '#F59E0B', stars: 5, text: 'El dashboard me da claridad total. Sé en tiempo real cuánto he facturado, cuánto me deben y cuánto llevo gastado. Sin hojas de cálculo.' },
  { initials: 'DR', name: 'David R.', role: 'Desarrollador web', color: '#10B981', stars: 5, text: 'El Kanban de proyectos con drag & drop es lo que necesitaba. Puedo ver el estado de todo sin usar cinco herramientas distintas. Brutal.' },
  { initials: 'AS', name: 'Ana S.', role: 'Fotógrafa profesional', color: '#8B5CF6', stars: 5, text: 'El control de horas me ha ayudado a valorar mejor mi trabajo. Ahora sé exactamente cuánto tiempo dedico a cada proyecto y cobro lo que corresponde.' },
];

const STATS = [
  { value: 12, suffix: '+', label: 'Módulos integrados' },
  { value: 100, suffix: '%', label: 'Código propio, sin lock-in' },
  { value: 59, suffix: '', label: 'Tests automatizados' },
  { value: 0, suffix: '€', label: 'Para empezar hoy' },
];

/* ═══════════════════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════════════════ */
const useInView = (threshold = 0.1) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

const useCountUp = (target, duration = 1600, active = false) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, active]);
  return val;
};

/* ═══════════════════════════════════════════════════════
   COMPONENTE CONTADOR
═══════════════════════════════════════════════════════ */
function Counter({ value, suffix, label, active }) {
  const count = useCountUp(value, 1400, active);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'clamp(36px,5vw,58px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em', fontFamily: "'Syne', sans-serif" }}>
        {count}{suffix}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8, fontWeight: 500, letterSpacing: '0.02em' }}>{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LANDING
═══════════════════════════════════════════════════════ */
export default function Landing() {
  const [billing, setBilling]   = useState('monthly');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', message: '' });
  const [sent, setSent]         = useState(false);
  const [tickerPaused, setTickerPaused] = useState(false);

  const [statsRef, statsInView]   = useInView(0.3);
  const [featRef,  featInView]    = useInView(0.05);
  const [pricRef,  pricInView]    = useInView(0.1);
  const [testRef,  testInView]    = useInView(0.1);
  const [ctaRef,   ctaInView]     = useInView(0.2);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const scrollTo = id => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const annual = p => (Number(p) * 0.8).toFixed(2);

  const NAV = [
    { label: 'Funciones',  id: 'funciones' },
    { label: 'Precios',    id: 'precios' },
    { label: 'Opiniones',  id: 'opiniones' },
    { label: 'Contacto',   id: 'contacto' },
  ];

  /* doble ticker para loop infinito */
  const tickerItems = [...FEATURES, ...FEATURES];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#060810', color: '#fff', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        input, textarea, button { font-family: inherit; }

        /* ── Keyframes ── */
        @keyframes gradShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes glow {
          0%,100% { opacity: .6; transform: scale(1); }
          50%      { opacity: 1;  transform: scale(1.08); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(36px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          50%      { box-shadow: 0 0 0 16px rgba(245,158,11,0); }
        }
        @keyframes borderRotate {
          from { --angle: 0deg; }
          to   { --angle: 360deg; }
        }
        @keyframes scanline {
          from { transform: translateY(-100%); }
          to   { transform: translateY(100vh); }
        }

        /* ── Utility ── */
        .fade-up { opacity: 0; transform: translateY(28px); transition: opacity .65s ease, transform .65s ease; }
        .fade-up.visible { opacity: 1; transform: translateY(0); }
        .d1 { transition-delay: .05s; } .d2 { transition-delay: .12s; }
        .d3 { transition-delay: .19s; } .d4 { transition-delay: .26s; }
        .d5 { transition-delay: .33s; } .d6 { transition-delay: .40s; }
        .d7 { transition-delay: .47s; } .d8 { transition-delay: .54s; }
        .d9 { transition-delay: .61s; } .d10 { transition-delay: .68s; }
        .d11 { transition-delay: .75s; } .d12 { transition-delay: .82s; }

        /* ── Nav ── */
        .nav-link {
          font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.55);
          cursor: pointer; transition: color .2s; text-decoration: none; letter-spacing: .01em;
        }
        .nav-link:hover { color: #fff; }

        /* ── Buttons ── */
        .btn-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: #F59E0B; color: #000; border: none;
          padding: 14px 30px; border-radius: 8px;
          font-size: 15px; font-weight: 700; cursor: pointer;
          transition: all .2s; text-decoration: none;
          letter-spacing: -.01em;
        }
        .btn-cta:hover { background: #FBBF24; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(245,158,11,.4); }

        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(255,255,255,.75); border: 1px solid rgba(255,255,255,.18);
          padding: 13px 28px; border-radius: 8px;
          font-size: 15px; font-weight: 500; cursor: pointer;
          transition: all .2s; text-decoration: none;
        }
        .btn-outline:hover { border-color: rgba(255,255,255,.5); color: #fff; background: rgba(255,255,255,.05); }

        /* ── Feature ticker ── */
        .ticker-track {
          display: flex; gap: 0;
          animation: ticker 40s linear infinite;
          width: max-content;
        }
        .ticker-track.paused { animation-play-state: paused; }
        .ticker-item {
          display: flex; align-items: center; gap: 12px;
          padding: 0 32px; border-right: 1px solid rgba(255,255,255,.06);
          white-space: nowrap; font-size: 14px; font-weight: 500; color: rgba(255,255,255,.5);
          transition: color .2s;
          cursor: default;
        }
        .ticker-item:hover { color: rgba(255,255,255,.9); }

        /* ── Feature cards ── */
        .feat-card {
          background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px; padding: 26px 24px;
          transition: all .25s; cursor: default;
          position: relative; overflow: hidden;
        }
        .feat-card::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(59,130,246,.08), transparent 70%);
          opacity: 0; transition: opacity .3s;
        }
        .feat-card:hover { border-color: rgba(59,130,246,.3); transform: translateY(-4px); }
        .feat-card:hover::before { opacity: 1; }

        /* ── Plan cards ── */
        .plan-card { transition: transform .25s, box-shadow .25s; }
        .plan-card:hover { transform: translateY(-6px); }

        /* ── Testimonial cards ── */
        .test-card {
          background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
          border-radius: 16px; padding: 28px 26px;
          transition: all .22s;
        }
        .test-card:hover { border-color: rgba(255,255,255,.15); background: rgba(255,255,255,.05); }

        /* ── Gradient text ── */
        .grad-text {
          background: linear-gradient(90deg, #F59E0B, #F97316);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .grad-text-blue {
          background: linear-gradient(90deg, #60A5FA, #818CF8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Noise overlay ── */
        .noise {
          position: absolute; inset: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px 128px;
          mix-blend-mode: overlay;
          opacity: .4;
          z-index: 0;
        }

        /* ── Form inputs ── */
        .land-input {
          width: 100%; padding: 12px 16px;
          background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
          border-radius: 10px; color: #fff; font-size: 14px;
          outline: none; transition: border-color .2s, background .2s;
        }
        .land-input::placeholder { color: rgba(255,255,255,.25); }
        .land-input:focus { border-color: rgba(59,130,246,.6); background: rgba(59,130,246,.05); }

        /* ── Mobile menu ── */
        .mob-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 98; backdrop-filter: blur(8px); animation: fadeIn .2s ease; }
        .mob-menu { position: fixed; top: 0; right: 0; bottom: 0; width: min(340px,88vw); background: #0D1117; z-index: 99; padding: 80px 32px 40px; display: flex; flex-direction: column; gap: 4px; border-left: 1px solid rgba(255,255,255,.07); animation: slideRight .28s cubic-bezier(.4,0,.2,1); overflow-y: auto; }
        .mob-link { font-size: 22px; font-weight: 700; color: rgba(255,255,255,.65); cursor: pointer; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,.06); transition: color .15s; display: block; text-decoration: none; font-family: "'Syne', sans-serif"; letter-spacing: -.01em; }
        .mob-link:hover { color: #fff; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .feat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .plan-grid { grid-template-columns: 1fr !important; max-width: 440px !important; margin: 0 auto !important; }
          .test-grid { grid-template-columns: 1fr 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 32px !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .feat-grid { grid-template-columns: 1fr !important; }
          .test-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hero-cta { flex-direction: column !important; }
          .hero-cta > * { width: 100% !important; justify-content: center !important; text-align: center !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
          .footer-bottom { flex-direction: column !important; gap: 16px !important; }
          .section-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .hero-pad { padding-left: 24px !important; padding-right: 24px !important; }
        }
        @media (min-width: 769px) { .mob-ham { display: none !important; } }
        @media (max-width: 768px) { .nav-desktop-links { display: none !important; } }
      `}</style>

      {/* ════════════════════════════════════════
          NAV
      ════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64,
        padding: '0 clamp(20px,5%,72px)',
        background: scrolled ? 'rgba(6,8,16,.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,.06)' : 'none',
        transition: 'all .35s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 900, color: '#fff', flexShrink: 0,
            fontFamily: "'Syne', sans-serif",
          }}>W</div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.01em', fontFamily: "'Syne', sans-serif" }}>Workly</span>
        </div>

        {/* Desktop links */}
        <div className="nav-desktop-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {NAV.map(({ label, id }) => (
            <span key={id} className="nav-link" onClick={() => scrollTo(id)}>{label}</span>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="nav-desktop-links" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.5)', textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={e => e.target.style.color = '#fff'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.5)'}>
            Iniciar sesión
          </Link>
          <Link to="/register" className="btn-cta" style={{ padding: '9px 20px', fontSize: 13.5 }}>
            Empieza gratis →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="mob-ham" onClick={() => setMenuOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', flexDirection: 'column', gap: 5 }}
          aria-label="Menú">
          {[0,1,2].map(i => (
            <span key={i} style={{
              display: 'block', width: 22, height: 2, borderRadius: 2, background: '#fff',
              transition: 'all .22s',
              transform: menuOpen ? (i===0 ? 'rotate(45deg) translate(5px,5px)' : i===2 ? 'rotate(-45deg) translate(5px,-5px)' : 'scaleX(0)') : 'none',
            }} />
          ))}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div className="mob-overlay" onClick={() => setMenuOpen(false)} />
          <div className="mob-menu">
            <button onClick={() => setMenuOpen(false)} style={{ position:'absolute', top:18, right:18, background:'rgba(255,255,255,.08)', border:'none', color:'#fff', borderRadius:8, width:36, height:36, cursor:'pointer', fontSize:18 }}>✕</button>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:20, marginBottom:24, color:'#fff' }}>Workly</div>
            {NAV.map(({ label, id }) => (
              <span key={id} className="mob-link" onClick={() => scrollTo(id)}>{label}</span>
            ))}
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:32 }}>
              <Link to="/login" onClick={() => setMenuOpen(false)} style={{ textAlign:'center', padding:'13px', border:'1px solid rgba(255,255,255,.15)', borderRadius:10, color:'rgba(255,255,255,.75)', fontWeight:600, fontSize:15, textDecoration:'none' }}>Iniciar sesión</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-cta" style={{ justifyContent:'center' }}>Empieza gratis →</Link>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <section id="inicio" style={{ position:'relative', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', overflow:'hidden', padding:'130px 5% 80px' }}>
        {/* Mesh gradient bg */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,.22) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(139,92,246,.14) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 15% 90%, rgba(245,158,11,.1) 0%, transparent 50%)', zIndex:0 }} />
        {/* Grid lines */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize:'72px 72px', zIndex:0 }} />
        <div className="noise" />

        <div style={{ position:'relative', zIndex:1, maxWidth:920, margin:'0 auto' }}>
          {/* Eyebrow */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(59,130,246,.12)', border:'1px solid rgba(59,130,246,.25)', borderRadius:99, padding:'6px 16px', fontSize:12.5, color:'rgba(255,255,255,.75)', fontWeight:500, marginBottom:32, backdropFilter:'blur(8px)', letterSpacing:'.03em' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#3B82F6', boxShadow:'0 0 8px #3B82F6', flexShrink:0 }} />
            Plataforma de gestión para freelancers y autónomos
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(40px,6.5vw,86px)', fontWeight:900, lineHeight:1.02, letterSpacing:'-.03em', marginBottom:28, color:'#fff' }}>
            Tu negocio,<br />
            <span className="grad-text">sin el caos.</span>
          </h1>

          <p style={{ fontSize:'clamp(16px,2vw,19px)', color:'rgba(255,255,255,.55)', maxWidth:560, margin:'0 auto 44px', lineHeight:1.72 }}>
            Clientes, proyectos, facturas, gastos y contabilidad en una sola herramienta. Diseñada para que trabajes, no para que gestiones.
          </p>

          {/* CTA row */}
          <div className="hero-cta" style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:72 }}>
            <Link to="/register" className="btn-cta" style={{ fontSize:16, padding:'15px 34px' }}>
              Empieza gratis — es 0€ →
            </Link>
            <button className="btn-outline" onClick={() => scrollTo('funciones')}>
              Ver todas las funciones
            </button>
          </div>

          {/* Social proof bar */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:0, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'12px 24px', backdropFilter:'blur(8px)' }}>
            <div style={{ display:'flex', marginRight:12 }}>
              {['#3B82F6','#F59E0B','#10B981','#8B5CF6'].map((c,i) => (
                <div key={i} style={{ width:30, height:30, borderRadius:'50%', background:c, border:'2px solid #060810', marginLeft: i ? -10 : 0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff' }}>
                  {['C','L','D','A'][i]}
                </div>
              ))}
            </div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Freelancers que ya lo usan</div>
              <div style={{ fontSize:11.5, color:'rgba(255,255,255,.4)', marginTop:1 }}>
                {'★★★★★'} <span style={{ marginLeft:4 }}>Valoración media 4.9</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom scroll hint */}
        <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:.3, cursor:'pointer' }} onClick={() => scrollTo('funciones')}>
          <div style={{ width:24, height:38, border:'1.5px solid rgba(255,255,255,.5)', borderRadius:99, display:'flex', justifyContent:'center', paddingTop:7 }}>
            <div style={{ width:3, height:9, borderRadius:99, background:'#fff', animation:'glow 1.6s ease-in-out infinite' }} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TICKER DE FEATURES
      ════════════════════════════════════════ */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)', overflow:'hidden', padding:'18px 0', position:'relative' }}
        onMouseEnter={() => setTickerPaused(true)} onMouseLeave={() => setTickerPaused(false)}>
        {/* Fade masks */}
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:120, background:'linear-gradient(to right, #060810, transparent)', zIndex:1, pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:120, background:'linear-gradient(to left, #060810, transparent)', zIndex:1, pointerEvents:'none' }} />

        <div className={`ticker-track${tickerPaused ? ' paused' : ''}`}>
          {tickerItems.map((f, i) => (
            <div key={i} className="ticker-item">
              <span style={{ fontSize:18 }}>{f.icon}</span>
              <span style={{ fontWeight:600, color:'rgba(255,255,255,.7)' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════
          STATS
      ════════════════════════════════════════ */}
      <section ref={statsRef} style={{ padding:'clamp(60px,8vw,100px) clamp(20px,6%,80px)', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(59,130,246,.06), transparent 70%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:960, margin:'0 auto', position:'relative' }}>
          <div className="stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:48, justifyItems:'center' }}>
            {STATS.map((s, i) => (
              <Counter key={i} value={s.value} suffix={s.suffix} label={s.label} active={statsInView} />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FUNCIONES
      ════════════════════════════════════════ */}
      <section id="funciones" style={{ padding:'clamp(60px,8vw,110px) clamp(20px,6%,80px)', position:'relative' }} className="section-pad">
        <div style={{ maxWidth:1160, margin:'0 auto' }}>

          {/* Section header */}
          <div ref={featRef} style={{ marginBottom:'clamp(40px,5vw,72px)' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, color:'rgba(255,255,255,.4)', fontSize:12, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:16 }}>
              <div style={{ width:24, height:1, background:'rgba(255,255,255,.2)' }} />
              Funciones
              <div style={{ width:24, height:1, background:'rgba(255,255,255,.2)' }} />
            </div>
            <h2 className={`fade-up${featInView?' visible':''}`} style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(30px,4.5vw,58px)', fontWeight:900, lineHeight:1.08, letterSpacing:'-.03em', marginBottom:20 }}>
              Todo en uno.<br /><span className="grad-text-blue">Sin compromisos.</span>
            </h2>
            <p className={`fade-up d1${featInView?' visible':''}`} style={{ fontSize:17, color:'rgba(255,255,255,.45)', maxWidth:500, lineHeight:1.72 }}>
              12 módulos integrados desde el primer día. Sin integraciones de terceros, sin coste extra, sin complicaciones.
            </p>
          </div>

          {/* Feature grid */}
          <div className="feat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {FEATURES.map((f, i) => (
              <div key={f.label}
                className={`feat-card fade-up d${(i%6)+1}${featInView?' visible':''}`}>
                <div style={{ fontSize:28, marginBottom:14 }}>{f.icon}</div>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:8, color:'#fff', letterSpacing:'-.01em', fontFamily:"'Syne',sans-serif" }}>{f.label}</div>
                <p style={{ fontSize:13.5, color:'rgba(255,255,255,.4)', lineHeight:1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA bajo features */}
          <div style={{ textAlign:'center', marginTop:52 }}>
            <Link to="/register" className="btn-cta" style={{ fontSize:15, padding:'13px 28px' }}>
              Probar todas las funciones gratis →
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          BENTO / HIGHLIGHT SECTION
      ════════════════════════════════════════ */}
      <section style={{ padding:'0 clamp(20px,6%,80px) clamp(60px,8vw,100px)' }} className="section-pad">
        <div style={{ maxWidth:1160, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* Card grande izquierda */}
          <div style={{ background:'linear-gradient(145deg, rgba(59,130,246,.12), rgba(59,130,246,.04))', border:'1px solid rgba(59,130,246,.2)', borderRadius:20, padding:'40px 36px', display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:320, position:'relative', overflow:'hidden', gridRow:'span 2' }}>
            <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%', background:'rgba(59,130,246,.1)', filter:'blur(40px)', pointerEvents:'none' }} />
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#3B82F6', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:16 }}>Facturación inteligente</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(22px,3vw,34px)', fontWeight:900, lineHeight:1.1, letterSpacing:'-.02em', marginBottom:16 }}>
                De presupuesto<br />a factura pagada<br />en tres clics.
              </h3>
              <p style={{ fontSize:15, color:'rgba(255,255,255,.5)', lineHeight:1.7 }}>
                Crea presupuestos, conviértelos en facturas, envíalas por email con PDF adjunto y registra los cobros. Todo desde la misma pantalla.
              </p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:32 }}>
              {['Número correlativo automático', 'IVA, descuentos y retenciones', 'Portal público para el cliente', 'Firma de facturas electrónica'].map(t => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:10, fontSize:14, color:'rgba(255,255,255,.65)' }}>
                  <span style={{ color:'#3B82F6', fontWeight:700 }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>

          {/* Card IA */}
          <div style={{ background:'linear-gradient(145deg, rgba(245,158,11,.1), rgba(249,115,22,.06))', border:'1px solid rgba(245,158,11,.2)', borderRadius:20, padding:'32px 30px', position:'relative', overflow:'hidden', minHeight:150 }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(245,158,11,.1)', filter:'blur(30px)', pointerEvents:'none' }} />
            <div style={{ fontSize:13, fontWeight:600, color:'#F59E0B', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:12 }}>Asistente IA</div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(18px,2.5vw,26px)', fontWeight:900, lineHeight:1.15, letterSpacing:'-.02em', marginBottom:10 }}>
              Presupuestos<br />que se escriben solos.
            </h3>
            <p style={{ fontSize:13.5, color:'rgba(255,255,255,.45)', lineHeight:1.65 }}>Describe el proyecto y la IA genera el presupuesto completo con líneas, importes y condiciones.</p>
          </div>

          {/* Card Dashboard */}
          <div style={{ background:'linear-gradient(145deg, rgba(16,185,129,.1), rgba(16,185,129,.04))', border:'1px solid rgba(16,185,129,.2)', borderRadius:20, padding:'32px 30px', position:'relative', overflow:'hidden', minHeight:150 }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(16,185,129,.1)', filter:'blur(30px)', pointerEvents:'none' }} />
            <div style={{ fontSize:13, fontWeight:600, color:'#10B981', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:12 }}>Dashboard financiero</div>
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(18px,2.5vw,26px)', fontWeight:900, lineHeight:1.15, letterSpacing:'-.02em', marginBottom:10 }}>
              Sabe lo que ganas<br />antes de preguntar.
            </h3>
            <p style={{ fontSize:13.5, color:'rgba(255,255,255,.45)', lineHeight:1.65 }}>Ingresos, gastos, beneficio neto y alertas de facturas vencidas. En tiempo real, siempre visible.</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TESTIMONIOS
      ════════════════════════════════════════ */}
      <section id="opiniones" style={{ padding:'clamp(60px,8vw,110px) clamp(20px,6%,80px)', position:'relative', background:'rgba(255,255,255,.015)' }} className="section-pad">
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.015) 1px, transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }} />

        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative' }}>
          <div ref={testRef} style={{ textAlign:'center', marginBottom:'clamp(36px,5vw,64px)' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, color:'rgba(255,255,255,.4)', fontSize:12, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:16 }}>
              <div style={{ width:24, height:1, background:'rgba(255,255,255,.2)' }} />
              Opiniones
              <div style={{ width:24, height:1, background:'rgba(255,255,255,.2)' }} />
            </div>
            <h2 className={`fade-up${testInView?' visible':''}`} style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(28px,4vw,54px)', fontWeight:900, lineHeight:1.08, letterSpacing:'-.03em' }}>
              Lo que dicen<br /><span className="grad-text">quienes lo usan.</span>
            </h2>
          </div>

          <div className="test-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={t.name} className={`test-card fade-up d${i+1}${testInView?' visible':''}`}>
                <div style={{ color:'#F59E0B', fontSize:13, marginBottom:14, letterSpacing:2 }}>{'★'.repeat(t.stars)}</div>
                <p style={{ fontSize:14, color:'rgba(255,255,255,.6)', lineHeight:1.75, marginBottom:20, fontStyle:'italic' }}>"{t.text}"</p>
                <div style={{ display:'flex', alignItems:'center', gap:10, borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:16 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${t.color}22`, color:t.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0, border:`1px solid ${t.color}33` }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{t.name}</div>
                    <div style={{ fontSize:11.5, color:'rgba(255,255,255,.3)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          PRECIOS
      ════════════════════════════════════════ */}
      <section id="precios" style={{ padding:'clamp(60px,8vw,110px) clamp(20px,6%,80px)' }} className="section-pad">
        <div style={{ maxWidth:1040, margin:'0 auto' }}>

          <div ref={pricRef} style={{ textAlign:'center', marginBottom:'clamp(36px,5vw,60px)' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, color:'rgba(255,255,255,.4)', fontSize:12, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:16 }}>
              <div style={{ width:24, height:1, background:'rgba(255,255,255,.2)' }} />
              Precios
              <div style={{ width:24, height:1, background:'rgba(255,255,255,.2)' }} />
            </div>
            <h2 className={`fade-up${pricInView?' visible':''}`} style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(28px,4vw,54px)', fontWeight:900, lineHeight:1.08, letterSpacing:'-.03em', marginBottom:14 }}>
              Sin sorpresas.<br /><span className="grad-text-blue">Sin letra pequeña.</span>
            </h2>
            <p style={{ fontSize:16, color:'rgba(255,255,255,.4)', lineHeight:1.6 }}>Cancela cuando quieras. Sin permanencia.</p>

            {/* Toggle billing */}
            <div style={{ display:'inline-flex', background:'rgba(255,255,255,.06)', borderRadius:99, padding:4, marginTop:24, gap:2, border:'1px solid rgba(255,255,255,.08)' }}>
              {['monthly','yearly'].map(b => (
                <button key={b} onClick={() => setBilling(b)} style={{
                  padding:'8px 20px', borderRadius:99, border:'none', cursor:'pointer',
                  fontFamily:'inherit', fontSize:13.5, fontWeight:600,
                  background: billing===b ? '#fff' : 'transparent',
                  color: billing===b ? '#060810' : 'rgba(255,255,255,.45)',
                  boxShadow: billing===b ? '0 1px 4px rgba(0,0,0,.3)' : 'none',
                  transition:'all .2s',
                }}>
                  {b==='monthly' ? 'Mensual' : <span>Anual <span style={{ marginLeft:5, fontSize:10.5, background:'rgba(16,185,129,.2)', color:'#10B981', padding:'2px 8px', borderRadius:99, fontWeight:700 }}>-20%</span></span>}
                </button>
              ))}
            </div>
          </div>

          <div className="plan-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, alignItems:'start' }}>
            {PLANS.map((plan, i) => (
              <div key={plan.name}
                className={`plan-card fade-up d${i+1}${pricInView?' visible':''}`}
                style={{
                  background: plan.popular ? 'linear-gradient(145deg,#1D4ED8,#2563EB)' : 'rgba(255,255,255,.04)',
                  border: plan.popular ? 'none' : '1px solid rgba(255,255,255,.08)',
                  borderRadius:20, padding:'36px 30px',
                  boxShadow: plan.popular ? '0 0 0 1px rgba(59,130,246,.4), 0 32px 80px rgba(29,78,216,.4)' : 'none',
                  position:'relative', overflow:'hidden',
                }}>

                {plan.popular && (
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, #60A5FA, #818CF8, #60A5FA)', backgroundSize:'200% 100%', animation:'gradShift 3s ease infinite' }} />
                )}
                {plan.badge && (
                  <div style={{ display:'inline-block', fontSize:11, fontWeight:700, color: plan.popular ? '#fff' : '#10B981', background: plan.popular ? 'rgba(255,255,255,.15)' : 'rgba(16,185,129,.15)', padding:'4px 12px', borderRadius:99, marginBottom:18, letterSpacing:'.06em', textTransform:'uppercase' }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ fontSize:13, fontWeight:600, color: plan.popular ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.35)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em' }}>
                  {plan.name}
                </div>

                {plan.price ? (
                  <div style={{ marginBottom:28 }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(38px,5vw,52px)', fontWeight:900, lineHeight:1, letterSpacing:'-.03em', color:'#fff' }}>
                      {billing==='yearly' ? annual(plan.price) : plan.price}€
                    </span>
                    <span style={{ fontSize:14, color: plan.popular ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.3)', marginLeft:6 }}>/mes</span>
                    {billing==='yearly' && <div style={{ fontSize:12, color: plan.popular ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.25)', marginTop:4 }}>Facturado anualmente</div>}
                  </div>
                ) : (
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(30px,4vw,42px)', fontWeight:900, color:'#fff', marginBottom:28, lineHeight:1, letterSpacing:'-.02em' }}>
                    A medida
                  </div>
                )}

                <div style={{ height:1, background:'rgba(255,255,255,.1)', marginBottom:24 }} />

                <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:10, marginBottom:32 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:14, color: plan.popular ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.55)' }}>
                      <span style={{ color: plan.popular ? '#93C5FD' : plan.color, flexShrink:0, fontWeight:700, marginTop:.5 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to={plan.price ? '/register' : '#contacto'}
                  onClick={!plan.price ? () => scrollTo('contacto') : undefined}
                  style={{
                    display:'block', textAlign:'center', textDecoration:'none',
                    padding:'13px 20px', borderRadius:10,
                    fontWeight:700, fontSize:14.5, fontFamily:'inherit',
                    background: plan.popular ? '#fff' : 'rgba(255,255,255,.08)',
                    color: plan.popular ? '#1D4ED8' : '#fff',
                    border: plan.popular ? 'none' : '1px solid rgba(255,255,255,.12)',
                    transition:'all .2s',
                  }}
                  onMouseEnter={e => { if (!plan.popular) { e.currentTarget.style.background='rgba(255,255,255,.14)'; } }}
                  onMouseLeave={e => { if (!plan.popular) { e.currentTarget.style.background='rgba(255,255,255,.08)'; } }}>
                  {plan.price ? (plan.popular ? 'Prueba gratis 7 días' : 'Empezar ahora') : 'Hablar con ventas'}
                </Link>
              </div>
            ))}
          </div>

          {/* Garantía */}
          <div style={{ textAlign:'center', marginTop:40, fontSize:14, color:'rgba(255,255,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <span style={{ fontSize:18 }}>🔒</span>
            Sin tarjeta de crédito · Cancela cuando quieras · Datos 100% tuyos
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CTA FINAL
      ════════════════════════════════════════ */}
      <section ref={ctaRef} style={{ padding:'clamp(40px,6vw,80px) clamp(20px,6%,80px)' }} className="section-pad">
        <div className={`fade-up${ctaInView?' visible':''}`} style={{ maxWidth:860, margin:'0 auto', position:'relative' }}>
          <div style={{
            borderRadius:24, padding:'clamp(44px,7vw,80px) clamp(28px,5vw,72px)',
            background:'linear-gradient(145deg, rgba(59,130,246,.15), rgba(139,92,246,.1))',
            border:'1px solid rgba(59,130,246,.2)', textAlign:'center',
            position:'relative', overflow:'hidden',
          }}>
            {/* Glow orbs */}
            <div style={{ position:'absolute', top:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'rgba(59,130,246,.15)', filter:'blur(60px)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(245,158,11,.1)', filter:'blur(50px)', pointerEvents:'none' }} />
            <div className="noise" />

            <div style={{ position:'relative', zIndex:1 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(26px,4vw,52px)', fontWeight:900, lineHeight:1.1, letterSpacing:'-.03em', marginBottom:16 }}>
                Empieza hoy.<br />
                <span className="grad-text">Gratis. Sin excusas.</span>
              </h2>
              <p style={{ fontSize:'clamp(15px,2vw,18px)', color:'rgba(255,255,255,.5)', marginBottom:40, lineHeight:1.7, maxWidth:500, margin:'0 auto 40px' }}>
                Configura tu cuenta en menos de 2 minutos. Sin tarjeta de crédito, sin permanencia, sin límites de prueba.
              </p>
              <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
                <Link to="/register" className="btn-cta" style={{ fontSize:16, padding:'16px 36px', animation:'pulse 2.5s ease infinite' }}>
                  Crear cuenta gratis →
                </Link>
                <Link to="/login" className="btn-outline" style={{ fontSize:15 }}>
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          CONTACTO
      ════════════════════════════════════════ */}
      <section id="contacto" style={{ padding:'clamp(60px,8vw,100px) clamp(20px,6%,80px)', background:'rgba(255,255,255,.015)' }} className="section-pad">
        <div style={{ maxWidth:560, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, color:'rgba(255,255,255,.4)', fontSize:12, fontWeight:600, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:16 }}>
            <div style={{ width:24, height:1, background:'rgba(255,255,255,.2)' }} />
            Contacto
            <div style={{ width:24, height:1, background:'rgba(255,255,255,.2)' }} />
          </div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(26px,4vw,46px)', fontWeight:900, lineHeight:1.1, letterSpacing:'-.02em', marginBottom:12 }}>
            ¿Alguna duda?
          </h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,.4)', marginBottom:44, lineHeight:1.7 }}>
            Responderemos antes de 24 horas.
          </p>

          {sent ? (
            <div style={{ background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.25)', borderRadius:18, padding:'52px 32px' }}>
              <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:900, color:'#10B981', marginBottom:10 }}>Mensaje enviado</h3>
              <p style={{ color:'rgba(255,255,255,.5)', fontSize:15, lineHeight:1.65 }}>Gracias por escribirnos. Te responderemos en breve.</p>
              <button onClick={() => setSent(false)} style={{ marginTop:24, background:'none', border:'none', color:'rgba(255,255,255,.4)', fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:'pointer', transition:'color .15s' }}
                onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,.4)'}>
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); setSent(true); setForm({name:'',email:'',message:''}); }}
              style={{ display:'flex', flexDirection:'column', gap:14, textAlign:'left' }}>
              {[
                { label:'Nombre', key:'name', type:'text', placeholder:'Tu nombre' },
                { label:'Email',  key:'email', type:'email', placeholder:'tu@email.com' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,.45)', display:'block', marginBottom:8, letterSpacing:'.04em', textTransform:'uppercase' }}>{f.label}</label>
                  <input type={f.type} required placeholder={f.placeholder} value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="land-input" />
                </div>
              ))}
              <div>
                <label style={{ fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,.45)', display:'block', marginBottom:8, letterSpacing:'.04em', textTransform:'uppercase' }}>Mensaje</label>
                <textarea required placeholder="Cuéntanos en qué podemos ayudarte..." rows={4} value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  className="land-input" style={{ resize:'vertical' }} />
              </div>
              <button type="submit" className="btn-cta" style={{ justifyContent:'center', padding:'14px', marginTop:4 }}>
                Enviar mensaje
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer style={{ background:'#03040A', borderTop:'1px solid rgba(255,255,255,.05)', padding:'clamp(48px,6vw,72px) clamp(20px,6%,80px) 32px' }}>
        <div style={{ maxWidth:1140, margin:'0 auto' }}>
          <div className="footer-grid" style={{ display:'grid', gridTemplateColumns:'2.2fr 1fr 1fr 1fr', gap:48, marginBottom:56 }}>

            {/* Brand col */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#3B82F6,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:900, color:'#fff', fontFamily:"'Syne',sans-serif" }}>W</div>
                <span style={{ fontWeight:800, fontSize:16, fontFamily:"'Syne',sans-serif" }}>Workly</span>
              </div>
              <p style={{ fontSize:14, color:'rgba(255,255,255,.3)', lineHeight:1.8, maxWidth:280 }}>
                La herramienta de gestión para freelancers y autónomos que quieren centrarse en su trabajo, no en el papeleo.
              </p>
              <Link to="/register" className="btn-cta" style={{ marginTop:24, display:'inline-flex', fontSize:13, padding:'10px 20px' }}>
                Empieza gratis →
              </Link>
            </div>

            {/* Links */}
            {[
              { title: 'Producto', links: NAV.map(n => ({ label: n.label, action: () => scrollTo(n.id) })) },
              { title: 'Acceso', links: [{ label:'Iniciar sesión', href:'/login' },{ label:'Crear cuenta', href:'/register' }] },
              { title: 'Legal', links: [{ label:'Privacidad', href:'/privacidad' },{ label:'Estado del sistema', href:'/estado' }] },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.25)', marginBottom:18, textTransform:'uppercase', letterSpacing:'.1em' }}>{col.title}</h4>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {col.links.map(l => (
                    l.href
                      ? <Link key={l.label} to={l.href} style={{ fontSize:14, color:'rgba(255,255,255,.4)', textDecoration:'none', transition:'color .15s' }}
                          onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,.4)'}>{l.label}</Link>
                      : <span key={l.label} onClick={l.action} style={{ fontSize:14, color:'rgba(255,255,255,.4)', cursor:'pointer', transition:'color .15s' }}
                          onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,.4)'}>{l.label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="footer-bottom" style={{ borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <span style={{ fontSize:13, color:'rgba(255,255,255,.2)' }}>© {new Date().getFullYear()} Workly. Todos los derechos reservados.</span>
            <span style={{ fontSize:13, color:'rgba(255,255,255,.15)' }}>Hecho con ♥ para freelancers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}