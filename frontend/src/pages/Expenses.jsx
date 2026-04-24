import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenses';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import ExpenseForm from '../components/ExpenseForm';
import { Plus, TrendingDown, Search } from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CAT_COLOR = {
    software:   { bg: 'var(--primary-light)',    color: 'var(--primary)'   },
    hardware:   { bg: '#F3E5F5',                 color: '#7B1FA2'          },
    oficina:    { bg: 'var(--secondary-light)',  color: 'var(--secondary)' },
    transporte: { bg: 'var(--info-light)',        color: 'var(--info)'      },
    marketing:  { bg: 'var(--warning-light)',    color: 'var(--warning)'   },
    formacion:  { bg: '#E0F2F1',                 color: '#00695C'          },
    servicios:  { bg: 'var(--error-light)',      color: 'var(--error)'     },
    otros:      { bg: '#F5F5F5',                 color: '#616161'          },
};

const CAT_LABELS = {
    software: 'Software', hardware: 'Hardware', oficina: 'Oficina',
    transporte: 'Transporte', marketing: 'Marketing', formacion: 'Formación',
    servicios: 'Servicios', otros: 'Otros',
};

export default function Expenses() {
    const { token } = useContext(AuthContext);
    const [expenses,   setExpenses]   = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState('');
    const [search,     setSearch]     = useState('');
    const [catFilter,  setCatFilter]  = useState('all');
    const [showForm,   setShowForm]   = useState(false);
    const [editing,    setEditing]    = useState(null);
    const [toDelete,   setToDelete]   = useState(null);

    const load = async () => {
        setLoading(true);
        setError('');
        try { setExpenses(await getExpenses(token)); }
        catch { setError('No se pudieron cargar los gastos.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const handleCreate = async f => { await createExpense(token, f); setShowForm(false); load(); };
    const handleEdit   = async f => { await updateExpense(token, editing.id, f); setEditing(null); load(); };
    const handleDelete = async () => { await deleteExpense(token, toDelete.id); setToDelete(null); load(); };
    const closeModal   = () => { setShowForm(false); setEditing(null); };

    const filtered = expenses.filter(e => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
            (e.description || '').toLowerCase().includes(q) ||
            (e.category || '').toLowerCase().includes(q);
        const matchCat = catFilter === 'all' || e.category === catFilter;
        return matchSearch && matchCat;
    });

    const total         = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);

    // Categorías que tienen al menos 1 gasto
    const usedCats = [...new Set(expenses.map(e => e.category).filter(Boolean))];

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* ── HEADER ── */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Gastos</h1>
                        <p className="page-subtitle">
                            {expenses.length} registro{expenses.length !== 1 ? 's' : ''} · Total:{' '}
                            <span style={{ color: 'var(--error)', fontWeight: 600 }}>{fmt(total)}</span>
                            {(search || catFilter !== 'all') && (
                                <span style={{ color: 'var(--text-disabled)' }}>
                                    {' '}· Filtrado: <span style={{ color: 'var(--error)', fontWeight: 600 }}>{fmt(totalFiltered)}</span>
                                </span>
                            )}
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={15} /> Nuevo gasto
                    </button>
                </div>

                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>
                )}

                {/* ── BUSCADOR + FILTRO CATEGORÍA ── */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="search-bar" style={{ flex: '1 1 200px', minWidth: 200 }}>
                        <Search size={14} className="search-bar-icon" />
                        <input
                            className="form-input"
                            style={{ paddingLeft: 34 }}
                            placeholder="Buscar por descripción o categoría…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {usedCats.length > 1 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button
                                className={`filter-chip${catFilter === 'all' ? ' active' : ''}`}
                                onClick={() => setCatFilter('all')}
                            >
                                Todas
                                <span style={{ marginLeft: 5, opacity: 0.65, fontSize: 11 }}>{expenses.length}</span>
                            </button>
                            {usedCats.map(cat => (
                                <button
                                    key={cat}
                                    className={`filter-chip${catFilter === cat ? ' active' : ''}`}
                                    onClick={() => setCatFilter(cat)}
                                >
                                    {CAT_LABELS[cat] || cat}
                                    <span style={{ marginLeft: 5, opacity: 0.65, fontSize: 11 }}>
                                        {expenses.filter(e => e.category === cat).length}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── TABLA ── */}
                {loading ? (
                    <div className="table-wrap">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5' }}>
                                <div className="skeleton" style={{ height: 12, width: '38%', marginBottom: 8 }} />
                                <div className="skeleton" style={{ height: 10, width: '22%' }} />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><TrendingDown size={22} /></div>
                            <p className="empty-title">
                                {search || catFilter !== 'all' ? 'Sin resultados' : 'Sin gastos registrados'}
                            </p>
                            <p className="empty-desc">
                                {search || catFilter !== 'all'
                                    ? 'Prueba con otros términos o cambia la categoría'
                                    : 'Registra tus gastos para llevar un control financiero preciso'}
                            </p>
                            {!search && catFilter === 'all' && (
                                <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>
                                    <Plus size={14} /> Nuevo gasto
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Categoría</th>
                                    <th>Descripción</th>
                                    <th>Fecha</th>
                                    <th style={{ textAlign: 'right' }}>Importe</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((e, idx) => {
                                    const cat = CAT_COLOR[e.category] || CAT_COLOR.otros;
                                    const catLabel = CAT_LABELS[e.category] || (e.category
                                        ? e.category.charAt(0).toUpperCase() + e.category.slice(1)
                                        : '—');
                                    return (
                                        <tr key={e.id} style={{ animationDelay: `${idx * 22}ms` }}>
                                            <td>
                                                <span className="badge" style={{ background: cat.bg, color: cat.color }}>
                                                    <span className="badge-dot" style={{ background: cat.color }} />
                                                    {catLabel}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{e.description || <span style={{ color: 'var(--text-disabled)' }}>—</span>}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{fmtDate(e.date)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--error)' }}>
                                                {fmt(e.amount)}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="action-link action-link-primary" onClick={() => setEditing(e)}>Editar</button>
                                                <button className="action-link action-link-danger" style={{ marginLeft: 4 }} onClick={() => setToDelete(e)}>Eliminar</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* ── MODAL FORM ── */}
            <Modal open={showForm || !!editing} size="lg" title={editing ? 'Editar gasto' : 'Nuevo gasto'} onClose={closeModal}>
                <ExpenseForm initialData={editing} onSubmit={editing ? handleEdit : handleCreate} onCancel={closeModal} />
            </Modal>

            {/* ── CONFIRMAR BORRADO ── */}
            <Modal open={!!toDelete} title="Eliminar gasto" onClose={() => setToDelete(null)}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    ¿Eliminar este gasto de{' '}
                    <strong style={{ color: 'var(--error)' }}>{fmt(toDelete?.amount)}</strong>?
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>
        </div>
    );
}