// frontend/src/components/ai/AIInvoiceGenerator.jsx
// Se integra dentro de InvoiceForm para generar líneas con IA
import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { generateInvoiceLines } from '../../api/ai';
import { Sparkles, Wand2, X } from 'lucide-react';

export default function AIInvoiceGenerator({ onApply }) {
    const { token }  = useContext(AuthContext);
    const [open,     setOpen]     = useState(false);
    const [desc,     setDesc]     = useState('');
    const [lines,    setLines]    = useState([]);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState('');

    const generate = async () => {
        if (!desc.trim()) return;
        setLoading(true);
        setError('');
        setLines([]);
        try {
            const data = await generateInvoiceLines(token, desc);
            if (data.lines?.length) setLines(data.lines);
            else setError('No se pudieron generar líneas. Intenta describir mejor el trabajo.');
        } catch {
            setError('Error al conectar con la IA. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const apply = () => {
        onApply(lines);
        setOpen(false);
        setDesc('');
        setLines([]);
    };

    const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

    return (
        <>
            {/* Botón trigger */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          6,
                    background:   'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    border:       'none',
                    borderRadius: 8,
                    padding:      '7px 14px',
                    color:        '#fff',
                    fontSize:     12.5,
                    fontWeight:   600,
                    cursor:       'pointer',
                    marginBottom: 12,
                    boxShadow:    '0 2px 8px rgba(99,102,241,0.35)',
                }}
            >
                <Sparkles size={13} /> Generar con IA
            </button>

            {/* Panel */}
            {open && (
                <div style={{
                    position:     'fixed',
                    inset:        0,
                    background:   'rgba(0,0,0,0.55)',
                    zIndex:       1000,
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    padding:      20,
                }}>
                    <div style={{
                        background:   'var(--card-bg)',
                        borderRadius: 16,
                        padding:      28,
                        width:        '100%',
                        maxWidth:     560,
                        boxShadow:    '0 24px 60px rgba(0,0,0,0.25)',
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Wand2 size={18} color="#fff" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>Generador de líneas IA</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Describe el trabajo y la IA crea las líneas</div>
                                </div>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar generador de líneas con IA" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Input */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                                Describe el trabajo o servicio
                            </label>
                            <textarea
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                                placeholder='Ej: "Diseño web para restaurante con 5 páginas + mantenimiento mensual de 3 horas"'
                                rows={3}
                                style={{
                                    width: '100%', borderRadius: 10, border: '1.5px solid var(--border)',
                                    padding: '10px 14px', fontSize: 13.5, resize: 'vertical',
                                    background: 'var(--bg)', color: 'var(--text)',
                                    fontFamily: 'inherit', boxSizing: 'border-box',
                                    outline: 'none',
                                }}
                                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) generate(); }}
                            />
                            <div style={{ fontSize: 11.5, color: 'var(--text-disabled)', marginTop: 4 }}>
                                Ctrl+Enter para generar
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={generate}
                            disabled={loading || !desc.trim()}
                            style={{
                                width: '100%', padding: '10px 0',
                                background: loading || !desc.trim() ? 'var(--border)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                border: 'none', borderRadius: 10,
                                color: loading || !desc.trim() ? 'var(--text-disabled)' : '#fff',
                                fontWeight: 700, fontSize: 14, cursor: loading || !desc.trim() ? 'not-allowed' : 'pointer',
                                marginBottom: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            }}
                        >
                            <Sparkles size={15} />
                            {loading ? 'Generando líneas…' : 'Generar líneas de factura'}
                        </button>

                        {error && (
                            <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--error)', marginBottom: 14 }}>
                                {error}
                            </div>
                        )}

                        {/* Líneas generadas */}
                        {lines.length > 0 && (
                            <div>
                                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                                    Líneas generadas — revisa y ajusta si es necesario:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                                    {lines.map((line, i) => (
                                        <div key={i} style={{
                                            background: 'var(--bg)', borderRadius: 10,
                                            padding: '12px 14px', border: '1px solid var(--border)',
                                        }}>
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
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button type="button" onClick={generate} style={{ flex: 1, padding: '9px 0', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                        Regenerar
                                    </button>
                                    <button type="button" onClick={apply} style={{ flex: 2, padding: '9px 0', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: '#fff', cursor: 'pointer' }}>
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
