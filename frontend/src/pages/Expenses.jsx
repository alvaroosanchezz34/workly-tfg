// frontend/src/pages/Expenses.jsx
import { useContext, useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getExpenses, createExpense, updateExpense, deleteExpense, importExpenses } from '../api/expenses';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import ExpenseForm from '../components/ExpenseForm';
import Pagination from '../components/Pagination';
import OCRExpenseUploader from '../components/ai/OCRExpenseUploader';
import CSVImportModal from '../components/CSVImportModal';
import { Plus, TrendingDown, Search, Pencil, Trash2, Upload } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

const RecurringExpensesTab = lazy(() => import('../components/RecurringExpensesTab'));

const PAGE_SIZE = 20;
const TABS = ['gastos', 'recurrentes'];
const TAB_LABEL = { gastos: 'Gastos', recurrentes: 'Recurrentes' };
const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CAT_COLOR = {
    software:   { bg: 'var(--primary-light)',   color: 'var(--primary)'   },
    hardware:   { bg: '#F3E5F5',                color: '#7B1FA2'          },
    oficina:    { bg: 'var(--secondary-light)', color: 'var(--secondary)' },
    transporte: { bg: 'var(--info-light)',       color: 'var(--info)'      },
    marketing:  { bg: 'var(--warning-light)',   color: 'var(--warning)'   },
    formacion:  { bg: '#E0F2F1',                color: '#00695C'          },
    servicios:  { bg: 'var(--error-light)',     color: 'var(--error)'     },
    otros:      { bg: '#F5F5F5',               color: '#616161'          },
};
const CAT_LABELS = {
    software: 'Software', hardware: 'Hardware', oficina: 'Oficina',
    transporte: 'Transporte', marketing: 'Marketing', formacion: 'Formación',
    servicios: 'Servicios', otros: 'Otros',
};

export default function Expenses() {
    const { token } = useContext(AuthContext);
    const isMobile  = useIsMobile();

    const [expenses,   setExpenses]   = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 });
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState('');
    const [search,     setSearch]     = useState('');
    const [catFilter,  setCatFilter]  = useState('all');
    const [page,       setPage]       = useState(1);
    const [showForm,   setShowForm]   = useState(false);
    const [editing,    setEditing]    = useState(null);
    const [toDelete,   setToDelete]   = useState(null);
    const [tab,        setTab]        = useState('gastos');
    const [showImport, setShowImport] = useState(false);

    const load = useCallback(async (p = 1, cat = catFilter) => {
        setLoading(true); setError('');
        try {
            const params = new URLSearchParams({ page: p, limit: PAGE_SIZE });
            if (cat !== 'all') params.set('category', cat);
            const res = await getExpenses(token, params.toString());
            setExpenses(res.data ?? []);
            setPagination(res.pagination ?? { total: 0, page: p, pageSize: PAGE_SIZE, totalPages: 1 });
        } catch { setError('No se pudieron cargar los gastos.'); }
        finally { setLoading(false); }
    }, [token, catFilter]);

    // `load`/`catFilter` se excluyen a propósito: el cambio de filtro ya
    // dispara load() explícitamente, incluirlos aquí duplicaría la carga
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (token) load(1, catFilter); }, [token]);

    const handlePage   = p  => { setPage(p); load(p, catFilter); };
    const handleCat    = c  => { setCatFilter(c); setPage(1); load(1, c); };
    const handleCreate = async f => { await createExpense(token, f); setShowForm(false); load(page, catFilter); };
    const handleEdit   = async f => { await updateExpense(token, editing.id, f); setEditing(null); load(page, catFilter); };
    const handleDelete = async () => { await deleteExpense(token, toDelete.id); setToDelete(null); load(page, catFilter); };
    const closeModal   = () => { setShowForm(false); setEditing(null); };
    const handleOCRApply = data => { setEditing(data); setShowForm(true); };

    const filtered = search
        ? expenses.filter(e => {
            const q = search.toLowerCase();
            return (e.description||'').toLowerCase().includes(q) || (e.category||'').toLowerCase().includes(q);
          })
        : expenses;
    const total         = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
    const usedCats = [...new Set(expenses.map(e => e.category).filter(Boolean))];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                <div className="page-header">
                    <div>
                        <h1 className="page-title">Gastos</h1>
                        <p className="page-subtitle">
                            {expenses.length} registro{expenses.length !== 1 ? 's' : ''} · <span style={{ color:'var(--error)', fontWeight:600 }}>{fmt(total)}</span>
                            {(search || catFilter !== 'all') && <span style={{ color:'var(--text-disabled)' }}> · Filtrado: <span style={{ color:'var(--error)', fontWeight:600 }}>{fmt(totalFiltered)}</span></span>}
                        </p>
                    </div>
                    <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                        <OCRExpenseUploader onApply={handleOCRApply} />
                        <button className="btn btn-ghost" onClick={() => setShowImport(true)}>
                            <Upload size={14}/> Importar CSV
                        </button>
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                            <Plus size={15} /> Nuevo gasto
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div style={{ display:'flex', borderBottom:'2px solid var(--border)', marginBottom:20, overflowX:'auto' }}>
                    {TABS.map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding:'9px 14px', background:'none', border:'none', cursor:'pointer',
                            fontSize:13, fontWeight: tab===t?600:400,
                            color: tab===t?'var(--primary)':'var(--text-secondary)',
                            borderBottom:`2px solid ${tab===t?'var(--primary)':'transparent'}`,
                            marginBottom:-2, fontFamily:'inherit', whiteSpace:'nowrap', transition:'color .15s',
                        }}>
                            {TAB_LABEL[t]}
                        </button>
                    ))}
                </div>

                {error && <div className="alert alert-danger" style={{ marginBottom:16 }}>{error}</div>}

                {tab === 'recurrentes' && (
                    <Suspense fallback={<div className="table-wrap" style={{ padding: 24 }}><div className="skeleton" style={{ height: 12, width: '30%' }} /></div>}>
                        <RecurringExpensesTab token={token} onProcessed={() => load(page, catFilter)} />
                    </Suspense>
                )}

                {tab === 'gastos' && (
                <>
                {/* BUSCADOR + FILTROS */}
                <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
                    <div className="search-bar" style={{ flex:'1 1 200px', minWidth:160 }}>
                        <Search size={14} className="search-bar-icon" />
                        <input className="form-input" style={{ paddingLeft:34 }}
                            placeholder="Buscar…" aria-label="Buscar gastos" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {usedCats.length > 1 && (
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            <button className={`filter-chip${catFilter==='all'?' active':''}`} onClick={() => handleCat('all')}>
                                Todas <span style={{ marginLeft:5, opacity:.65, fontSize:11 }}>{pagination.total}</span>
                            </button>
                            {usedCats.map(cat => (
                                <button key={cat} className={`filter-chip${catFilter===cat?' active':''}`} onClick={() => handleCat(cat)}>
                                    {CAT_LABELS[cat] || cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* TABLA desktop / CARDS móvil */}
                {loading ? (
                    <div className="table-wrap">
                        {[...Array(4)].map((_,i) => (
                            <div key={i} style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)' }}>
                                <div className="skeleton" style={{ height:12, width:'38%', marginBottom:8 }}/>
                                <div className="skeleton" style={{ height:10, width:'22%' }}/>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><TrendingDown size={22}/></div>
                            <p className="empty-title">{search || catFilter !== 'all' ? 'Sin resultados' : 'Sin gastos registrados'}</p>
                            <p className="empty-desc">{search || catFilter !== 'all' ? 'Prueba con otros términos' : 'Registra tus gastos para llevar un control financiero preciso'}</p>
                            {!search && catFilter === 'all' && <button className="btn btn-primary" style={{ marginTop:10 }} onClick={() => setShowForm(true)}><Plus size={14}/> Nuevo gasto</button>}
                        </div>
                    </div>
                ) : isMobile ? (
                    /* ── Cards móvil ── */
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {filtered.map(e => {
                            const cat = CAT_COLOR[e.category] || CAT_COLOR.otros;
                            const catLabel = CAT_LABELS[e.category] || (e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : 'Otros');
                            return (
                                <div key={e.id} style={{ background:'var(--card-bg)', border:'1.5px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                                        <span className="badge" style={{ background:cat.bg, color:cat.color }}>
                                            <span className="badge-dot" style={{ background:cat.color }}/>{catLabel}
                                        </span>
                                        <span style={{ fontSize:16, fontWeight:800, color:'var(--error)' }}>{fmt(e.amount)}</span>
                                    </div>
                                    <div style={{ fontSize:13, color:'var(--text-primary)', marginBottom:4 }}>{e.description || <span style={{ color:'var(--text-disabled)' }}>Sin descripción</span>}</div>
                                    <div style={{ fontSize:12, color:'var(--text-disabled)', marginBottom:12 }}>{fmtDate(e.date)}</div>
                                    <div style={{ display:'flex', gap:8, borderTop:'1px solid var(--border)', paddingTop:10 }}>
                                        <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => setEditing(e)}><Pencil size={12}/> Editar</button>
                                        <button className="btn btn-danger btn-sm" style={{ flex:1 }} onClick={() => setToDelete(e)}><Trash2 size={12}/> Eliminar</button>
                                    </div>
                                </div>
                            );
                        })}
                        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} onPage={handlePage} />
                    </div>
                ) : (
                    /* ── Tabla desktop ── */
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Categoría</th><th>Descripción</th><th>Fecha</th>
                                    <th style={{ textAlign:'right' }}>Importe</th>
                                    <th style={{ textAlign:'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((e, idx) => {
                                    const cat = CAT_COLOR[e.category] || CAT_COLOR.otros;
                                    const catLabel = CAT_LABELS[e.category] || (e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : '—');
                                    return (
                                        <tr key={e.id} style={{ animationDelay:`${idx*22}ms` }}>
                                            <td><span className="badge" style={{ background:cat.bg, color:cat.color }}><span className="badge-dot" style={{ background:cat.color }}/>{catLabel}</span></td>
                                            <td style={{ color:'var(--text-secondary)' }}>{e.description || <span style={{ color:'var(--text-disabled)' }}>—</span>}</td>
                                            <td style={{ color:'var(--text-secondary)', fontSize:13 }}>{fmtDate(e.date)}</td>
                                            <td style={{ textAlign:'right', fontWeight:700, color:'var(--error)' }}>{fmt(e.amount)}</td>
                                            <td style={{ textAlign:'right' }}>
                                                <button className="action-link action-link-primary" onClick={() => setEditing(e)}>Editar</button>
                                                <button className="action-link action-link-danger" style={{ marginLeft:4 }} onClick={() => setToDelete(e)}>Eliminar</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} pageSize={pagination.pageSize} onPage={handlePage} />
                    </div>
                )}
                </>
                )}
            </main>

            <Modal open={showForm || !!editing} size="lg" title={editing?.id ? 'Editar gasto' : 'Nuevo gasto'} onClose={closeModal}>
                <ExpenseForm initialData={editing} onSubmit={editing?.id ? handleEdit : handleCreate} onCancel={closeModal} />
            </Modal>
            <Modal open={!!toDelete} title="Eliminar gasto" onClose={() => setToDelete(null)}>
                <p style={{ fontSize:14, color:'var(--text-secondary)', marginBottom:20 }}>
                    ¿Eliminar este gasto de <strong style={{ color:'var(--error)' }}>{fmt(toDelete?.amount)}</strong>?
                </p>
                <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>
            <CSVImportModal
                open={showImport}
                onClose={() => { setShowImport(false); load(page, catFilter); }}
                title="Importar gastos desde CSV"
                hint="Columnas admitidas: date (YYYY-MM-DD o DD/MM/YYYY), category, description, amount (date y amount son obligatorias)."
                columns={[
                    { key: 'date', label: 'Fecha' }, { key: 'category', label: 'Categoría' },
                    { key: 'description', label: 'Descripción' }, { key: 'amount', label: 'Importe' },
                ]}
                onImport={rows => importExpenses(token, rows)}
            />
        </div>
    );
}