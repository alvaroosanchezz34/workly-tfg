// frontend/src/pages/PublicInvoice.jsx
// Página pública — NO requiere autenticación
// Ruta: /p/:token  (añadir en App.jsx sin PrivateRoute)

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, AlertTriangle, FileText, Download, Building2, Mail, Phone, CreditCard, XCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
const fmtN    = v => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(v ?? 0);

const STATUS = {
    draft:   { label: 'Borrador', icon: <Clock size={14}/>,         bg: '#F5F5F5',                   color: '#616161' },
    sent:    { label: 'Enviada',  icon: <FileText size={14}/>,      bg: '#E1F5FE',                   color: '#0288D1' },
    paid:    { label: 'Pagada',   icon: <CheckCircle size={14}/>,   bg: '#E8F5E9',                   color: '#2E7D32' },
    overdue: { label: 'Vencida',  icon: <AlertTriangle size={14}/>, bg: '#FFEBEE',                   color: '#C62828' },
    void:    { label: 'Anulada',  icon: <XCircle size={14}/>,       bg: '#FFEBEE',                   color: '#C62828' },
};

export default function PublicInvoice() {
    const { token }  = useParams();
    const [searchParams] = useSearchParams();
    const [data,     setData]    = useState(null);
    const [loading,  setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [paying,   setPaying]  = useState(false);
    const [payError, setPayError] = useState('');
    const paymentResult = searchParams.get('payment'); // 'success' | 'cancelled' | null

    useEffect(() => {
        fetch(`${API}/public/invoice/${token}`)
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(setData)
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [token, paymentResult]);

    const handlePay = async () => {
        setPaying(true); setPayError('');
        try {
            const res = await fetch(`${API}/public/invoice/${token}/checkout`, { method: 'POST' });
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Error al iniciar el pago');
            window.location.href = body.url;
        } catch (err) {
            setPayError(err.message);
            setPaying(false);
        }
    };

    if (loading) return (
        <div style={pageStyle}>
            <div style={cardStyle}>
                {[...Array(4)].map((_, i) => (
                    <div key={i} style={{
                        height: i === 0 ? 24 : 14,
                        background: '#E0E0E0',
                        borderRadius: 6,
                        marginBottom: 14,
                        width: ['40%', '60%', '80%', '55%'][i],
                        animation: 'pulse 1.4s ease-in-out infinite',
                    }} />
                ))}
            </div>
        </div>
    );

    if (notFound) return (
        <div style={pageStyle}>
            <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 40px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#212121', marginBottom: 8 }}>
                    Factura no encontrada
                </h2>
                <p style={{ color: '#9E9E9E', fontSize: 14 }}>
                    El enlace puede haber expirado o ser incorrecto.
                </p>
            </div>
        </div>
    );

    const { invoice_number, issue_date, due_date, status, total_amount, paid_amount, payment_status, notes, client, issuer, items, verifactu_legend, verifactu_qr_url, irpf_amount, irpf_rate, equivalence_surcharge_amount } = data;
    const st = STATUS[status] || STATUS.sent;
    const pending = Math.round((Number(total_amount) - Number(paid_amount || 0)) * 100) / 100;
    const canPay = status !== 'draft' && status !== 'void' && payment_status !== 'paid' && pending > 0;

    return (
        <div style={pageStyle}>

            {/* ── CARD PRINCIPAL ── */}
            <div style={cardStyle}>

                {/* Cabecera azul */}
                <div style={{
                    background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                    borderRadius: '14px 14px 0 0',
                    padding: '28px 32px',
                    marginBottom: 0,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                                FACTURA
                            </div>
                            <div style={{ color: '#FFFFFF', fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                                {invoice_number || 'Borrador'}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }}>
                                {issuer.name}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: st.bg, color: st.color,
                            padding: '6px 12px', borderRadius: 99,
                            fontSize: 12, fontWeight: 700,
                        }}>
                            {st.icon} {st.label}
                        </div>
                    </div>
                </div>

                {/* Cuerpo */}
                <div style={{ padding: '28px 32px' }}>

                    {paymentResult === 'success' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#E8F5E9', border: '1px solid #A5D6A7', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
                            <CheckCircle size={18} color="#2E7D32" />
                            <span style={{ fontSize: 13.5, color: '#2E7D32', fontWeight: 600 }}>
                                {payment_status === 'paid' ? '¡Pago recibido! Gracias.' : 'Pago recibido. Puede tardar unos segundos en reflejarse.'}
                            </span>
                        </div>
                    )}
                    {paymentResult === 'cancelled' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF3E0', border: '1px solid #FFCC80', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
                            <XCircle size={18} color="#E65100" />
                            <span style={{ fontSize: 13.5, color: '#E65100', fontWeight: 600 }}>Pago cancelado. Puedes intentarlo de nuevo cuando quieras.</span>
                        </div>
                    )}

                    {/* Emisor → Cliente | Fechas */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>

                        {/* Datos cliente */}
                        <div>
                            <div style={sectionLabel}>Facturar a</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#212121', marginBottom: 4 }}>{client.name}</div>
                            {client.company  && <InfoRow icon={<Building2 size={11}/>}>{client.company}</InfoRow>}
                            {client.email    && <InfoRow icon={<Mail size={11}/>}><a href={`mailto:${client.email}`} style={{ color: '#1976D2', textDecoration: 'none' }}>{client.email}</a></InfoRow>}
                            {client.phone    && <InfoRow icon={<Phone size={11}/>}>{client.phone}</InfoRow>}
                            {client.document && <InfoRow icon={null}>NIF/CIF: {client.document}</InfoRow>}
                        </div>

                        {/* Fechas */}
                        <div>
                            <div style={sectionLabel}>Detalles</div>
                            <DateRow label="Fecha de emisión"     value={fmtDate(issue_date)} />
                            <DateRow label="Fecha de vencimiento" value={fmtDate(due_date)} alert={status === 'overdue'} />
                            {issuer.email && <DateRow label="Emisor" value={issuer.email} />}
                        </div>
                    </div>

                    {/* Tabla líneas */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={sectionLabel}>Líneas de factura</div>
                        <div style={{ border: '1.5px solid #E0E0E0', borderRadius: 10, overflow: 'hidden' }}>
                            {/* Cabecera tabla */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 80px 110px 100px',
                                background: '#1976D2', padding: '10px 16px',
                            }}>
                                {['DESCRIPCIÓN', 'CANT.', 'PRECIO/U', 'TOTAL'].map((h, i) => (
                                    <div key={h} style={{
                                        fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                                        letterSpacing: '0.08em',
                                        textAlign: i > 0 ? 'right' : 'left',
                                    }}>{h}</div>
                                ))}
                            </div>

                            {/* Filas */}
                            {items.map((item, i) => (
                                <div
                                    key={item.id}
                                    style={{
                                        display: 'grid', gridTemplateColumns: '1fr 80px 110px 100px',
                                        padding: '12px 16px',
                                        background: i % 2 === 0 ? '#FAFBFF' : '#FFFFFF',
                                        borderTop: '1px solid #F0F0F0',
                                    }}
                                >
                                    <div style={{ fontSize: 13, color: '#212121' }}>{item.description}</div>
                                    <div style={{ fontSize: 13, color: '#616161', textAlign: 'right' }}>
                                        {Number(item.quantity) % 1 === 0 ? item.quantity : Number(item.quantity).toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: 13, color: '#616161', textAlign: 'right' }}>
                                        {fmtN(item.unit_price)} €
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#212121', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                        {fmtN(item.total)} €
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, marginBottom: notes ? 24 : 0 }}>
                        <div style={{
                            background: '#1976D2', borderRadius: 10,
                            padding: '14px 24px',
                            display: 'flex', alignItems: 'center', gap: 24,
                            minWidth: 260,
                        }}>
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Total
                            </div>
                            <div style={{ flex: 1, textAlign: 'right', fontSize: 24, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                                {fmt(total_amount)}
                            </div>
                        </div>

                        {payment_status === 'paid' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2E7D32', fontSize: 13, fontWeight: 700 }}>
                                <CheckCircle size={15}/> Factura pagada
                            </div>
                        ) : canPay ? (
                            <>
                                {payError && <div style={{ fontSize: 12.5, color: '#C62828' }}>{payError}</div>}
                                <button
                                    onClick={handlePay}
                                    disabled={paying}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        background: '#2E7D32', color: '#fff', border: 'none',
                                        borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700,
                                        cursor: paying ? 'default' : 'pointer', opacity: paying ? 0.7 : 1,
                                    }}
                                >
                                    <CreditCard size={16}/> {paying ? 'Redirigiendo…' : `Pagar ${fmt(pending)} ahora`}
                                </button>
                            </>
                        ) : null}
                    </div>

                    {(verifactu_qr_url || verifactu_legend) && (
                        <div style={{ marginTop: 16, padding: '12px 14px', border: '1px dashed #90CAF9', borderRadius: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1565C0' }}>QR tributario:</div>
                            {verifactu_legend && <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{verifactu_legend}</div>}
                        </div>
                    )}
                    {(Number(equivalence_surcharge_amount) > 0 || Number(irpf_amount) > 0) && (
                        <div style={{ marginTop: 12, fontSize: 13, color: '#616161', textAlign: 'right' }}>
                            {Number(equivalence_surcharge_amount) > 0 && <div>Recargo de equivalencia: {fmt(equivalence_surcharge_amount)}</div>}
                            {Number(irpf_amount) > 0 && <div>IRPF {irpf_rate}%: -{fmt(irpf_amount)}</div>}
                        </div>
                    )}

                    {/* Notas */}
                    {notes && (
                        <div style={{
                            background: '#F8F9FF', border: '1px solid #E3E8F0',
                            borderRadius: 8, padding: '14px 16px',
                        }}>
                            <div style={sectionLabel}>Notas y condiciones</div>
                            <p style={{ fontSize: 13, color: '#616161', margin: 0, lineHeight: 1.6 }}>{notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    borderTop: '1px solid #F0F0F0',
                    padding: '16px 32px',
                    display: 'flex', justifyContent: 'center',
                    background: '#FAFBFF',
                    borderRadius: '0 0 14px 14px',
                }}>
                    <div style={{ fontSize: 11.5, color: '#9E9E9E', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>⚡</span>
                        Factura gestionada con <strong style={{ color: '#1976D2' }}>Workly</strong>
                    </div>
                </div>
            </div>

            {/* Print styles */}
            <style>{`
                @media print {
                    body { background: white !important; }
                    button { display: none !important; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
const InfoRow = ({ icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#616161', marginBottom: 3 }}>
        {icon && <span style={{ color: '#9E9E9E' }}>{icon}</span>}
        {children}
    </div>
);

const DateRow = ({ label, value, alert }) => (
    <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10.5, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: alert ? '#C62828' : '#212121' }}>{value}</div>
    </div>
);

// ── Estilos base ──────────────────────────────────────────────────────────────
const pageStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #EBF3FB 0%, #F5F0FF 100%)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '40px 16px',
    fontFamily: "'Inter', -apple-system, sans-serif",
};

const cardStyle = {
    width: '100%', maxWidth: 680,
    background: '#FFFFFF',
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
    overflow: 'hidden',
};

const sectionLabel = {
    fontSize: 10, fontWeight: 700,
    color: '#9E9E9E',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: 8,
};