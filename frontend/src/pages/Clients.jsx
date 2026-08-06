// frontend/src/pages/Clients.jsx
import { useContext, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ClientForm from '../components/ClientForm';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { getClients, createClient, updateClient, deleteClient, bulkDeleteClients, importClients } from '../api/clients';
import CSVImportModal from '../components/CSVImportModal';
import { Plus, Search, Users, Building2, Mail, Phone, ChevronRight, Upload } from 'lucide-react';
import { usePlanLimit } from '../hooks/usePlanLimit';
import useIsMobile from '../hooks/useIsMobile';

const PAGE_SIZE = 20;
const COLORS    = ['#1976D2','#4CAF50','#FF9800','#0288D1','#9C27B0','#F44336'];
const colorFor  = id => COLORS[id % COLORS.length];
const initials  = name => name?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?';

const Clients = () => {
    const { token } = useContext(AuthContext);
    const navigate  = useNavigate();
    const isMobile  = useIsMobile();

    const [clients,    setClients]    = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 });
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [page,       setPage]       = useState(1);
    const [showForm,   setShowForm]   = useState(false);
    const [editing,    setEditing]    = useState(null);
    const [toDelete,   setToDelete]   = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkBusy,   setBulkBusy]   = useState(false);
    const [showImport, setShowImport] = useState(false);
    const { checkResponse, UpgradePrompt } = usePlanLimit();

    const load = useCallback(async (p = page, q = search) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: p, limit: PAGE_SIZE });
            if (q) params.set('search', q);
            const res  = await getClients(token, params.toString());
            setClients(res.data ?? []);
            setPagination(res.pagination ?? { total: 0, page: p, pageSize: PAGE_SIZE, totalPages: 1 });
            setSelectedIds([]);
        } finally { setLoading(false); }
    }, [token, page, search]);

    // Carga inicial al montar / cuando cambia el token. `search` y `load` se
    // excluyen a propósito: la búsqueda ya tiene su propio efecto debounced
    // abajo, incluirlos aquí duplicaría peticiones en cada tecleo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (token) load(1, search); }, [token]);
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); load(1, search); }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handlePage   = p => { setPage(p); load(p, search); };
    const handleCreate = async f => {
        const res = await createClient(token, f);
        if (!await checkResponse(res)) return;
        if (!res.ok) { const d = await res.json(); return alert(d.message); }
        setShowForm(false); load(1, search);
    };
    const handleEdit   = async f => { await updateClient(token, editing.id, f); setEditing(null); load(page, search); };
    const handleDelete = async () => { await deleteClient(token, toDelete.id); setToDelete(null); load(page, search); };
    const openEdit     = (e, c) => { e.stopPropagation(); setEditing(c); };
    const openDelete   = (e, c) => { e.stopPropagation(); setToDelete(c); };

    const toggleSelect = (e, id) => { e.stopPropagation(); setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]); };
    const toggleSelectAll = () => setSelectedIds(ids => ids.length === clients.length ? [] : clients.map(c => c.id));
    const handleBulkDelete = async () => {
        if (!confirm(`¿Eliminar ${selectedIds.length} cliente(s)?`)) return;
        setBulkBusy(true);
        try { const res = await bulkDeleteClients(token, selectedIds); alert(res.message); load(page, search); }
        finally { setBulkBusy(false); }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                <div className="page-header">
                    <div>
                        <h1 className="page-title">Clientes</h1>
                        <p className="page-subtitle">{pagination.total} cliente{pagination.total !== 1 ? 's' : ''} registrado{pagination.total !== 1 ? 's' : ''}</p>
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                        <button className="btn btn-ghost" onClick={() => setShowImport(true)}>
                            <Upload size={14}/> Importar CSV
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                            <Plus size={15}/> Nuevo cliente
                        </button>
                    </div>
                </div>

                {/* BUSCADOR */}
                <div className="search-bar" style={{ marginBottom:18, maxWidth: '100%' }}>
                    <Search size={14} className="search-bar-icon"/>
                    <input className="form-input" style={{ paddingLeft:34 }}
                        placeholder="Buscar por nombre, email o empresa…" aria-label="Buscar clientes"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {selectedIds.length > 0 && !isMobile && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--primary-light)', border:'1px solid var(--primary)', borderRadius:8, padding:'8px 14px', marginBottom:14, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--primary)' }}>{selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}</span>
                        <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
                            <button className="btn btn-danger btn-sm" disabled={bulkBusy} onClick={handleBulkDelete}>Eliminar</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds([])}>Cancelar</button>
                        </div>
                    </div>
                )}

                {/* TABLA desktop / CARDS móvil */}
                {loading ? (
                    <div className="table-wrap">
                        {[...Array(5)].map((_,i) => (
                            <div key={i} style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:12, alignItems:'center' }}>
                                <div className="skeleton" style={{ width:36, height:36, borderRadius:8, flexShrink:0 }}/>
                                <div style={{ flex:1 }}>
                                    <div className="skeleton" style={{ height:12, width:'30%', marginBottom:6 }}/>
                                    <div className="skeleton" style={{ height:10, width:'48%' }}/>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : clients.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><Users size={22}/></div>
                            <p className="empty-title">{search ? 'Sin resultados' : 'Sin clientes aún'}</p>
                            <p className="empty-desc">{search ? 'Prueba con otro término' : 'Añade tu primer cliente para empezar'}</p>
                            {!search && <button className="btn btn-primary" style={{ marginTop:10 }} onClick={() => setShowForm(true)}><Plus size={14}/>Nuevo cliente</button>}
                        </div>
                    </div>
                ) : isMobile ? (
                    /* ── Vista card móvil ── */
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {clients.map(c => (
                            <div key={c.id}
                                onClick={() => navigate(`/clients/${c.id}`)}
                                style={{ background:'var(--card-bg)', border:'1.5px solid var(--border)', borderRadius:10, padding:'14px 16px', cursor:'pointer' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                                    <div style={{ width:36, height:36, borderRadius:8, background:`${colorFor(c.id)}14`, color:colorFor(c.id), display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0 }}>
                                        {initials(c.name)}
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                                        {c.company && <div style={{ fontSize:12, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4, marginTop:2 }}><Building2 size={11}/>{c.company}</div>}
                                    </div>
                                    <ChevronRight size={14} style={{ color:'var(--text-disabled)', flexShrink:0 }}/>
                                </div>
                                {(c.email || c.phone) && (
                                    <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:10 }}>
                                        {c.email && <span style={{ fontSize:12, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:5 }}><Mail size={11}/>{c.email}</span>}
                                        {c.phone && <span style={{ fontSize:12, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:5 }}><Phone size={11}/>{c.phone}</span>}
                                    </div>
                                )}
                                <div style={{ display:'flex', gap:8, borderTop:'1px solid var(--border)', paddingTop:10 }}>
                                    <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={e => openEdit(e, c)}>Editar</button>
                                    <button className="btn btn-danger btn-sm" style={{ flex:1 }} onClick={e => openDelete(e, c)}>Eliminar</button>
                                </div>
                            </div>
                        ))}
                        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} onPage={handlePage} />
                    </div>
                ) : (
                    /* ── Vista tabla desktop ── */
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width:32 }}>
                                        <input type="checkbox" aria-label="Seleccionar todos"
                                            checked={selectedIds.length === clients.length && clients.length > 0}
                                            onChange={toggleSelectAll} />
                                    </th>
                                    <th>Cliente</th>
                                    <th>Empresa</th>
                                    <th>Contacto</th>
                                    <th style={{ textAlign:'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map((c, idx) => (
                                    <tr key={c.id} style={{ animationDelay:`${idx*25}ms`, cursor:'pointer' }} onClick={() => navigate(`/clients/${c.id}`)}>
                                        <td>
                                            <input type="checkbox" aria-label={`Seleccionar ${c.name}`}
                                                checked={selectedIds.includes(c.id)}
                                                onChange={e => toggleSelect(e, c.id)}
                                                onClick={e => e.stopPropagation()} />
                                        </td>
                                        <td>
                                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                <div style={{ width:36, height:36, borderRadius:8, background:`${colorFor(c.id)}14`, color:colorFor(c.id), display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0 }}>
                                                    {initials(c.name)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight:500, display:'flex', alignItems:'center', gap:5 }}>
                                                        {c.name}<ChevronRight size={12} style={{ color:'var(--text-disabled)' }}/>
                                                    </div>
                                                    {c.document && <div style={{ fontSize:11.5, color:'var(--text-disabled)' }}>{c.document}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>{c.company ? <span style={{ display:'flex', alignItems:'center', gap:5, color:'var(--text-secondary)' }}><Building2 size={12}/>{c.company}</span> : <span style={{ color:'var(--text-disabled)' }}>—</span>}</td>
                                        <td>
                                            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                                                {c.email && <span style={{ fontSize:12.5, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}><Mail size={11}/>{c.email}</span>}
                                                {c.phone && <span style={{ fontSize:12.5, color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:4 }}><Phone size={11}/>{c.phone}</span>}
                                            </div>
                                        </td>
                                        <td style={{ textAlign:'right' }}>
                                            <button className="action-link action-link-primary" onClick={e => openEdit(e, c)}>Editar</button>
                                            <button className="action-link action-link-danger" style={{ marginLeft:4 }} onClick={e => openDelete(e, c)}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} onPage={handlePage} />
                    </div>
                )}
            </main>

            <Modal open={showForm || !!editing} title={editing ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => { setShowForm(false); setEditing(null); }}>
                <ClientForm initialData={editing} onSubmit={editing ? handleEdit : handleCreate} onCancel={() => { setShowForm(false); setEditing(null); }}/>
            </Modal>
            <Modal open={!!toDelete} title="Eliminar cliente" onClose={() => setToDelete(null)}>
                <p style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:20 }}>
                    ¿Estás seguro de que quieres eliminar a <strong style={{ color:'var(--text-primary)' }}>{toDelete?.name}</strong>?
                </p>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>
            <CSVImportModal
                open={showImport}
                onClose={() => { setShowImport(false); load(1, search); }}
                title="Importar clientes desde CSV"
                hint="Columnas admitidas: name, email, phone, company, document, notes (name es obligatoria)."
                columns={[
                    { key: 'name', label: 'Nombre' }, { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Teléfono' }, { key: 'company', label: 'Empresa' },
                ]}
                onImport={rows => importClients(token, rows)}
            />
            {UpgradePrompt}
        </div>
    );
};

export default Clients;