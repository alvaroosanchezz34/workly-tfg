// frontend/src/components/ai/AISmartQuote.jsx
// Botón + panel que genera un presupuesto inteligente con IA
import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { generateSmartQuote } from '../../api/ai';
import { Sparkles, Brain, X, CheckCircle, Lightbulb } from 'lucide-react';

const PROJECT_TYPES = [
    'Diseño web', 'Desarrollo web', 'App móvil', 'E-commerce',
    'SEO / Marketing digital', 'Diseño gráfico', 'Consultoría',
    'Fotografía / Vídeo', 'Redacción / Copywriting', 'Otro',
];

export default function AISmartQuote({ clients = [], onApply }) {
    const { token }      = useContext(AuthContext);
    const [open,         setOpen]         = useState(false);
    const [clientId,     setClientId]     = useState('');
    const [projectType,  setProjectType]  = useState('');
    const [description,  setDescription]  = useState('');
    const [result,       setResult]       = useState(null);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState('');

    const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

    const generate = async () => {
        if (!description.trim()) return;
        setLoading(true); setError(''); setResult(null);
        try {
            const data = await generateSmartQuote(token, {
                client_id:    clientId || null,
                project_type: projectType,
                description,
            });
            setResult(data);
        } catch {
            setError('Error al generar el presupuesto. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const apply = () => {
        if (result?.lines) {
            onApply(result.lines);
            setOpen(false);
            setResult(null);
            setDescription('');
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'linear-gradient(135deg, #059669, #0d9488)',
                    border: 'none', borderRadius: 8, padding: '7px 14px',
                    color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    marginBottom: 12, boxShadow: '0 2px 8px rgba(5,150,105,0.35)',
                }}
            >
                <Brain size={13} /> Presupuesto inteligente IA
            </button>

            {open && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Brain size={18} color="#fff" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>Presupuesto inteligente</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>IA analiza tu historial y sugiere el precio óptimo</div>
                                </div>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Cliente (opcional)</label>
                                <select value={clientId} onChange={e => setClientId(e.target.value)} className="form-select">
                                    <option value="">Sin cliente específico</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tipo de proyecto</label>
                                <select value={projectType} onChange={e => setProjectType(e.target.value)} className="form-select">
                                    <option value="">Seleccionar tipo…</option>
                                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label className="form-label">Describe el proyecto <span style={{ color: 'var(--error)' }}>*</span></label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder='Ej: "Tienda online para venta de ropa artesanal, con pasarela de pago, gestión de stock y panel de administración"'
                                rows={3}
                                className="form-input"
                                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={generate}
                            disabled={loading || !description.trim()}
                            style={{
                                width: '100%', padding: '10px 0', marginBottom: 18,
                                background: loading || !description.trim() ? 'var(--border)' : 'linear-gradient(135deg, #059669, #0d9488)',
                                border: 'none', borderRadius: 10,
                                color: loading || !description.trim() ? 'var(--text-disabled)' : '#fff',
                                fontWeight: 700, fontSize: 14, cursor: loading || !description.trim() ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                        >
                            <Sparkles size={15} />
                            {loading ? 'Analizando y calculando…' : 'Generar presupuesto inteligente'}
                        </button>

                        {error && <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--error)', marginBottom: 14 }}>{error}</div>}

                        {/* Resultado */}
                        {result && (
                            <div>
                                {/* Precio recomendado */}
                                <div style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(13,148,136,0.06))', border: '1.5px solid rgba(5,150,105,0.2)', borderRadius: 12, padding: 18, marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Precio recomendado</div>
                                    <div style={{ fontSize: 36, fontWeight: 800, color: '#059669', marginBottom: 4 }}>{fmt(result.recommended_price)}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        Rango: {fmt(result.price_range?.min)} — {fmt(result.price_range?.max)}
                                        {result.estimated_days > 0 && ` · Estimación: ${result.estimated_days} días`}
                                    </div>
                                    {result.rationale && (
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(5,150,105,0.15)' }}>
                                            {result.rationale}
                                        </div>
                                    )}
                                </div>

                                {/* Líneas */}
                                {result.lines?.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Líneas del presupuesto:</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {result.lines.map((line, i) => (
                                                <div key={i} style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{line.description}</div>
                                                    <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                                                        <span>{line.quantity} ud.</span>
                                                        <span>{fmt(line.unit_price)}/ud.</span>
                                                        <span>IVA {line.tax_rate}%</span>
                                                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--primary)' }}>{fmt(line.total)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tips */}
                                {result.tips?.length > 0 && (
                                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: '#d97706', marginBottom: 8 }}>
                                            <Lightbulb size={13} /> Consejos de la IA
                                        </div>
                                        {result.tips.map((tip, i) => (
                                            <div key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', gap: 6 }}>
                                                <CheckCircle size={12} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} /> {tip}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button type="button" onClick={generate} style={{ flex: 1, padding: '9px 0', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                        Regenerar
                                    </button>
                                    <button type="button" onClick={apply} style={{ flex: 2, padding: '9px 0', background: 'linear-gradient(135deg, #059669, #0d9488)', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', cursor: 'pointer' }}>
                                        Usar estas líneas
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
