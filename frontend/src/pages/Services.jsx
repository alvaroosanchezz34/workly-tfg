import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getServices, createService, updateService, deleteService } from '../api/services';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import ServiceForm from '../components/ServiceForm';
import { Plus, Wrench } from 'lucide-react';

const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

export default function Services() {
    const { token } = useContext(AuthContext);
    const [services, setServices] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing,  setEditing]  = useState(null);
    const [toDelete, setToDelete] = useState(null);

    const load = async () => {
        setLoading(true);
        try { setServices(await getServices(token)); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const handleCreate = async f => { await createService(token, f); setShowForm(false); load(); };
    const handleEdit   = async f => { await updateService(token, editing.id, f); setEditing(null); load(); };
    const handleDelete = async () => { await deleteService(token, toDelete.id); setToDelete(null); load(); };
    const closeModal   = () => { setShowForm(false); setEditing(null); };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* ── HEADER ── */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Servicios</h1>
                        <p className="page-subtitle">Catálogo de servicios y tarifas</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={15} /> Nuevo servicio
                    </button>
                </div>

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
                ) : services.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><Wrench size={22} /></div>
                            <p className="empty-title">Sin servicios</p>
                            <p className="empty-desc">Define tus servicios y tarifas para usarlos rápidamente al crear facturas</p>
                            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>
                                <Plus size={14} /> Nuevo servicio
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Grid de cards — más apropiado para un catálogo de servicios */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
                        {services.map((s, i) => (
                            <div
                                key={s.id}
                                className="card card-p"
                                style={{ animation: `rowIn 0.25s ease ${i * 40}ms both`, transition: 'box-shadow .2s, transform .2s' }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                            >
                                {/* cabecera card */}
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