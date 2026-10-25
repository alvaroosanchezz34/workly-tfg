import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '../Modal';
import InvoiceItems from '../InvoiceItems';
import { Select, Textarea } from '../FormComponents';
import { getQuotes, createQuote, updateQuote, deleteQuote, convertQuote } from '../../api/quotes';
import AISmartQuote from '../ai/AISmartQuote';
import { Plus, FileText, ArrowRight, CheckCircle } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';
import { useFeedback } from '../../context/FeedbackContext';
import { fetchWithAuth } from '../../context/fetchWithAuth';
import { TRADE_CATALOG, TRADE_LABEL } from '../../data/tradeCatalog';

const API = import.meta.env.VITE_API_URL;
const OFFLINE_KEY = 'workly_offline_quotes';

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS = {
    draft:    { label: 'Borrador',  cls: 'badge badge-draft'    },
    sent:     { label: 'Enviado',   cls: 'badge badge-sent'     },
    accepted: { label: 'Aceptado',  cls: 'badge badge-paid'     },
    rejected: { label: 'Rechazado', cls: 'badge badge-overdue'  },
    expired:  { label: 'Expirado',  cls: 'badge badge-cancelled' },
};

const genId = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

function compressPhoto(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer la foto'));
        reader.onload = () => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(1, 800 / Math.max(image.width, image.height));
                canvas.width = Math.max(1, Math.round(image.width * scale));
                canvas.height = Math.max(1, Math.round(image.height * scale));
                canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            image.onerror = () => reject(new Error('La foto no se puede abrir'));
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function SignaturePad({ onChange }) {
    const ref = useRef(null);
    const drawing = useRef(false);
    const point = event => {
        const canvas = ref.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.clientY - rect.top) * (canvas.height / rect.height),
        };
    };
    return (
        <canvas
            ref={ref}
            width={640}
            height={200}
            aria-label="Zona de firma"
            style={{ width: '100%', height: 160, border: '1px solid var(--border)', borderRadius: 12, background: '#fff', touchAction: 'none' }}
            onPointerDown={event => {
                drawing.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                const ctx = ref.current.getContext('2d');
                const p = point(event);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
            }}
            onPointerMove={event => {
                if (!drawing.current) return;
                const ctx = ref.current.getContext('2d');
                const p = point(event);
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#1C2033';
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }}
            onPointerUp={() => {
                drawing.current = false;
                onChange(ref.current.toDataURL('image/png'));
            }}
        />
    );
}

function lineFromCatalog(line) {
    const quantity = 1;
    const unitPrice = Number(line.default_rate);
    const subtotal = quantity * unitPrice;
    const taxAmount = Math.round(subtotal * 21) / 100;
    return {
        id: genId(),
        description: line.name,
        quantity,
        unit_price: unitPrice,
        tax_rate: 21,
        subtotal,
        tax_amount: taxAmount,
        total: subtotal + taxAmount,
    };
}

function QuoteForm({ clients, projects, services, initialData, onSubmit, onCancel, token }) {
    const narrow = useIsMobile(720);
    const { toast } = useFeedback();
    const fmt2d = d => (!d ? '' : d.split('T')[0]);
    const [form, setForm] = useState({
        client_id: initialData?.client_id || '', project_id: initialData?.project_id || '',
        issue_date: fmt2d(initialData?.issue_date), expiry_date: fmt2d(initialData?.expiry_date),
        status: initialData?.status || 'draft', notes: initialData?.notes || '',
    });
    const [items, setItems] = useState(
        initialData?.items?.length
            ? initialData.items.map(i => ({ ...i, id: i.id || genId() }))
            : [{ id: genId(), description: '', quantity: 1, unit_price: 0, tax_rate: 21, subtotal: 0, tax_amount: 0, total: 0 }]
    );
    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    const subtotal = items.reduce((s, i) => s + Number(i.subtotal || 0), 0);
    const taxTotal = items.reduce((s, i) => s + Number(i.tax_amount || 0), 0);

    const STATUS_OPTS = [
        { value: 'draft', label: 'Borrador' }, { value: 'sent', label: 'Enviado' },
        { value: 'accepted', label: 'Aceptado' }, { value: 'rejected', label: 'Rechazado' },
    ];

    const handleSubmit = e => {
        e.preventDefault();
        if (!form.client_id || !form.issue_date) return toast('Elige cliente y fecha', 'error');
        onSubmit({ ...form, items, id: initialData?.id });
    };

    return (
        <form id="quote-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Botón IA */}
            <AISmartQuote clients={clients} onApply={lines => setItems(lines)} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(TRADE_LABEL).map(([trade, label]) => (
                    <button
                        type="button"
                        key={trade}
                        className="btn btn-ghost"
                        onClick={async () => {
                            setItems(TRADE_CATALOG[trade].map(lineFromCatalog));
                            if (navigator.onLine !== false && token) {
                                await fetchWithAuth(`${API}/services/catalog`, token, {
                                    method: 'POST',
                                    body: JSON.stringify({ trade }),
                                }).catch(() => {});
                            }
                        }}
                    >
                        Partidas de {label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Cliente *</label>
                    <select name="client_id" value={form.client_id} onChange={set} className="form-select" required>
                        <option value="">Selecciona cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Proyecto</label>
                    <select name="project_id" value={form.project_id} onChange={set} className="form-select">
                        <option value="">Sin proyecto</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha emisión *</label>
                    <input type="date" name="issue_date" className="form-input" value={form.issue_date} onChange={set} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha expiración</label>
                    <input type="date" name="expiry_date" className="form-input" value={form.expiry_date} onChange={set} />
                </div>
            </div>
            <Select label="Estado" name="status" value={form.status} onChange={set} options={STATUS_OPTS} />
            <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Líneas</label>
            <InvoiceItems items={items} setItems={setItems} services={services} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ minWidth: 220, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                    {[['Base', fmt(subtotal)], ['IVA', fmt(taxTotal)], ['Total', fmt(subtotal + taxTotal)]].map(([l, v], i) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l}</span>
                            <span style={{ fontWeight: i === 2 ? 800 : 600, fontSize: i === 2 ? 16 : 13, color: i === 2 ? 'var(--primary)' : 'var(--text-primary)' }}>{v}</span>
                        </div>
                    ))}
                </div>
            </div>
            <Textarea label="Notas" name="notes" value={form.notes} onChange={set} rows={2} placeholder="Condiciones, validez del presupuesto…" />
            <div style={{ display: 'flex', flexDirection: narrow ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={narrow ? { width: '100%', minHeight: 48 } : undefined}>Guardar presupuesto</button>
            </div>
        </form>
    );
}

export default function QuotesTab({ token, clients, projects, services }) {
    const isMobile = useIsMobile(720);
    const { toast } = useFeedback();
    const [quotes,   setQuotes]   = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing,  setEditing]  = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [converting, setConverting] = useState(null);
    const [signing, setSigning] = useState(null);
    const [signerName, setSignerName] = useState('');
    const [signature, setSignature] = useState('');
    const [convDates,  setConvDates]  = useState({ issue_date: new Date().toISOString().split('T')[0], due_date: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try { setQuotes(await getQuotes(token)); }
        finally { setLoading(false); }
    }, [token]);
    useEffect(() => { if (token) load(); }, [token, load]);

    const handleSubmit = async data => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false && !data.id) {
            const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
            queue.push(data);
            localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
            toast('Sin red. El presupuesto queda en el teléfono. No se emite ninguna factura.', 'success');
            setShowForm(false);
            return;
        }
        if (data.id) await updateQuote(token, data.id, data);
        else         await createQuote(token, data);
        setShowForm(false); setEditing(null); load();
    };
    const flushOffline = async () => {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
        if (!queue.length) return;
        for (const draft of queue) await createQuote(token, draft);
        localStorage.removeItem(OFFLINE_KEY);
        toast('Presupuestos guardados enviados. Siguen siendo borradores.', 'success');
        load();
    };
    const oneTap = async quote => {
        const today = new Date().toISOString().slice(0, 10);
        const due = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
        try {
            const result = await convertQuote(token, quote.id, { issue_date: today, due_date: due });
            toast(result.invoice_number
                ? `Factura ${result.invoice_number} creada.`
                : 'Borrador de factura creado. El número sale al pulsar Emitir.', 'success');
            load();
        } catch (err) { toast(err.message, 'error'); }
    };
    const uploadPhoto = async (quote, file) => {
        if (!file) return;
        try {
            const image = await compressPhoto(file);
            const res = await fetchWithAuth(`${API}/quotes/${quote.id}/photos`, token, {
                method: 'POST',
                body: JSON.stringify({ image, caption: 'Foto de la obra' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se guardó la foto');
            toast('Foto guardada en el presupuesto', 'success');
        } catch (err) { toast(err.message, 'error'); }
    };
    const saveSignature = async () => {
        try {
            const res = await fetchWithAuth(`${API}/quotes/${signing.id}/sign`, token, {
                method: 'POST',
                body: JSON.stringify({ signerName, signature }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'No se guardó la firma');
            toast('Firma guardada. El presupuesto queda aceptado.', 'success');
            setSigning(null);
            load();
        } catch (err) { toast(err.message, 'error'); }
    };
    const shareWhatsapp = quote => {
        const link = quote.public_token ? `${window.location.origin}/q/${quote.public_token}` : '';
        const text = encodeURIComponent(`Hola, te paso el presupuesto ${quote.quote_number} por ${fmt(quote.total_amount)}. ${link}`.trim());
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    };
    const handleDelete = async () => { await deleteQuote(token, toDelete.id); setToDelete(null); load(); };
    const handleConvert = async () => {
        try {
            const result = await convertQuote(token, converting.id, convDates);
            const number = result.invoice_number
                ? `Factura ${result.invoice_number} creada.`
                : 'Borrador creado. El número oficial se asigna cuando pulses Emitir, en Facturas.';
            toast(number, 'success');
            setConverting(null); load();
        } catch (err) { toast(err.message, 'error'); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{quotes.length} presupuesto{quotes.length !== 1 ? 's' : ''}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={flushOffline}>Enviar guardados</button>
                    <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                        <Plus size={14} /> Nuevo presupuesto
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="table-wrap">{[...Array(3)].map((_, i) => <div key={i} style={{ padding: '13px 16px', borderBottom: '1px solid #F5F5F5' }}><div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} /><div className="skeleton" style={{ height: 10, width: '25%' }} /></div>)}</div>
            ) : quotes.length === 0 ? (
                <div className="table-wrap"><div className="empty-state"><div className="empty-icon"><FileText size={22} /></div><p className="empty-title">Sin presupuestos</p><p className="empty-desc">Crea presupuestos y conviértelos en facturas con un clic</p></div></div>
            ) : isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {quotes.map(q => {
                        const s = STATUS[q.status] || STATUS.draft;
                        return (
                            <div key={q.id} className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <strong>{q.quote_number}</strong>
                                    <span className={s.cls}><span className="badge-dot" />{s.label}</span>
                                </div>
                                <div style={{ fontSize: 14 }}>{q.client_name}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                                    <span>{fmtDate(q.issue_date)}</span>
                                    <strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>{fmt(q.total_amount)}</strong>
                                </div>
                                {!q.converted_to_invoice_id && q.status !== 'rejected' && (
                                    <>
                                        <button className="btn btn-primary" style={{ width: '100%', minHeight: 48 }} onClick={() => oneTap(q)}>
                                            <ArrowRight size={16} /> Pasar a factura
                                        </button>
                                        <button className="btn btn-ghost" style={{ width: '100%', minHeight: 44 }} onClick={() => shareWhatsapp(q)}>WhatsApp</button>
                                        <button className="btn btn-ghost" style={{ width: '100%', minHeight: 44 }} onClick={() => { setSigning(q); setSignerName(q.client_name || ''); setSignature(''); }}>Firmar aquí</button>
                                        <label className="btn btn-ghost" style={{ width: '100%', minHeight: 44, textAlign: 'center' }}>
                                            Foto de la obra
                                            <input type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={e => { uploadPhoto(q, e.target.files?.[0]); e.target.value = ''; }} />
                                        </label>
                                    </>
                                )}
                                {q.converted_to_invoice_id && (
                                    <span style={{ fontSize: 13, color: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <CheckCircle size={14} /> Ya pasado a borrador de factura
                                    </span>
                                )}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-ghost" style={{ flex: 1, minHeight: 44 }} onClick={() => { setEditing(q); setShowForm(true); }}>Editar</button>
                                    <button className="btn btn-ghost" style={{ flex: 1, minHeight: 44 }} onClick={() => setToDelete(q)}>Eliminar</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>Número</th><th>Cliente</th><th>Estado</th><th>Emisión</th><th>Expiración</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Acciones</th></tr></thead>
                        <tbody>
                            {quotes.map((q, idx) => {
                                const s = STATUS[q.status] || STATUS.draft;
                                return (
                                    <tr key={q.id} style={{ animationDelay: `${idx * 20}ms` }}>
                                        <td style={{ fontWeight: 600, fontSize: 13 }}>{q.quote_number}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{q.client_name}</td>
                                        <td><span className={s.cls}><span className="badge-dot" />{s.label}</span></td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtDate(q.issue_date)}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtDate(q.expiry_date)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(q.total_amount)}</td>
                                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {!q.converted_to_invoice_id && q.status !== 'rejected' && (
                                                <>
                                                    <button className="action-link" style={{ color: 'var(--secondary)', marginRight: 4 }} onClick={() => oneTap(q)}>
                                                        <ArrowRight size={13} style={{ verticalAlign: 'middle' }} /> Pasar a factura
                                                    </button>
                                                    <button className="action-link" style={{ marginRight: 4 }} onClick={() => setConverting(q)}>Fechas</button>
                                                </>
                                            )}
                                            <button className="action-link" style={{ marginRight: 4 }} onClick={() => shareWhatsapp(q)}>WhatsApp</button>
                                            <button className="action-link" style={{ marginRight: 4 }} onClick={() => { setSigning(q); setSignerName(q.client_name || ''); setSignature(''); }}>Firmar</button>
                                            <label className="action-link" style={{ marginRight: 4 }}>
                                                Foto
                                                <input type="file" accept="image/jpeg,image/png" hidden onChange={e => { uploadPhoto(q, e.target.files?.[0]); e.target.value = ''; }} />
                                            </label>
                                            {q.converted_to_invoice_id && (
                                                <span style={{ fontSize: 11, color: 'var(--secondary)', marginRight: 8, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                                    <CheckCircle size={11} /> Facturado
                                                </span>
                                            )}
                                            <button className="action-link action-link-primary" onClick={() => { setEditing(q); setShowForm(true); }}>Editar</button>
                                            <button className="action-link action-link-danger" style={{ marginLeft: 4 }} onClick={() => setToDelete(q)}>Eliminar</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal open={showForm} size="lg" title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'} onClose={() => { setShowForm(false); setEditing(null); }}>
                <QuoteForm token={token} clients={clients} projects={projects} services={services} initialData={editing}
                    onSubmit={handleSubmit} onCancel={() => { setShowForm(false); setEditing(null); }} />
            </Modal>

            <Modal open={!!toDelete} title="Eliminar presupuesto" onClose={() => setToDelete(null)}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    ¿Eliminar el presupuesto <strong>{toDelete?.quote_number}</strong>?
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setToDelete(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
                </div>
            </Modal>

            <Modal open={!!signing} title={`Firmar — ${signing?.quote_number || ''}`} onClose={() => setSigning(null)}>
                <form onSubmit={e => { e.preventDefault(); saveSignature(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label htmlFor="signer-name">Nombre de quien acepta
                        <input id="signer-name" className="form-input" value={signerName} onChange={e => setSignerName(e.target.value)} required />
                    </label>
                    <p id="sign-help">Firma con el dedo en el recuadro. No crea la factura: eso es el botón de pasar a factura.</p>
                    <SignaturePad onChange={setSignature} />
                    <button className="btn btn-primary" type="submit" style={{ minHeight: 48 }}>Guardar firma</button>
                </form>
            </Modal>

            <Modal open={!!converting} title={`Elegir fechas — ${converting?.quote_number}`} onClose={() => setConverting(null)}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Se creará una factura borrador con todas las líneas del presupuesto.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div className="form-group">
                        <label className="form-label">Fecha de emisión</label>
                        <input type="date" className="form-input" value={convDates.issue_date} onChange={e => setConvDates(f => ({ ...f, issue_date: e.target.value }))} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Fecha de vencimiento</label>
                        <input type="date" className="form-input" value={convDates.due_date} onChange={e => setConvDates(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setConverting(null)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleConvert} style={isMobile ? { width: '100%', minHeight: 48 } : undefined}>
                        <ArrowRight size={14} /> Crear borrador de factura
                    </button>
                </div>
            </Modal>
        </div>
    );
}
