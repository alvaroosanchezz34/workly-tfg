import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function BillingSuccess() {
    const [params] = useSearchParams();
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const t = setInterval(() => setCountdown(c => {
            if (c <= 1) { clearInterval(t); window.location.href = '/dashboard'; }
            return c - 1;
        }), 1000);
        return () => clearInterval(t);
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--secondary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle size={40} color="var(--secondary)" />
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>¡Suscripción activada! 🎉</h1>
                <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
                    Tu plan ya está activo. Ahora tienes acceso a todas las funcionalidades premium de Workly.
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-disabled)', marginBottom: 20 }}>
                    Redirigiendo al dashboard en {countdown}s…
                </p>
                <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--primary)', color: '#fff', padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
                    Ir al dashboard <ArrowRight size={16}/>
                </Link>
            </div>
        </div>
    );
}