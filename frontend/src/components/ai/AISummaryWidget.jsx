// frontend/src/components/ai/AISummaryWidget.jsx
import { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { getBusinessSummary } from '../../api/ai';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export default function AISummaryWidget() {
    const { token } = useContext(AuthContext);
    const [summary,   setSummary]   = useState('');
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState('');
    const [collapsed, setCollapsed] = useState(false);
    const [generated, setGenerated] = useState(false);

    const generate = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getBusinessSummary(token);
            setSummary(data.summary);
            setGenerated(true);
            setCollapsed(false);
        } catch {
            setError('No se pudo generar el resumen. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            background:   'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            borderRadius: 14,
            padding:      '20px 22px',
            marginBottom: 24,
            position:     'relative',
            overflow:     'hidden',
            border:       '1px solid rgba(129,140,248,0.2)',
        }}>
            {/* Decorative glow */}
            <div style={{
                position: 'absolute', top: -40, right: -40,
                width: 140, height: 140,
                background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: generated && !collapsed ? 14 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'rgba(99,102,241,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Sparkles size={16} color="#818cf8" />
                    </div>
                    <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#e2e8f0' }}>
                            Resumen IA de tu negocio
                        </div>
                        {!generated && (
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                                Análisis inteligente de tu actividad
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {generated && (
                        <button
                            onClick={() => setCollapsed(c => !c)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}
                        >
                            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    )}
                    <button
                        onClick={generate}
                        disabled={loading}
                        style={{
                            display:      'flex',
                            alignItems:   'center',
                            gap:          6,
                            background:   loading ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.35)',
                            border:       '1px solid rgba(129,140,248,0.4)',
                            borderRadius: 8,
                            padding:      '6px 14px',
                            color:        '#c7d2fe',
                            fontSize:     12.5,
                            fontWeight:   600,
                            cursor:       loading ? 'not-allowed' : 'pointer',
                            transition:   'all 0.2s',
                        }}
                    >
                        <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        {loading ? 'Analizando…' : generated ? 'Actualizar' : 'Generar análisis'}
                    </button>
                </div>
            </div>

            {/* Content */}
            {!collapsed && (
                <>
                    {loading && (
                        <div style={{ marginTop: 14 }}>
                            <div style={{ height: 11, background: 'rgba(255,255,255,0.1)', borderRadius: 6, marginBottom: 8, width: '90%' }} />
                            <div style={{ height: 11, background: 'rgba(255,255,255,0.07)', borderRadius: 6, marginBottom: 8, width: '75%' }} />
                            <div style={{ height: 11, background: 'rgba(255,255,255,0.05)', borderRadius: 6, width: '60%' }} />
                        </div>
                    )}
                    {!loading && summary && (
                        <p style={{
                            fontSize: 14, lineHeight: 1.65,
                            color:    'rgba(226,232,240,0.88)',
                            margin:   0,
                        }}>
                            {summary}
                        </p>
                    )}
                    {!loading && error && (
                        <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>
                    )}
                    {!loading && !summary && !error && (
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0, fontStyle: 'italic' }}>
                            Pulsa "Generar análisis" para obtener un resumen inteligente de tu negocio.
                        </p>
                    )}
                </>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
