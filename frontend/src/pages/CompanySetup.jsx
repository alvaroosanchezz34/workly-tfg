import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { createCompany } from '../api/company';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';

export default function CompanySetup() {
    const { token, login, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', tax_id: '', address: '', email: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await createCompany(token, form);
            // Recargar datos del usuario desde el backend
            const res = await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const updated = await res.json();
            login(token, localStorage.getItem('refreshToken'), updated);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Error al crear la empresa');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif' }}>
            <div style={{ width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '36px 32px' }}>

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1976D2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>W</div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>WORKLY</span>
                </div>

                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Configura tu empresa</h1>
                    <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)' }}>
                        Hola {user?.name?.split(' ')[0]}. Crea tu empresa para empezar a gestionar tu equipo.
                    </p>
                </div>

                {error && (
                    <div style={{ padding: '10px 13px', background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.25)', borderRadius: 6, fontSize: 13, color: '#EF9A9A', marginBottom: 16 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>Nombre de la empresa *</label>
                        <input name="name" value={form.name} onChange={set} required placeholder="Mi Empresa S.L."
                            style={{ width: '100%', padding: '10px 13px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>NIF / CIF</label>
                            <input name="tax_id" value={form.tax_id} onChange={set} placeholder="B12345678"
                                style={{ width: '100%', padding: '10px 13px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>Teléfono</label>
                            <input name="phone" value={form.phone} onChange={set} placeholder="+34 600 000 000"
                                style={{ width: '100%', padding: '10px 13px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>Email de contacto</label>
                        <input type="email" name="email" value={form.email} onChange={set} placeholder="empresa@ejemplo.com"
                            style={{ width: '100%', padding: '10px 13px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>Dirección</label>
                        <input name="address" value={form.address} onChange={set} placeholder="Calle Ejemplo 1, Sevilla"
                            style={{ width: '100%', padding: '10px 13px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} />
                    </div>

                    <button type="submit" disabled={loading} style={{ marginTop: 8, padding: '12px', background: '#1976D2', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Creando empresa…' : <><Building2 size={15} /> Crear empresa y continuar <ArrowRight size={15} /></>}
                    </button>
                </form>

                <button onClick={() => navigate('/dashboard')} style={{ width: '100%', marginTop: 12, padding: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12.5, cursor: 'pointer' }}>
                    Continuar sin empresa (modo personal)
                </button>
            </div>
        </div>
    );
}