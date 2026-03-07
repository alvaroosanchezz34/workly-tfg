import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ClientForm from '../components/ClientForm';
import Modal from '../components/Modal';
import { getClients, createClient, updateClient, deleteClient } from '../api/clients';
import { Plus, Search, Users, Building2, Mail, Phone } from 'lucide-react';

const COLORS = ['#1976D2','#4CAF50','#FF9800','#0288D1','#9C27B0','#F44336'];
const colorFor = id => COLORS[id % COLORS.length];
const initials = name => name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';

const Clients = () => {
    const { token } = useContext(AuthContext);
    const [clients,  setClients]  = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [search,   setSearch]   = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing,  setEditing]  = useState(null);
    const [toDelete, setToDelete] = useState(null);

    const load = async () => {
        setLoading(true);
        try { const d = await getClients(token); setClients(d); setFiltered(d); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(clients.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.email||'').toLowerCase().includes(q) ||
            (c.company||'').toLowerCase().includes(q)
        ));
    }, [search, clients]);

    const handleCreate = async f => { await createClient(token, f); setShowForm(false); load(); };
    const handleEdit   = async f => { await updateClient(token, editing.id, f); setEditing(null); load(); };
    const handleDelete = async () => { await deleteClient(token, toDelete.id); setToDelete(null); load(); };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                <div className="page-header">
                    <div>
                        <h1 className="page-title">Clientes</h1>
                        <p className="page-subtitle">{clients.length} cliente{clients.length !== 1 ? 's' : ''} registrado{clients.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={15}/> Nuevo cliente
                    </button>
                </div>

                {/* BUSCADOR */}
                <div className="search-bar" style={{ marginBottom:18 }}>
                    <Search size={14} className="search-bar-icon"/>
                    <input className="form-input" style={{ paddingLeft:34 }}
                        placeholder="Buscar por nombre, email o empresa…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {/* TABLA */}
                {loading ? (
                    <div className="table-wrap">
                        {[...Array(4)].map((_,i) => (
                            <div key={i} style={{ padding:'13px 16px', borderBottom:'1px solid #F5F5F5', display:'flex', gap:12, alignItems:'center' }}>
                                <div className="skeleton" style={{ width:36, height:36, borderRadius:8 }}/>
                                <div style={{ flex:1 }}>
                                    <div className="skeleton" style={{ height:12, width:'30%', marginBottom:6 }}/>
                                    <div className="skeleton" style={{ height:10, width:'48%' }}/>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><Users size={22}/></div>
                            <p className="empty-title">{search ? 'Sin resultados' : 'Sin clientes aún'}</p>
                            <p className="empty-desc">{search ? 'Prueba con otro término de búsqueda' : 'Añade tu primer cliente para empezar a gestionar proyectos y facturas'}</p>
                            {!search && <button className="btn btn-primary" style={{ marginTop:10 }} onClick={() => setShowForm(true)}><Plus size={14}/>Nuevo cliente</button>}
                        </div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Empresa</th>
                                    <th>Contacto</th>
                                    <th style={{ textAlign:'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c, idx) => (
                                    <tr key={c.id} style={{ animationDelay:`${idx*25}ms` }}>
                                        <td>
                                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                <div style={{ width:36, height:36, borderRadius:8, background:`${colorFor(c.id)}14`, color:colorFor(c.id), display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0 }}>
                                                    {initials(c.name)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight:500 }}>{c.name}</div>
                                                    {c.document && <div style={{ fontSize:11.5, color:'var(--text-disabled)' }}>{c.document}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {c.company
                                                ? <span style={{ display:'flex', alignItems:'center', gap:5, color:'var(--text-secondary)' }}><Building2 size={12}/>{c.company}</span>
                                                : <span style={{ color:'var(--text-disabled)' }}>—</span>}
                                        </td>
                                        <td>
                                            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                                                {c.email && <span style={{ fontSize:12.5, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}><Mail size={11}/>{c.email}</span>}
                                                {c.phone && <span style={{ fontSize:12.5, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}><Phone size={11}/>{c.phone}</span>}
                                            </div>
                                        </td>
                                        <td style={{ textAlign:'right' }}>
                                            <button className="action-link action-link-primary" onClick={() => setEditing(c)}>Editar</button>
                                            <button className="action-link action-link-danger" style={{ marginLeft:4 }} onClick={() => setToDelete(c)}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            <Modal open={showForm || !!editing} title={editing ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => { setShowForm(false); setEditing(null); }}>
                <ClientForm initialData={editing} onSubmit={editing ? handleEdit : handleCreate} onCancel={() => { setShowForm(false); setEditing(null); }} />
            </Modal>

            <Modal open={!!toDelete} title="Eliminar cliente" onClose={() => setToDelete(null)}>
                <p style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:20 }}>
                    ¿Estás seguro de que quieres eliminar a <strong style={{ color:'var(--text-primary)' }}>{toDelete?.name}</strong>?
                    Los datos asociados quedarán afectados.
                </p>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>
        </div>
    );
};

export default Clients;