// frontend/src/components/ai/OCRExpenseUploader.jsx
// Sube una foto de ticket/factura y la IA extrae los datos automáticamente
import { useState, useContext, useRef } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ocrExpense } from '../../api/ai';
import { Camera, Upload, X, CheckCircle, Sparkles, AlertTriangle } from 'lucide-react';

const CAT_LABELS = {
    software: 'Software', hardware: 'Hardware', oficina: 'Oficina',
    transporte: 'Transporte', marketing: 'Marketing', formacion: 'Formación',
    servicios: 'Servicios', otros: 'Otros',
};

export default function OCRExpenseUploader({ onApply }) {
    const { token }   = useContext(AuthContext);
    const [open,      setOpen]      = useState(false);
    const [preview,   setPreview]   = useState(null);
    const [base64,    setBase64]    = useState(null);
    const [mimeType,  setMimeType]  = useState('image/jpeg');
    const [result,    setResult]    = useState(null);
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState('');
    const inputRef = useRef();

    const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

    const handleFile = file => {
        if (!file) return;
        setMimeType(file.type || 'image/jpeg');
        const reader = new FileReader();
        reader.onload = e => {
            setPreview(e.target.result);
            setBase64(e.target.result.split(',')[1]);
            setResult(null);
            setError('');
        };
        reader.readAsDataURL(file);
    };

    const analyze = async () => {
        if (!base64) return;
        setLoading(true); setError(''); setResult(null);
        try {
            const data = await ocrExpense(token, base64, mimeType);
            setResult(data);
        } catch {
            setError('Error al analizar la imagen. Inténtalo con otra foto más nítida.');
        } finally {
            setLoading(false);
        }
    };

    const apply = () => {
        if (!result) return;
        onApply({
            amount:      result.amount      || 0,
            date:        result.date        || new Date().toISOString().split('T')[0],
            description: result.description || result.supplier || '',
            category:    result.category    || 'otros',
        });
        setOpen(false);
        setPreview(null);
        setBase64(null);
        setResult(null);
    };

    const reset = () => {
        setPreview(null); setBase64(null); setResult(null); setError('');
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'linear-gradient(135deg, #dc2626, #ea580c)',
                    border: 'none', borderRadius: 8, padding: '7px 14px',
                    color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    marginBottom: 12, boxShadow: '0 2px 8px rgba(220,38,38,0.35)',
                }}
            >
                <Camera size={13} /> Escanear ticket con IA
            </button>

            {open && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #dc2626, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Camera size={18} color="#fff" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>OCR de ticket / factura</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>La IA extrae los datos automáticamente</div>
                                </div>
                            </div>
                            <button type="button" onClick={() => { setOpen(false); reset(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Upload area */}
                        {!preview ? (
                            <div
                                onClick={() => inputRef.current?.click()}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                                style={{
                                    border: '2px dashed var(--border)', borderRadius: 14,
                                    padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                                    marginBottom: 18, transition: 'all 0.2s',
                                    background: 'var(--bg)',
                                }}
                            >
                                <Upload size={32} color="var(--text-disabled)" style={{ marginBottom: 12 }} />
                                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Sube una foto del ticket o factura</div>
                                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Arrastra aquí o haz clic para seleccionar</div>
                                <div style={{ fontSize: 11.5, color: 'var(--text-disabled)', marginTop: 6 }}>JPG, PNG, WEBP — máx. 4MB</div>
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={e => handleFile(e.target.files[0])}
                                />
                            </div>
                        ) : (
                            <div style={{ marginBottom: 18 }}>
                                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                                    <img src={preview} alt="ticket" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--border)' }} />
                                    <button
                                        type="button"
                                        onClick={reset}
                                        style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X size={14} color="#fff" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {preview && !result && (
                            <button
                                type="button"
                                onClick={analyze}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '10px 0', marginBottom: 16,
                                    background: loading ? 'var(--border)' : 'linear-gradient(135deg, #dc2626, #ea580c)',
                                    border: 'none', borderRadius: 10,
                                    color: loading ? 'var(--text-disabled)' : '#fff',
                                    fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}
                            >
                                <Sparkles size={15} />
                                {loading ? 'Analizando imagen…' : 'Analizar con IA'}
                            </button>
                        )}

                        {error && <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--error)', marginBottom: 14 }}>{error}</div>}

                        {/* Resultado */}
                        {result && (
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                    <CheckCircle size={16} color="var(--secondary)" />
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>Datos extraídos</span>
                                    {result.confidence === 'low' && (
                                        <span style={{ fontSize: 11.5, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <AlertTriangle size={12} /> Baja confianza — revisa los datos
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                                    {[
                                        { label: 'Importe total', value: result.amount ? fmt(result.amount) : 'No detectado' },
                                        { label: 'IVA', value: result.tax_amount ? `${fmt(result.tax_amount)} (${result.tax_rate}%)` : 'No detectado' },
                                        { label: 'Fecha', value: result.date || 'No detectada' },
                                        { label: 'Proveedor', value: result.supplier || 'No detectado' },
                                        { label: 'Descripción', value: result.description || 'No detectada' },
                                        { label: 'Categoría', value: CAT_LABELS[result.category] || result.category || 'Otros' },
                                    ].map(({ label, value }) => (
                                        <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-disabled)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button type="button" onClick={analyze} style={{ flex: 1, padding: '9px 0', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                        Reanalizar
                                    </button>
                                    <button type="button" onClick={apply} disabled={!result.amount} style={{ flex: 2, padding: '9px 0', background: result.amount ? 'linear-gradient(135deg, #dc2626, #ea580c)' : 'var(--border)', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13.5, color: result.amount ? '#fff' : 'var(--text-disabled)', cursor: result.amount ? 'pointer' : 'not-allowed' }}>
                                        Crear gasto con estos datos
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
