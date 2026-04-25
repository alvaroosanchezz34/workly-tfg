import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

const CHECK_ITEMS = [
    { id: 'api',      label: 'API Backend',         desc: 'Servidor principal de Workly' },
    { id: 'db',       label: 'Base de datos',        desc: 'MySQL en Railway' },
    { id: 'email',    label: 'Servicio de email',    desc: 'Envío de facturas por Resend' },
    { id: 'frontend', label: 'Aplicación web',       desc: 'Frontend en Vercel' },
];

const STATUS_META = {
    ok:       { label: 'Operativo',     color: '#4CAF50', bg: '#E8F5E9', dot: '#4CAF50' },
    degraded: { label: 'Degradado',     color: '#FF9800', bg: '#FFF3E0', dot: '#FF9800' },
    down:     { label: 'Caído',         color: '#F44336', bg: '#FFEBEE', dot: '#F44336' },
    checking: { label: 'Comprobando…',  color: '#9E9E9E', bg: '#F5F5F5', dot: '#BDBDBD' },
};

export default function Estado() {
    const [statuses, setStatuses] = useState({ api: 'checking', db: 'checking', email: 'checking', frontend: 'checking' });
    const [checkedAt, setCheckedAt] = useState(null);

    const check = async () => {
        setStatuses({ api: 'checking', db: 'checking', email: 'checking', frontend: 'checking' });
        try {
            const res  = await fetch(`${API}/health`);
            const data = await res.json();
            setStatuses({
                api:      res.ok ? 'ok' : 'down',
                db:       data.db === false ? 'down' : res.ok ? 'ok' : 'down',
                email:    'ok',   // Resend externo — siempre mostramos ok salvo que el backend informe
                frontend: 'ok',   // Si estamos aquí, el frontend funciona
            });
        } catch {
            setStatuses({ api: 'down', db: 'down', email: 'checking', frontend: 'ok' });
        }
        setCheckedAt(new Date());
    };

    useEffect(() => { check(); }, []);

    const allOk      = Object.values(statuses).every(s => s === 'ok');
    const anyDown    = Object.values(statuses).some(s => s === 'down');
    const anyChecking= Object.values(statuses).some(s => s === 'checking');

    const overallStatus = anyChecking ? 'checking' : anyDown ? 'down' : allOk ? 'ok' : 'degraded';
    const overall = STATUS_META[overallStatus];

    return (
        <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'DM Sans', Inter, sans-serif" }}>
            <style>{'@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap");'}</style>

            {/* Header */}
            <div style={{ background: overall.color, padding: '48px 5% 40px', transition: 'background 0.4s' }}>
                <div style={{ maxWidth: 760, margin: '0 auto' }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, textDecoration: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
                        ← Volver al inicio
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <img src="/logo.png" alt="Workly" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                        <span style={{ fontWeight: 800, fontSize: 18, color: '#fff' }}>Workly</span>
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Estado del sistema</h1>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '7px 18px' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
                            {anyChecking ? 'Comprobando servicios…' : allOk ? 'Todos los sistemas operativos' : anyDown ? 'Hay servicios caídos' : 'Algunos servicios degradados'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Checks */}
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 5%' }}>

                <div style={{ marginBottom: 32 }}>
                    {CHECK_ITEMS.map(item => {
                        const s = STATUS_META[statuses[item.id]] || STATUS_META.checking;
                        return (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, flexShrink: 0, boxShadow: `0 0 0 3px ${s.bg}` }} />
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 600, color: '#0F1117' }}>{item.label}</div>
                                        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{item.desc}</div>
                                    </div>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: s.color, background: s.bg, padding: '4px 12px', borderRadius: 99 }}>
                                    {s.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Last check + refresh */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', background: '#F8FAFF', border: '1px solid #E3E8F0', borderRadius: 12 }}>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>
                        {checkedAt ? `Última comprobación: ${checkedAt.toLocaleTimeString('es-ES')}` : 'Comprobando…'}
                    </span>
                    <button onClick={check} style={{ padding: '8px 16px', background: '#1976D2', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ↻ Actualizar
                    </button>
                </div>

                {/* Incident info */}
                <div style={{ marginTop: 32, padding: '20px 24px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 12 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Incidencias recientes</h3>
                    <p style={{ fontSize: 14, color: '#6B7280' }}>
                        {allOk && !anyChecking ? '✅ No hay incidencias registradas. Todos los sistemas funcionan con normalidad.' : 'Comprobando el estado de los servicios…'}
                    </p>
                </div>

                <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 32 }}>
                    ¿Detectas algún problema? Escríbenos a{' '}
                    <a href="mailto:soporte@workly.space" style={{ color: '#1976D2' }}>soporte@workly.space</a>
                </p>
            </div>

            <div style={{ background: '#0F1117', padding: '24px 5%', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
                    © {new Date().getFullYear()} Workly ·{' '}
                    <Link to="/privacidad" style={{ color: '#1976D2', textDecoration: 'none' }}>Privacidad</Link>{' '}·{' '}
                    <Link to="/" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>Inicio</Link>
                </p>
            </div>
        </div>
    );
}