import { useContext, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { updateProfile } from '../api/users';
import { fetchWithAuth } from '../context/fetchWithAuth';
import Sidebar from '../components/Sidebar';
import { Input, Select, FormFooter } from '../components/FormComponents';
import { CheckCircle, Camera } from 'lucide-react';

const Profile = () => {
    const { token, user, login, logout } = useContext(AuthContext);
    const avatarInputRef = useRef(null);

    const [form, setForm] = useState({
        name:             user?.name         || '',
        email:            user?.email        || '',
        phone:            user?.phone        || '',
        company_name:     user?.company_name || '',
        avatar_url:       user?.avatar_url   || '',
        language:         user?.language     || 'es',
        timezone:         user?.timezone     || 'Europe/Madrid',
        current_password: '',
        password:         '',
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error,   setError]   = useState('');
    const [confirmDelete, setConfirmDelete] = useState('');
    const [accountMsg, setAccountMsg] = useState('');
    const [accountBusy, setAccountBusy] = useState(false);

    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setSuccess(false); setError('');
        try {
            const payload = { ...form };
            // No enviar campos de contraseña si no se quiere cambiar
            if (!payload.password) {
                delete payload.password;
                delete payload.current_password;
            }
            const updated = await updateProfile(token, payload);
            login(token, localStorage.getItem('refreshToken'), updated);
            setForm(f => ({ ...f, password: '', current_password: '' }));
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3500);
        } catch (err) {
            setError(err.message || 'Error al guardar los cambios');
        } finally {
            setLoading(false);
        }
    };

    // FIX: el botón de cámara abre el input de URL del avatar con foco
    const handleCameraClick = () => {
        avatarInputRef.current?.focus();
        avatarInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const initials = user?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U';

    const downloadExport = async () => {
        setAccountMsg('');
        const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/account/export`, token);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setAccountMsg(data.message || 'No se ha podido exportar');
            return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mis-datos-workly.json';
        link.click();
        URL.revokeObjectURL(url);
    };

    const closeAccount = async () => {
        setAccountBusy(true);
        setAccountMsg('');
        try {
            const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/account/delete`, token, {
                method: 'POST',
                body: JSON.stringify({ confirm: confirmDelete }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'No se ha podido cerrar la cuenta');
            logout();
        } catch (err) {
            setAccountMsg(err.message);
        } finally {
            setAccountBusy(false);
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                <div className="page-header">
                    <div>
                        <h1 className="page-title">Mi perfil</h1>
                        <p className="page-subtitle">Gestiona tu información personal y preferencias de cuenta</p>
                    </div>
                </div>

                <div style={{ maxWidth: 660 }}>

                    {/* ── AVATAR CARD ── */}
                    <div className="card card-p" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18 }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{
                                width: 64, height: 64,
                                borderRadius: 14,
                                background: 'linear-gradient(135deg, var(--primary), var(--warning))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 22, fontWeight: 700, color: '#fff',
                                overflow: 'hidden',
                            }}>
                                {form.avatar_url
                                    ? <img src={form.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : initials
                                }
                            </div>
                            {/* FIX: botón de cámara lleva al campo de URL del avatar */}
                            <button
                                type="button"
                                onClick={handleCameraClick}
                                title="Cambiar avatar"
                                style={{
                                    position: 'absolute', bottom: -4, right: -4,
                                    width: 22, height: 22, borderRadius: '50%',
                                    background: 'var(--primary)', border: '2px solid #fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <Camera size={10} color="#fff" />
                            </button>
                        </div>

                        <div>
                            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                                {user?.name || 'Usuario'}
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{user?.email}</p>
                            {user?.role === 'admin' && (
                                <span className="badge badge-sent" style={{ marginTop: 6, display: 'inline-flex' }}>
                                    Administrador
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── FORM CARD ── */}
                    <div className="card card-p">
                        {success && (
                            <div className="alert alert-success" style={{ marginBottom: 20 }}>
                                <CheckCircle size={15} />
                                <div>
                                    <strong>Perfil actualizado</strong>
                                    <p style={{ fontSize: 12.5, marginTop: 1 }}>Los cambios se han guardado correctamente.</p>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                            {/* Sección: Datos personales */}
                            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
                                Datos personales
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                <Input label="Nombre completo" name="name" value={form.name} onChange={set} required placeholder="Tu nombre" />
                                <Input label="Email" name="email" type="email" value={form.email} onChange={set} required placeholder="email@ejemplo.com" />
                                <Input label="Teléfono" name="phone" value={form.phone} onChange={set} placeholder="+34 600 000 000" />
                                <Input label="Empresa" name="company_name" value={form.company_name} onChange={set} placeholder="Nombre de tu empresa" />
                                <div style={{ gridColumn: '1 / -1' }}>
                                    {/* FIX: ref para que el botón de cámara pueda hacer foco aquí */}
                                    <div className="form-group">
                                        <label className="form-label">URL del avatar</label>
                                        <input
                                            ref={avatarInputRef}
                                            className="form-input"
                                            name="avatar_url"
                                            value={form.avatar_url}
                                            onChange={set}
                                            placeholder="https://ejemplo.com/foto.jpg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 20px' }} />

                            {/* Sección: Preferencias */}
                            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
                                Preferencias
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                <Select label="Idioma" name="language" value={form.language} onChange={set}
                                    options={[
                                        { value: 'es', label: 'Español' },
                                        { value: 'en', label: 'English' },
                                    ]}
                                />
                                <Select label="Zona horaria" name="timezone" value={form.timezone} onChange={set}
                                    options={[
                                        { value: 'Europe/Madrid',    label: 'Europe/Madrid (UTC+1/+2)' },
                                        { value: 'Europe/London',    label: 'Europe/London (UTC+0/+1)' },
                                        { value: 'America/New_York', label: 'America/New_York (UTC−5/−4)' },
                                    ]}
                                />
                            </div>

                            {/* Divider */}
                            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 20px' }} />

                            {/* Sección: Seguridad */}
                            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
                                Cambiar contraseña
                            </h3>
                            <Input
                                label="Contraseña actual"
                                name="current_password" type="password"
                                value={form.current_password} onChange={set}
                                placeholder="Introduce tu contraseña actual"
                            />
                            <Input
                                label="Nueva contraseña (dejar vacío para no cambiar)"
                                name="password" type="password"
                                value={form.password} onChange={set}
                                placeholder="Mínimo 8 caracteres"
                            />

                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 20, marginTop: 8, borderTop: '1px solid var(--border)' }}>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Guardando…' : 'Guardar cambios'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="card card-p" style={{ marginTop: 16 }}>
                        <h3 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>Tus datos y el cierre de la cuenta</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
                            Puedes descargar una copia en JSON. Si cierras la cuenta, se anonimiza el acceso y los datos de contacto,
                            se retiran los borradores y se borra el certificado electrónico guardado. Las facturas ya emitidas y los
                            registros VeriFactu se conservan al menos 4 años: es una obligación fiscal, no se pueden borrar desde aquí.
                        </p>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                            <button type="button" className="btn btn-ghost" onClick={downloadExport}>Descargar mis datos</button>
                        </div>
                        <label className="form-label">Escribe ELIMINAR para cerrar la cuenta</label>
                        <input className="form-input" value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder="ELIMINAR" />
                        {accountMsg && <p style={{ fontSize: 13, marginTop: 10 }}>{accountMsg}</p>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <button type="button" className="btn btn-danger" onClick={closeAccount} disabled={accountBusy}>Cerrar cuenta</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;