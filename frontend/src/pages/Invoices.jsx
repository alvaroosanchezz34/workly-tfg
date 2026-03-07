import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import { getInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice, downloadInvoicePDF } from '../api/invoices';
import { getClients } from '../api/clients';
import { getProjects } from '../api/projects';
import InvoiceForm from '../components/InvoiceForm';
import { Plus, FileText, Download, Receipt } from 'lucide-react';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS = {
    draft:   { label: 'Borrador', cls: 'badge badge-draft'   },
    sent:    { label: 'Enviada',  cls: 'badge badge-sent'    },
    paid:    { label: 'Pagada',   cls: 'badge badge-paid'    },
    overdue: { label: 'Vencida',  cls: 'badge badge-overdue' },
};

const FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue'];
const FILTER_LABEL = { all: 'Todas', draft: 'Borrador', sent: 'Enviadas', paid: 'Pagadas', overdue: 'Vencidas' };

export default function Invoices() {
    const { token } = useContext(AuthContext);
    const [invoices,  setInvoices]  = useState([]);
    const [clients,   setClients]   = useState([]);
    const [projects,  setProjects]  = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [showForm,  setShowForm]  = useState(false);
    const [editing,   setEditing]   = useState(null);
    const [toDelete,  setToDelete]  = useState(null);
    const [filter,    setFilter]    = useState('all');

    const load = async () => {
        setLoading(true);
        try {
            const [inv, cli, proj] = await Promise.all([
                getInvoices(token), getClients(token), getProjects(token),
            ]);
            setInvoices(inv); setClients(cli); setProjects(proj);
        } finally { setLoading(false); }
    };

    useEffect(() => { if (token) load(); }, [token]);

    const handleEdit = async inv => {
        const full = await getInvoiceById(token, inv.id);
        setEditing(full); setShowForm(true);
    };

    const handleSubmit = async data => {
        if (data.id) await updateInvoice(token, data.id, data);
        else         await createInvoice(token, data);
        setShowForm(false); setEditing(null); load();
    };

    const handleDelete = async () => { await deleteInvoice(token, toDelete.id); setToDelete(null); load(); };
    const closeModal   = () => { setShowForm(false); setEditing(null); };

    const visible      = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
    const totalVisible = visible.reduce((s, i) => s + Number(i.total_amount || 0), 0);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">

                {/* ── HEADER ── */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Facturas</h1>
                        <p className="page-subtitle">
                            {invoices.length} factura{invoices.length !== 1 ? 's' : ''}
                            {filter !== 'all' && ` · ${FILTER_LABEL[filter]}: ${fmt(totalVisible)}`}
                            {filter === 'all' && ` · Total: ${fmt(totalVisible)}`}
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                        <Plus size={15} /> Nueva factura
                    </button>
                </div>

                {/* ── FILTROS ── */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            className={`filter-chip${filter === f ? ' active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {FILTER_LABEL[f]}
                            <span style={{ marginLeft: 6, opacity: 0.65, fontSize: 11 }}>
                                {f === 'all' ? invoices.length : invoices.filter(i => i.status === f).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── TABLA ── */}
                {loading ? (
                    <div className="table-wrap">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5' }}>
                                <div className="skeleton" style={{ height: 12, width: '35%', marginBottom: 8 }} />
                                <div className="skeleton" style={{ height: 10, width: '22%' }} />
                            </div>
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="table-wrap">
                        <div className="empty-state">
                            <div className="empty-icon"><Receipt size={22} /></div>
                            <p className="empty-title">
                                {filter === 'all' ? 'Sin facturas' : `Sin facturas con estado "${FILTER_LABEL[filter]}"`}
                            </p>
                            <p className="empty-desc">
                                {filter === 'all' ? 'Crea tu primera factura para empezar a cobrar' : 'Prueba con otro filtro'}
                            </p>
                            {filter === 'all' && (
                                <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>
                                    <Plus size={14} /> Nueva factura
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Número</th>
                                    <th>Cliente</th>
                                    <th>Estado</th>
                                    <th>Emisión</th>
                                    <th>Vencimiento</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                    <th style={{ textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((inv, idx) => {
                                    const s = STATUS[inv.status] || { label: inv.status, cls: 'badge' };
                                    const isOverdue = inv.status === 'overdue';
                                    return (
                                        <tr key={inv.id} style={{ animationDelay: `${idx * 22}ms` }}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <FileText size={13} color="var(--primary)" />
                                                    </div>
                                                    <span style={{ fontWeight: 500, fontSize: 13 }}>{inv.invoice_number}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{inv.client_name}</td>
                                            <td>
                                                <span className={s.cls}>
                                                    <span className="badge-dot" />{s.label}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{fmtDate(inv.issue_date)}</td>
                                            <td style={{
                                                fontSize: 13,
                                                fontWeight: isOverdue ? 600 : 400,
                                                color: isOverdue ? 'var(--error)' : 'var(--text-secondary)',
                                            }}>
                                                {fmtDate(inv.due_date)}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                                                {fmt(inv.total_amount)}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button className="action-link action-link-primary" onClick={() => handleEdit(inv)}>Editar</button>
                                                <button
                                                    className="btn-icon"
                                                    title="Descargar PDF"
                                                    style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 4 }}
                                                    onClick={() => downloadInvoicePDF(token, inv.id)}
                                                >
                                                    <Download size={13} />
                                                </button>
                                                <button className="action-link action-link-danger" style={{ marginLeft: 4 }} onClick={() => setToDelete(inv)}>Eliminar</button>
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
            {showForm && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal-box modal-box-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editing ? 'Editar factura' : 'Nueva factura'}</h3>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <InvoiceForm clients={clients} projects={projects} initialData={editing} onSubmit={handleSubmit} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
                            <button className="btn btn-primary" form="invoice-form" type="submit">Guardar factura</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL CONFIRMAR BORRADO ── */}
            <Modal open={!!toDelete} title="Eliminar factura" onClose={() => setToDelete(null)}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    ¿Eliminar la factura{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{toDelete?.invoice_number}</strong>?
                    {' '}Solo se pueden eliminar facturas no pagadas.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>
        </div>
    );
}