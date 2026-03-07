import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate  = useNavigate();

    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');
    const [showPw,   setShowPw]   = useState(false);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const res  = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Credenciales incorrectas');
            login(data.accessToken, data.refreshToken, data.user);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">

                {/* Logo */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
                    <div className="sidebar-logo-icon">W</div>
                    <div>
                        <div style={{ fontSize:18, fontWeight:700, color:'#fff', letterSpacing:'0.04em' }}>WORKLY</div>
                        <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Gestión freelance</div>
                    </div>
                </div>

                <h1 style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:4, letterSpacing:'-0.01em' }}>
                    Bienvenido de vuelta
                </h1>
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.38)', marginBottom:28 }}>
                    Accede a tu panel de control
                </p>

                {error && (
                    <div style={{ padding:'10px 13px', background:'rgba(244,67,54,0.1)', border:'1px solid rgba(244,67,54,0.25)', borderRadius:6, fontSize:13, color:'#EF9A9A', marginBottom:16 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                        <label className="login-label">Email</label>
                        <input
                            className="login-input"
                            type="email" placeholder="tu@email.com"
                            value={email} onChange={e => setEmail(e.target.value)}
                            required autoComplete="email"
                        />
                    </div>

                    <div>
                        <label className="login-label">Contraseña</label>
                        <div style={{ position:'relative' }}>
                            <input
                                className="login-input"
                                type={showPw ? 'text' : 'password'} placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                                required style={{ paddingRight:42 }}
                            />
                            <button type="button" onClick={() => setShowPw(v => !v)}
                                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', display:'flex', padding:0 }}>
                                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading} style={{ marginTop:6 }}>
                        {loading
                            ? <><Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }}/>Accediendo…</>
                            : 'Iniciar sesión'
                        }
                    </button>
                </form>

                <p style={{ marginTop:28, fontSize:11, color:'rgba(255,255,255,0.16)', textAlign:'center' }}>
                    © {new Date().getFullYear()} Workly · Todos los derechos reservados
                </p>
            </div>
        </div>
    );
};

export default Login;