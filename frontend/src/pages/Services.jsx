import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getServices, createService, updateService, deleteService } from '../api/services';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import ServiceForm from '../components/ServiceForm';
import { Plus, Wrench, Search } from 'lucide-react';

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

export default function Services() {
    const { token } = useContext(AuthContext);
    const [services, setServices] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState('');
    const [search,   setSearch]   = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing,  setEditing]  = useState(null);
    const [toDelete, setToDelete] = useState(null);

    const load = async () => {
        setLoading(true);
        setError('');
        try { setServices(await getServices(token)); }
        catch { setError('No se pudieron cargar los servicios.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const handleCreate = async f => { await createService(token, f); setShowForm(false); load(); };
    const handleEdit   = async f => { await updateService(token, editing.id, f); setEditing(null); load(); };
    const handleDelete = async () => { await deleteService(token, toDelete.id); setToDelete(null); load(); };
    const closeModal   = () => { setShowForm(false); setEditing(null); };

    const filtered = services.filter(s => {
        const q = search.toLowerCase();
        return !q || s.name.toLowerCase().includes(q) || (s.unit || '').toLowerCase().includes(q);
    });

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* ── HEADER ── */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Servicios</h1>
                        <p className="page-subtitle">
                            {services.length} servicio{services.length !== 1 ? 's' : ''} en el catálogo
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={15} /> Nuevo servicio
                    </button>
                </div>

                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>
                )}

                {/* ── BUSCADOR ── */}
                {services.length > 0 && (
                    <div className="search-bar" style={{ marginBottom: 18 }}>
                        <Search size={14} className="search-bar-icon" />
                        <input
                            className="form-input"
                            style={{ paddingLeft: 34 }}
                            placeholder="Buscar servicio por nombre o unidad…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                )}

                {/* ── CONTENIDO ── */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="card card-p" style={{ height: 104 }}>
                                <div className="skeleton" style={{ height: 13, width: '55%', marginBottom: 12 }} />
                                <div className="skeleton" style={{ height: 10, width: '38%' }} />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><Wrench size={22} /></div>
                            <p className="empty-title">{search ? 'Sin resultados' : 'Sin servicios'}</p>
                            <p className="empty-desc">
                                {search
                                    ? 'Prueba con otro término de búsqueda'
                                    : 'Define tus servicios y tarifas para usarlos rápidamente al crear facturas'}
                            </p>
                            {!search && (
                                <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>
                                    <Plus size={14} /> Nuevo servicio
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
                        {filtered.map((s, i) => (
                            <div
                                key={s.id}
                                className="card card-p"
                                style={{ animation: `rowIn 0.25s ease ${i * 40}ms both`, transition: 'box-shadow .2s, transform .2s' }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                    <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Wrench size={17} color="var(--primary)" />
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="action-link action-link-primary btn-sm" onClick={() => setEditing(s)}>Editar</button>
                                        <button className="action-link action-link-danger btn-sm" onClick={() => setToDelete(s)}>Eliminar</button>
                                    </div>
                                </div>

                                <h3 style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                                    {s.name}
                                </h3>

                                <div style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'center' }}>
                                    {s.default_rate && (
                                        <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>
                                            {fmt(s.default_rate)}
                                        </span>
                                    )}
                                    {s.unit && (
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            / {s.unit}
                                        </span>
                                    )}
                                    {!s.default_rate && !s.unit && (
                                        <span style={{ color: 'var(--text-disabled)' }}>Sin tarifa definida</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* ── MODAL FORM ── */}
            <Modal open={showForm || !!editing} title={editing ? 'Editar servicio' : 'Nuevo servicio'} onClose={closeModal}>
                <ServiceForm initialData={editing} onSubmit={editing ? handleEdit : handleCreate} onCancel={closeModal} />
            </Modal>

            {/* ── CONFIRMAR BORRADO ── */}
            <Modal open={!!toDelete} title="Eliminar servicio" onClose={() => setToDelete(null)}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    ¿Eliminar el servicio{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{toDelete?.name}</strong>?
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>
        </div>
    );
}