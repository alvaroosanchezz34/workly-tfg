import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { fetchWithAuth } from '../context/fetchWithAuth';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL;

export default function WaitlistAdmin() {
    const { token, user } = useContext(AuthContext);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token || user?.role !== 'admin') {
            setLoading(false);
            return;
        }
        fetchWithAuth(`${API}/waitlist`, token)
            .then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'No se ha podido cargar');
                setRows(data);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [token, user?.role]);

    const download = async () => {
        const res = await fetchWithAuth(`${API}/waitlist/export`, token);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.message || 'No se ha podido exportar');
            return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'lista-espera-workly.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Lista de espera</h1>
                        <p className="page-subtitle">Personas apuntadas desde la página pública</p>
                    </div>
                    {user?.role === 'admin' && (
                        <button className="btn btn-primary" onClick={download}>Descargar CSV</button>
                    )}
                </div>
                {user?.role !== 'admin' && (
                    <p>Solo el administrador de la plataforma puede ver esta lista.</p>
                )}
                {error && <p style={{ color: 'var(--danger, #c62828)' }}>{error}</p>}
                {loading ? <p>Cargando…</p> : user?.role === 'admin' && (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th><th>Email</th><th>Oficio</th><th>Ciudad</th><th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 && (
                                    <tr><td colSpan={5}>Todavía no hay nadie apuntado.</td></tr>
                                )}
                                {rows.map(row => (
                                    <tr key={row.id}>
                                        <td>{row.name}</td>
                                        <td>{row.email}</td>
                                        <td>{row.profession || '—'}</td>
                                        <td>{row.city || '—'}</td>
                                        <td>{row.created_at ? new Date(row.created_at).toLocaleString('es-ES') : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
