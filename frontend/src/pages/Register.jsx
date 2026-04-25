import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

export default function Register() {
    const { login } = useContext(AuthContext);
    const navigate  = useNavigate();
    const [form, setForm]   = useState({ name: '', email: '', password: '', confirm: '' });
    const [showPw, setShowPw]  = useState(false);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async e => {
        e.preventDefault();
        if (form.password !== form.confirm) return setError('Las contraseñas no coinciden');
        if (form.password.length < 6)       return setError('La contraseña debe tener al menos 6 caracteres');
        setError(''); setLoading(true);
        try {
            // Registro
            const regRes = await fetch(`${API}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
            });
            const regData = await regRes.json();
            if (!regRes.ok) throw new Error(regData.message || 'Error al registrarse');

            // Auto-login
            const loginRes = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, password: form.password }),
            });
            const loginData = await loginRes.json();
            if (!loginRes.ok) throw new Error('Registro exitoso. Por favor inicia sesión.');

            login(loginData.accessToken, loginData.refreshToken, loginData.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: 420 }}>

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                    <img src="/logo.png" alt="Workly" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>WORKLY</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Gestión freelance</div>
                    </div>
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.01em' }}>Crear cuenta</h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginBottom: 28 }}>Empieza a gestionar tu negocio hoy</p>

                {error && (
                    <div style={{ padding: '10px 13px', background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.25)', borderRadius: 6, fontSize: 13, color: '#EF9A9A', marginBottom: 16 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label className="login-label">Nombre completo</label>
                        <input className="login-input" name="name" value={form.name} onChange={set} placeholder="Tu nombre" required autoComplete="name" />
                    </div>
                    <div>
                        <label className="login-label">Email</label>
                        <input className="login-input" type="email" name="email" value={form.email} onChange={set} placeholder="tu@email.com" required autoComplete="email" />
                    </div>
                    <div>
                        <label className="login-label">Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <input className="login-input" type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={set}
                                placeholder="Mínimo 6 caracteres" required style={{ paddingRight: 42 }} />
                            <button type="button" onClick={() => setShowPw(v => !v)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 0 }}>
                                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="login-label">Confirmar contraseña</label>
                        <input className="login-input" type={showPw ? 'text' : 'password'} name="confirm" value={form.confirm} onChange={set}
                            placeholder="Repite la contraseña" required />
                    </div>

                    <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: 6 }}>
                        {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }}/>Creando cuenta…</> : 'Crear cuenta'}
                    </button>
                </form>

                <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Iniciar sesión</Link>
                </p>

                <p style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.16)', textAlign: 'center' }}>
                    © {new Date().getFullYear()} Workly · Todos los derechos reservados
                </p>
            </div>
        </div>
    );
}