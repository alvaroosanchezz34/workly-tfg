// frontend/src/pages/Landing.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────
   DATOS REALES del proyecto
───────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '👥', title: 'Gestión de clientes',
    desc: 'CRUD completo con búsqueda en tiempo real, historial por cliente, avatares y papelera de reciclaje.',
  },
  {
    icon: '📁', title: 'Proyectos y Kanban',
    desc: 'Tablero Kanban con drag & drop, vinculación a cliente, estados y seguimiento de tareas.',
  },
  {
    icon: '🧾', title: 'Facturación completa',
    desc: 'Facturas con IVA, descuentos y líneas de detalle. PDF profesional, número correlativo y portal público.',
  },
  {
    icon: '📋', title: 'Presupuestos',
    desc: 'Convierte un presupuesto en factura en un clic. PDF descargable y seguimiento de estado.',
  },
  {
    icon: '🔁', title: 'Facturas recurrentes',
    desc: 'Plantillas con periodicidad configurable. Generación automática diaria vía scheduler (node-cron).',
  },
  {
    icon: '📝', title: 'Notas de crédito',
    desc: 'Vinculación a factura original para corrección de importes sin eliminar el registro.',
  },
  {
    icon: '💸', title: 'Control de gastos',
    desc: 'Registro por categoría, búsqueda y exportación a Excel con ExcelJS.',
  },
  {
    icon: '📊', title: 'Dashboard financiero',
    desc: 'Ingresos, gastos, beneficio neto, top clientes y gráfica de evolución de 12 meses.',
  },
  {
    icon: '📈', title: 'Contabilidad',
    desc: 'Libro de ingresos y gastos. Modelos 130 y 303 pre-calculados para autónomos.',
  },
  {
    icon: '⏱️', title: 'Control de horas',
    desc: 'Timer integrado por proyecto con tarifa/hora y cálculo automático de ingresos.',
  },
  {
    icon: '🤖', title: 'Asistente IA',
    desc: 'Generación de presupuestos inteligentes, OCR de tickets y resúmenes automáticos del negocio.',
  },
  {
    icon: '📅', title: 'Calendario',
    desc: 'Vista mensual de vencimientos de facturas, presupuestos y proyectos.',
  },
];

// Precios de lanzamiento. Cámbialos aquí cuando cierres la tarifa.
const PRICING = {
  standardLabel: '12–15 €/mes',
  founderLabel: '9 €/mes',
  founderSpots: 50,
  note: 'Cifras orientativas, todavía no son el precio definitivo.',
};

// Planes extraídos de backend/src/config/plans.js
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    highlight: false,
    cta: 'Empieza gratis',
    ctaHref: '/register',
    features: [
      'Hasta 5 clientes',
      'Hasta 3 proyectos activos',
      'Hasta 10 facturas/mes',
      'Hasta 20 gastos',
      'Descarga de PDFs',
      'Dashboard básico',
    ],
    missing: ['Envío por email', 'Exportación Excel', 'Facturas recurrentes', 'Presupuestos', 'Estadísticas'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 12.99,
    yearlyPrice: 10.39,
    highlight: true,
    cta: 'Prueba gratis 7 días',
    ctaHref: '/register',
    features: [
      'Clientes ilimitados',
      'Proyectos ilimitados',
      'Facturas ilimitadas',
      'Gastos ilimitados',
      'Descarga de PDFs',
      'Envío por email (Resend)',
      'Exportación a Excel',
      'Facturas recurrentes',
      'Presupuestos y notas de crédito',
      'Estadísticas avanzadas',
      'Control de horas',
      'Asistente IA',
    ],
    missing: ['Gestión de equipo'],
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 24.99,
    yearlyPrice: 19.99,
    highlight: false,
    cta: 'Contactar',
    ctaHref: '#contacto',
    features: [
      'Todo lo del plan Pro',
      'Miembros de equipo ilimitados',
      'Roles admin / técnico',
      'Onboarding personalizado',
      'Soporte dedicado',
      'SLA garantizado',
    ],
    missing: [],
  },
];

const STEPS = [
  { n: '01', title: 'Crea tu cuenta', desc: 'Registro en menos de 60 segundos. Sin tarjeta de crédito.' },
  { n: '02', title: 'Configura tu empresa', desc: 'Añade tu logo, NIF, dirección y datos fiscales.' },
  { n: '03', title: 'Añade clientes y proyectos', desc: 'Importa o crea tus clientes y vincula proyectos.' },
  { n: '04', title: 'Empieza a facturar', desc: 'Genera tu primera factura PDF y envíala por email.' },
];

const TECH = [
  'Node.js + Express', 'React 19 + Vite', 'MySQL + JWT', 'Stripe', 'Resend', 'OpenAI', 'PDFKit', 'ExcelJS',
];

/* ─────────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────────── */
const useInView = (threshold = 0.1) => {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, [threshold]);
  return [ref, v];
};

/* ─────────────────────────────────────────────────────
   LANDING
───────────────────────────────────────────────────── */
export default function Landing() {
  const [billing, setBilling]   = useState('monthly');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', profession: '', city: 'Málaga', consent: false });
  const [sent, setSent]         = useState(false);
  const [waitError, setWaitError] = useState('');
  const [waitLoading, setWaitLoading] = useState(false);
  const [ticker, setTicker]     = useState(false);

  const [heroRef,  heroV]  = useInView(0.2);
  const [featRef,  featV]  = useInView(0.05);
  const [stepRef,  stepV]  = useInView(0.1);
  const [pricRef,  pricV]  = useInView(0.1);
  const [ctaRef,   ctaV]   = useInView(0.2);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 48);
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

  const submitWaitlist = async e => {
    e.preventDefault();
    setWaitError('');
    if (!form.consent) {
      setWaitError('Marca la casilla para que podamos guardar tu email.');
      return;
    }
    setWaitLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, consent: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'No se ha podido apuntar');
      setSent(true);
    } catch (err) {
      setWaitError(err.message);
    } finally {
      setWaitLoading(false);
    }
  };

  const NAV = [
    { label: 'Funciones', id: 'funciones' },
    { label: 'Cómo funciona', id: 'como' },
    { label: 'Precios', id: 'precios' },
    { label: 'Contacto', id: 'contacto' },
  ];

  const price = (plan) => billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const fmt   = v => v === 0 ? 'Gratis' : `${v.toFixed(2).replace('.', ',')}€`;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F7F8FA', color: '#0D1117', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Instrument+Serif:ital@0;1&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
        html { scroll-behavior: smooth; }
        input, textarea, button { font-family: inherit; }

        /* Colores de la marca extraídos del logo */
        :root {
          --blue:   #3A5BD9;   /* azul del logo */
          --teal:   #2AB8A0;   /* teal del logo */
          --orange: #F5843A;   /* naranja del logo */
          --dark:   #0D1117;
          --mid:    #3D4451;
          --muted:  #6B7280;
          --border: #E4E7EC;
          --bg:     #F7F8FA;
          --white:  #FFFFFF;
        }

        @keyframes fadeUp   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes slideR   { from { transform:translateX(110%); } to { transform:translateX(0); } }
        @keyframes ticker   { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
        @keyframes shimmer  { 0%,100% { opacity:.5; } 50% { opacity:1; } }

        .fade-up { opacity:0; transform:translateY(22px); transition:opacity .55s ease, transform .55s ease; }
        .fade-up.in { opacity:1; transform:translateY(0); }
        .d1{transition-delay:.04s} .d2{transition-delay:.10s} .d3{transition-delay:.16s}
        .d4{transition-delay:.22s} .d5{transition-delay:.28s} .d6{transition-delay:.34s}
        .d7{transition-delay:.40s} .d8{transition-delay:.46s} .d9{transition-delay:.52s}
        .d10{transition-delay:.58s} .d11{transition-delay:.64s} .d12{transition-delay:.70s}

        /* Nav */
        .nl { font-size:14px; font-weight:500; color:var(--muted); cursor:pointer; text-decoration:none; transition:color .18s; letter-spacing:-.01em; }
        .nl:hover { color:var(--dark); }

        /* Buttons */
        .btn-p {
          display:inline-flex; align-items:center; gap:7px;
          background:var(--blue); color:#fff; border:none;
          padding:13px 26px; border-radius:8px;
          font-size:14.5px; font-weight:700; cursor:pointer;
          transition:all .18s; text-decoration:none; letter-spacing:-.01em;
        }
        .btn-p:hover { background:#2D49C4; transform:translateY(-1px); box-shadow:0 8px 24px rgba(58,91,217,.28); }

        .btn-s {
          display:inline-flex; align-items:center; gap:7px;
          background:transparent; color:var(--mid); border:1.5px solid var(--border);
          padding:12px 24px; border-radius:8px;
          font-size:14.5px; font-weight:600; cursor:pointer;
          transition:all .18s; text-decoration:none; letter-spacing:-.01em;
        }
        .btn-s:hover { border-color:#9CA3AF; color:var(--dark); }

        /* Feature card */
        .fc {
          background:#fff; border:1px solid var(--border); border-radius:12px;
          padding:24px 22px; transition:all .2s;
        }
        .fc:hover { border-color:#C7D2FE; box-shadow:0 4px 20px rgba(58,91,217,.08); transform:translateY(-3px); }

        /* Plan card */
        .pc { border-radius:14px; transition:transform .2s, box-shadow .2s; }
        .pc:hover { transform:translateY(-4px); }

        /* Step */
        .sc { background:#fff; border:1px solid var(--border); border-radius:12px; padding:28px 26px; }

        /* Ticker */
        .tkr { display:flex; gap:0; animation:ticker 36s linear infinite; width:max-content; }
        .tkr.p { animation-play-state:paused; }
        .ti { display:flex; align-items:center; gap:10px; padding:0 28px; border-right:1px solid var(--border); white-space:nowrap; font-size:13.5px; font-weight:500; color:var(--muted); cursor:default; transition:color .18s; }
        .ti:hover { color:var(--dark); }

        /* Form */
        .fi { width:100%; padding:11px 14px; border:1.5px solid var(--border); border-radius:8px; font-size:14px; color:var(--dark); background:#fff; outline:none; transition:border-color .18s; }
        .fi::placeholder { color:#C4C9D4; }
        .fi:focus { border-color:var(--blue); }

        /* Mobile */
        .mob-overlay { position:fixed; inset:0; background:rgba(13,17,23,.6); z-index:98; backdrop-filter:blur(6px); animation:fadeIn .2s; }
        .mob-menu { position:fixed; top:0; right:0; bottom:0; width:min(320px,86vw); background:#fff; z-index:99; padding:72px 28px 36px; display:flex; flex-direction:column; gap:2px; border-left:1px solid var(--border); animation:slideR .26s cubic-bezier(.4,0,.2,1); overflow-y:auto; box-shadow:-12px 0 48px rgba(0,0,0,.1); }
        .ml { font-size:20px; font-weight:700; color:var(--mid); cursor:pointer; padding:13px 0; border-bottom:1px solid var(--border); transition:color .15s; display:block; text-decoration:none; letter-spacing:-.02em; }
        .ml:hover { color:var(--dark); }

        /* Responsive */
        @media(max-width:900px) {
          .fg { grid-template-columns:repeat(2,1fr) !important; }
          .pg { grid-template-columns:1fr !important; max-width:400px !important; margin:0 auto !important; }
          .sg { grid-template-columns:repeat(2,1fr) !important; }
          .ftg { grid-template-columns:1fr 1fr !important; }
        }
        @media(max-width:600px) {
          .fg { grid-template-columns:1fr !important; }
          .sg { grid-template-columns:1fr !important; }
          .ftg { grid-template-columns:1fr !important; }
          .hero-cta { flex-direction:column !important; }
          .hero-cta > * { width:100% !important; justify-content:center !important; }
          .sp { padding-left:20px !important; padding-right:20px !important; }
        }
        @media(max-width:768px) { .dsk { display:none !important; } }
        @media(min-width:769px) { .ham { display:none !important; } }
      `}</style>

      {/* ══ NAV ══════════════════════════════════════ */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100, height:60,
        padding:'0 clamp(20px,5%,72px)',
        background: scrolled ? 'rgba(247,248,250,.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : 'none',
        transition:'all .3s',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <img src="/logo.png" alt="Workly" style={{ width:32, height:32, borderRadius:7, objectFit:'cover' }} />
          <span style={{ fontWeight:800, fontSize:16.5, letterSpacing:'-.02em', color:'var(--dark)' }}>Workly</span>
        </div>

        {/* Desktop links */}
        <div className="dsk" style={{ display:'flex', gap:28, alignItems:'center' }}>
          {NAV.map(({ label, id }) => (
            <span key={id} className="nl" onClick={() => scrollTo(id)}>{label}</span>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="dsk" style={{ display:'flex', gap:10, alignItems:'center' }}>
          <Link to="/login" className="nl" style={{ marginRight:4 }}>Iniciar sesión</Link>
          <Link to="/register" className="btn-p" style={{ padding:'9px 18px', fontSize:13.5 }}>
            Empieza gratis →
          </Link>
        </div>

        {/* Hamburger */}
        <button className="ham" onClick={() => setMenuOpen(v => !v)}
          style={{ background:'none', border:'none', cursor:'pointer', padding:6, display:'flex', flexDirection:'column', gap:5 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              display:'block', width:20, height:2, borderRadius:2, background:'var(--dark)',
              transition:'all .2s',
              transform: menuOpen
                ? (i===0 ? 'rotate(45deg) translate(5px,5px)' : i===2 ? 'rotate(-45deg) translate(5px,-5px)' : 'scaleX(0)')
                : 'none',
            }} />
          ))}
        </button>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div className="mob-overlay" onClick={() => setMenuOpen(false)} />
          <div className="mob-menu">
            <button onClick={() => setMenuOpen(false)} style={{ position:'absolute', top:16, right:16, background:'#F3F4F6', border:'none', color:'var(--mid)', borderRadius:8, width:34, height:34, cursor:'pointer', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:28 }}>
              <img src="/logo.png" alt="Workly" style={{ width:30, height:30, borderRadius:6, objectFit:'cover' }} />
              <span style={{ fontWeight:800, fontSize:16, letterSpacing:'-.02em' }}>Workly</span>
            </div>
            {NAV.map(({ label, id }) => (
              <span key={id} className="ml" onClick={() => scrollTo(id)}>{label}</span>
            ))}
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:28 }}>
              <Link to="/login" onClick={() => setMenuOpen(false)} style={{ textAlign:'center', padding:'12px', border:'1.5px solid var(--border)', borderRadius:8, color:'var(--mid)', fontWeight:600, fontSize:14.5, textDecoration:'none' }}>
                Iniciar sesión
              </Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-p" style={{ justifyContent:'center' }}>
                Empieza gratis →
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ══ HERO ═════════════════════════════════════ */}
      <section id="inicio" style={{ position:'relative', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'120px clamp(20px,6%,80px) 80px', overflow:'hidden', background:'var(--bg)' }} className="sp">

        {/* Fondo sutil */}
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(58,91,217,.07) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 85% 80%, rgba(42,184,160,.05) 0%, transparent 55%)', pointerEvents:'none' }} />
        {/* Dot grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(58,91,217,.12) 1px, transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none', opacity:.5 }} />

        <div ref={heroRef} style={{ position:'relative', zIndex:1, maxWidth:860, margin:'0 auto' }}>
          {/* Pill */}
          <div className={`fade-up${heroV?' in':''}`} style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(58,91,217,.07)', border:'1px solid rgba(58,91,217,.18)', borderRadius:99, padding:'6px 16px', fontSize:12.5, color:'var(--blue)', fontWeight:600, marginBottom:28, letterSpacing:'.01em' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--teal)', flexShrink:0, animation:'shimmer 2s ease infinite' }} />
            Para autónomos de oficios y servicios en Málaga
          </div>

          {/* H1 */}
          <h1 className={`fade-up d1${heroV?' in':''}`} style={{ fontSize:'clamp(36px,5.5vw,72px)', fontWeight:800, lineHeight:1.06, letterSpacing:'-.03em', color:'var(--dark)', marginBottom:22 }}>
            Presupuesto en el móvil.<br />
            <span style={{ fontFamily:"'Instrument Serif', serif", fontStyle:'italic', fontWeight:400, color:'var(--blue)' }}>
              Factura en un clic. Cumple VeriFactu.
            </span>
          </h1>

          <p className={`fade-up d2${heroV?' in':''}`} style={{ fontSize:'clamp(16px,2vw,18.5px)', color:'var(--muted)', maxWidth:560, margin:'0 auto 40px', lineHeight:1.72 }}>
            Hecho para fontaneros, electricistas, reformas y servicios en Málaga. Haces el presupuesto en el teléfono, lo pasas a factura y Workly prepara el registro VeriFactu.
          </p>

          <div className={`hero-cta fade-up d3${heroV?' in':''}`} style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:52 }}>
            <button className="btn-p" style={{ fontSize:15.5, padding:'14px 30px' }} onClick={() => scrollTo('contacto')}>
              Apuntarme a la lista de Málaga
            </button>
            <Link to="/register" className="btn-s">
              Crear cuenta
            </Link>
          </div>

          {/* Stack pill */}
          <div className={`fade-up d4${heroV?' in':''}`} style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
            {TECH.map(t => (
              <span key={t} style={{ fontSize:12, fontWeight:500, color:'var(--muted)', background:'#fff', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', letterSpacing:'.01em' }}>{t}</span>
            ))}
          </div>
        </div>

        {/* Scroll */}
        <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:5, opacity:.3, cursor:'pointer' }} onClick={() => scrollTo('funciones')}>
          <div style={{ width:20, height:32, border:'1.5px solid var(--mid)', borderRadius:99, display:'flex', justifyContent:'center', paddingTop:5 }}>
            <div style={{ width:3, height:8, borderRadius:99, background:'var(--mid)', animation:'shimmer 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      </section>

      {/* ══ TICKER ═══════════════════════════════════ */}
      <div style={{ borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', background:'#fff', overflow:'hidden', padding:'16px 0', position:'relative' }}
        onMouseEnter={() => setTicker(true)} onMouseLeave={() => setTicker(false)}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:80, background:'linear-gradient(to right,#fff,transparent)', zIndex:1, pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:80, background:'linear-gradient(to left,#fff,transparent)', zIndex:1, pointerEvents:'none' }} />
        <div className={`tkr${ticker?' p':''}`}>
          {[...FEATURES, ...FEATURES].map((f, i) => (
            <div key={i} className="ti">
              <span style={{ fontSize:16 }}>{f.icon}</span>
              <span>{f.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FUNCIONES ════════════════════════════════ */}
      <section id="funciones" style={{ padding:'clamp(64px,8vw,108px) clamp(20px,6%,80px)', background:'var(--bg)' }} className="sp">
        <div style={{ maxWidth:1160, margin:'0 auto' }}>
          <div ref={featRef} style={{ marginBottom:'clamp(40px,5vw,68px)' }}>
            <p style={{ fontSize:12.5, fontWeight:700, color:'var(--blue)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>
              Funciones
            </p>
            <h2 className={`fade-up${featV?' in':''}`} style={{ fontSize:'clamp(28px,4vw,52px)', fontWeight:800, lineHeight:1.1, letterSpacing:'-.03em', maxWidth:580 }}>
              Todo lo que necesitas,<br />
              <span style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontWeight:400, color:'var(--blue)' }}>integrado desde el día uno.</span>
            </h2>
            <p className={`fade-up d1${featV?' in':''}`} style={{ fontSize:16.5, color:'var(--muted)', marginTop:16, maxWidth:480, lineHeight:1.7 }}>
              12 módulos construidos sobre Node.js, React 19 y MySQL. Sin dependencias de terceros innecesarias.
            </p>
          </div>

          <div className="fg" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`fc fade-up d${(i%6)+1}${featV?' in':''}`}>
                <div style={{ fontSize:26, marginBottom:12 }}>{f.icon}</div>
                <h3 style={{ fontSize:14.5, fontWeight:700, color:'var(--dark)', marginBottom:8, letterSpacing:'-.01em' }}>{f.title}</h3>
                <p style={{ fontSize:13.5, color:'var(--muted)', lineHeight:1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CÓMO FUNCIONA ════════════════════════════ */}
      <section id="como" style={{ padding:'clamp(64px,8vw,108px) clamp(20px,6%,80px)', background:'#fff', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }} className="sp">
        <div style={{ maxWidth:1040, margin:'0 auto' }}>
          <div ref={stepRef} style={{ textAlign:'center', marginBottom:'clamp(40px,5vw,64px)' }}>
            <p style={{ fontSize:12.5, fontWeight:700, color:'var(--teal)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>Cómo funciona</p>
            <h2 className={`fade-up${stepV?' in':''}`} style={{ fontSize:'clamp(26px,4vw,48px)', fontWeight:800, lineHeight:1.12, letterSpacing:'-.03em' }}>
              De cero a productivo<br />
              <span style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontWeight:400, color:'var(--teal)' }}>en 5 minutos.</span>
            </h2>
          </div>

          <div className="sg" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} className={`sc fade-up d${i+1}${stepV?' in':''}`}>
                <div style={{ fontFamily:"'Instrument Serif',serif", fontSize:42, fontWeight:400, color:'var(--blue)', opacity:.18, lineHeight:1, marginBottom:16, letterSpacing:'-.02em' }}>{s.n}</div>
                <h3 style={{ fontSize:15, fontWeight:700, marginBottom:10, letterSpacing:'-.01em' }}>{s.title}</h3>
                <p style={{ fontSize:13.5, color:'var(--muted)', lineHeight:1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRECIOS ══════════════════════════════════ */}
      <section id="precios" style={{ padding:'clamp(64px,8vw,108px) clamp(20px,6%,80px)', background:'var(--bg)' }} className="sp">
        <div style={{ maxWidth:1020, margin:'0 auto' }}>
          <div ref={pricRef} style={{ textAlign:'center', marginBottom:'clamp(36px,5vw,56px)' }}>
            <p style={{ fontSize:12.5, fontWeight:700, color:'var(--orange)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>Precios</p>
            <h2 className={`fade-up${pricV?' in':''}`} style={{ fontSize:'clamp(26px,4vw,48px)', fontWeight:800, lineHeight:1.12, letterSpacing:'-.03em', marginBottom:12 }}>
              Transparencia total.<br />
              <span style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontWeight:400, color:'var(--orange)' }}>Sin letra pequeña.</span>
            </h2>
            <p style={{ fontSize:16, color:'var(--muted)', lineHeight:1.6 }}>
              Precio previsto: {PRICING.standardLabel}. Precio fundador: {PRICING.founderLabel} para los primeros {PRICING.founderSpots}. {PRICING.note}
            </p>

            {/* Toggle */}
            <div style={{ display:'inline-flex', background:'#fff', border:'1px solid var(--border)', borderRadius:99, padding:4, marginTop:24, gap:2 }}>
              {['monthly','yearly'].map(b => (
                <button key={b} onClick={() => setBilling(b)} style={{
                  padding:'8px 20px', borderRadius:99, border:'none', cursor:'pointer',
                  fontFamily:'inherit', fontSize:13.5, fontWeight:600,
                  background: billing===b ? 'var(--dark)' : 'transparent',
                  color: billing===b ? '#fff' : 'var(--muted)',
                  transition:'all .2s',
                }}>
                  {b==='monthly' ? 'Mensual' : (
                    <span>Anual <span style={{ fontSize:11, background:'rgba(42,184,160,.15)', color:'var(--teal)', padding:'2px 7px', borderRadius:99, fontWeight:700, marginLeft:4 }}>-20%</span></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pg" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, alignItems:'start' }}>
            {PLANS.map((plan, i) => (
              <div key={plan.id}
                className={`pc fade-up d${i+1}${pricV?' in':''}`}
                style={{
                  background: plan.highlight ? 'var(--blue)' : '#fff',
                  border: plan.highlight ? 'none' : '1px solid var(--border)',
                  boxShadow: plan.highlight ? '0 20px 60px rgba(58,91,217,.3)' : '0 1px 4px rgba(0,0,0,.04)',
                  padding:'32px 28px',
                  position:'relative', overflow:'hidden',
                }}>

                {/* Accent top bar para highlight */}
                {plan.highlight && (
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,var(--teal),var(--orange))' }} />
                )}

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                  <div style={{ fontSize:13, fontWeight:700, color: plan.highlight ? 'rgba(255,255,255,.6)' : 'var(--muted)', letterSpacing:'.04em', textTransform:'uppercase' }}>
                    {plan.name}
                  </div>
                  {plan.highlight && (
                    <span style={{ fontSize:11, fontWeight:700, background:'rgba(255,255,255,.15)', color:'#fff', padding:'3px 10px', borderRadius:99, letterSpacing:'.04em' }}>
                      Más popular
                    </span>
                  )}
                </div>

                <div style={{ marginBottom:24 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                    <span style={{ fontSize:'clamp(36px,5vw,50px)', fontWeight:800, color: plan.highlight ? '#fff' : 'var(--dark)', lineHeight:1, letterSpacing:'-.03em' }}>
                      {price(plan) === 0 ? '0€' : `${price(plan).toFixed(2).replace('.',',')}€`}
                    </span>
                    {price(plan) > 0 && <span style={{ fontSize:14, color: plan.highlight ? 'rgba(255,255,255,.5)' : 'var(--muted)', fontWeight:400 }}>/mes</span>}
                  </div>
                  {billing==='yearly' && plan.monthlyPrice > 0 && (
                    <div style={{ fontSize:12, color: plan.highlight ? 'rgba(255,255,255,.4)' : 'var(--muted)', marginTop:4 }}>
                      Facturado anualmente · {fmt(plan.yearlyPrice * 12)}/año
                    </div>
                  )}
                </div>

                <div style={{ height:1, background: plan.highlight ? 'rgba(255,255,255,.12)' : 'var(--border)', marginBottom:22 }} />

                <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:9, marginBottom:28 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:13.5, color: plan.highlight ? 'rgba(255,255,255,.87)' : 'var(--mid)' }}>
                      <span style={{ color: plan.highlight ? 'rgba(255,255,255,.7)' : 'var(--teal)', fontWeight:700, flexShrink:0, marginTop:.5 }}>✓</span>
                      {f}
                    </li>
                  ))}
                  {plan.missing.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:13.5, color: plan.highlight ? 'rgba(255,255,255,.3)' : '#C4C9D4' }}>
                      <span style={{ fontWeight:700, flexShrink:0, marginTop:.5 }}>—</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link to={plan.ctaHref}
                  onClick={plan.ctaHref==='#contacto' ? e => { e.preventDefault(); scrollTo('contacto'); } : undefined}
                  style={{
                    display:'block', textAlign:'center', textDecoration:'none',
                    padding:'12px 20px', borderRadius:8,
                    fontWeight:700, fontSize:14, fontFamily:'inherit',
                    background: plan.highlight ? '#fff' : 'var(--dark)',
                    color: plan.highlight ? 'var(--blue)' : '#fff',
                    transition:'all .18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p style={{ textAlign:'center', marginTop:32, fontSize:13.5, color:'var(--muted)' }}>
            🔒 Sin tarjeta de crédito para el plan Free · Pagos seguros con Stripe · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════ */}
      <section ref={ctaRef} style={{ padding:'clamp(48px,7vw,88px) clamp(20px,6%,80px)', background:'#fff', borderTop:'1px solid var(--border)' }} className="sp">
        <div className={`fade-up${ctaV?' in':''}`} style={{ maxWidth:740, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:24 }}>
            <img src="/logo.png" alt="Workly" style={{ width:40, height:40, borderRadius:10, objectFit:'cover' }} />
            <span style={{ fontWeight:800, fontSize:18, letterSpacing:'-.02em' }}>Workly</span>
          </div>
          <h2 style={{ fontSize:'clamp(24px,4vw,48px)', fontWeight:800, lineHeight:1.1, letterSpacing:'-.03em', marginBottom:16 }}>
            Empieza hoy con el plan Free.<br />
            <span style={{ fontFamily:"'Instrument Serif',serif", fontStyle:'italic', fontWeight:400, color:'var(--blue)' }}>
              Sin compromiso, para siempre.
            </span>
          </h2>
          <p style={{ fontSize:'clamp(15px,2vw,17.5px)', color:'var(--muted)', marginBottom:36, lineHeight:1.72, maxWidth:480, margin:'0 auto 36px' }}>
            5 clientes, 3 proyectos y 10 facturas/mes sin coste. Actualiza a Pro cuando lo necesites.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/register" className="btn-p" style={{ fontSize:15.5, padding:'14px 30px' }}>
              Crear cuenta gratis →
            </Link>
            <Link to="/login" className="btn-s">Ya tengo cuenta</Link>
          </div>
        </div>
      </section>

      {/* ══ CONTACTO ═════════════════════════════════ */}
      <section id="contacto" style={{ padding:'clamp(64px,8vw,100px) clamp(20px,6%,80px)', background:'var(--bg)', borderTop:'1px solid var(--border)' }} className="sp">
        <div style={{ maxWidth:520, margin:'0 auto' }}>
          <p style={{ fontSize:12.5, fontWeight:700, color:'var(--blue)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12, textAlign:'center' }}>Lista de espera</p>
          <h2 style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:800, lineHeight:1.12, letterSpacing:'-.03em', marginBottom:10, textAlign:'center' }}>
            Plazas para autónomos de Málaga
          </h2>
          <p style={{ fontSize:16, color:'var(--muted)', marginBottom:36, lineHeight:1.7, textAlign:'center' }}>
            Déjanos tu oficio y la ciudad. Te escribimos cuando abramos el alta. Precio fundador: {PRICING.founderLabel}.
          </p>

          {sent ? (
            <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:14, padding:'48px 32px', textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
              <h3 style={{ fontSize:20, fontWeight:800, color:'var(--dark)', letterSpacing:'-.02em', marginBottom:10 }}>Estás en la lista</h3>
              <p style={{ color:'var(--muted)', fontSize:15, lineHeight:1.65 }}>Te escribiremos cuando abramos plazas en Málaga.</p>
            </div>
          ) : (
            <form onSubmit={submitWaitlist}
              style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:14, padding:'clamp(24px,4vw,36px)', display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Nombre', key:'name', type:'text', placeholder:'Tu nombre' },
                { label:'Email',  key:'email', type:'email', placeholder:'tu@email.com' },
                { label:'Oficio o sector', key:'profession', type:'text', placeholder:'Fontanería, electricidad, reformas…' },
                { label:'Ciudad', key:'city', type:'text', placeholder:'Málaga' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:13, fontWeight:600, color:'var(--mid)', display:'block', marginBottom:7 }}>{f.label}</label>
                  <input type={f.type} required={f.key !== 'profession'} placeholder={f.placeholder} value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="fi" />
                </div>
              ))}
              <label style={{ display:'flex', gap:10, alignItems:'flex-start', fontSize:13.5, color:'var(--mid)', lineHeight:1.5 }}>
                <input type="checkbox" checked={form.consent} onChange={e => setForm(p => ({ ...p, consent: e.target.checked }))} style={{ marginTop:3 }} />
                <span>Acepto que {`guardéis mi nombre y mi email para avisarme del alta. Puedo pedir que los borréis. He leído la `}<Link to="/privacidad">política de privacidad</Link>.</span>
              </label>
              {waitError && <p style={{ color:'#B91C1C', fontSize:13, margin:0 }}>{waitError}</p>}
              <button type="submit" className="btn-p" disabled={waitLoading} style={{ justifyContent:'center', padding:'13px', marginTop:4 }}>
                {waitLoading ? 'Apuntando…' : 'Quiero que me aviséis'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════ */}
      <footer style={{ background:'var(--dark)', padding:'clamp(48px,6vw,68px) clamp(20px,6%,80px) 28px', borderTop:'none' }}>
        <div style={{ maxWidth:1140, margin:'0 auto' }}>
          <div className="ftg" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:48, marginBottom:52 }}>

            {/* Brand */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:16 }}>
                <img src="/logo.png" alt="Workly" style={{ width:32, height:32, borderRadius:7, objectFit:'cover' }} />
                <span style={{ fontWeight:800, fontSize:16, color:'#fff', letterSpacing:'-.02em' }}>Workly</span>
              </div>
              <p style={{ fontSize:13.5, color:'rgba(255,255,255,.35)', lineHeight:1.8, maxWidth:260, marginBottom:20 }}>
                Herramienta de gestión para freelancers y autónomos. Facturación, proyectos y contabilidad en un solo lugar.
              </p>
              <Link to="/register" className="btn-p" style={{ fontSize:13, padding:'9px 18px', display:'inline-flex' }}>
                Empieza gratis →
              </Link>
            </div>

            {[
              {
                title:'Producto',
                items: NAV.map(n => ({ label:n.label, onClick:() => scrollTo(n.id) })),
              },
              {
                title:'Cuenta',
                items: [
                  { label:'Iniciar sesión',  href:'/login' },
                  { label:'Crear cuenta',    href:'/register' },
                  { label:'Plan y precios',  onClick:() => scrollTo('precios') },
                ],
              },
              {
                title:'Legal',
                items: [
                  { label:'Aviso legal', href:'/aviso-legal' },
                  { label:'Privacidad', href:'/privacidad' },
                  { label:'Cookies', href:'/cookies' },
                  { label:'Términos', href:'/terminos' },
                  { label:'Encargado del tratamiento', href:'/encargado' },
                  { label:'Estado del sistema', href:'/estado' },
                ],
              },
            ].map(col => (
              <div key={col.title}>
                <h4 style={{ fontSize:11.5, fontWeight:700, color:'rgba(255,255,255,.25)', marginBottom:16, textTransform:'uppercase', letterSpacing:'.1em' }}>{col.title}</h4>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {col.items.map(item => (
                    item.href
                      ? <Link key={item.label} to={item.href} style={{ fontSize:14, color:'rgba(255,255,255,.4)', textDecoration:'none', transition:'color .15s' }}
                          onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,.4)'}>{item.label}</Link>
                      : <span key={item.label} onClick={item.onClick} style={{ fontSize:14, color:'rgba(255,255,255,.4)', cursor:'pointer', transition:'color .15s' }}
                          onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='rgba(255,255,255,.4)'}>{item.label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:22, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <span style={{ fontSize:13, color:'rgba(255,255,255,.2)' }}>
              © {new Date().getFullYear()} Workly — Trabajo de Fin de Grado — DAW
            </span>
            <span style={{ fontSize:13, color:'rgba(255,255,255,.15)' }}>
              React 19 · Node.js · MySQL · Stripe
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}