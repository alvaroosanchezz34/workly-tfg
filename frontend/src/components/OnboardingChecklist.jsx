import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Circle, X, ChevronRight, Sparkles } from 'lucide-react';

const STEPS = [
    { id: 'client',   label: 'Crea tu primer cliente',  desc: 'Añade un cliente para empezar a facturar.',       path: '/clients',  emoji: '👥' },
    { id: 'project',  label: 'Abre un proyecto',         desc: 'Asocia un proyecto a tu cliente.',                path: '/projects', emoji: '📁' },
    { id: 'invoice',  label: 'Genera una factura',       desc: 'Crea tu primera factura profesional en PDF.',     path: '/invoices', emoji: '🧾' },
    { id: 'expense',  label: 'Registra un gasto',        desc: 'Lleva el control de tus gastos deducibles.',      path: '/expenses', emoji: '💸' },
    { id: 'profile',  label: 'Completa tu perfil',       desc: 'Añade tu logo o datos de empresa.',               path: '/profile',  emoji: '👤' },
];

export default function OnboardingChecklist({ onClose }) {
    const navigate  = useNavigate();
    const [done, setDone] = useState(() => {
        try { return JSON.parse(localStorage.getItem('workly_onboarding') || '[]'); }
        catch { return []; }
    });

    const completed = done.length;
    const total     = STEPS.length;
    const pct       = Math.round((completed / total) * 100);
    const allDone   = completed === total;

    const mark = id => {
        const next = done.includes(id) ? done.filter(d => d !== id) : [...done, id];
        setDone(next);
        localStorage.setItem('workly_onboarding', JSON.stringify(next));
    };

    const go = (path, id) => {
        mark(id);
        navigate(path);
        onClose?.();
    };

    return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, width: 340, background: 'var(--card-bg, #fff)', border: '1.5px solid var(--border, #E0E0E0)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden', animation: 'slideUp 0.3s ease' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1976D2,#0288D1)', padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                            <Sparkles size={15} color="#FFA726" />
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                                {allDone ? '¡Todo listo! 🎉' : 'Primeros pasos'}
                            </span>
                        </div>
                        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                            {allDone ? 'Ya dominas Workly.' : `${completed} de ${total} completados`}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                        <X size={14} />
                    </button>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 14, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: allDone ? '#4CAF50' : '#fff', borderRadius: 99, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{pct}%</div>
            </div>

            {/* Steps */}
            <div style={{ padding: '8px 0' }}>
                {STEPS.map((step, i) => {
                    const isDone = done.includes(step.id);
                    return (
                        <div key={step.id}
                            onClick={() => go(step.path, step.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', cursor: 'pointer', transition: 'background 0.12s', borderBottom: i < STEPS.length - 1 ? '1px solid var(--border, #F0F0F0)' : 'none' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg, #F8FAFF)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                            <div style={{ fontSize: 20, flexShrink: 0 }}>{step.emoji}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: isDone ? 500 : 600, color: isDone ? 'var(--text-secondary, #9E9E9E)' : 'var(--text-primary, #212121)', textDecoration: isDone ? 'line-through' : 'none' }}>
                                    {step.label}
                                </div>
                                {!isDone && <div style={{ fontSize: 11.5, color: 'var(--text-disabled, #BDBDBD)', marginTop: 2 }}>{step.desc}</div>}
                            </div>
                            {isDone
                                ? <CheckCircle size={18} color="#4CAF50" style={{ flexShrink: 0 }} />
                                : <ChevronRight size={16} color="var(--text-disabled, #BDBDBD)" style={{ flexShrink: 0 }} />
                            }
                        </div>
                    );
                })}
            </div>

            {allDone && (
                <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border, #F0F0F0)', textAlign: 'center' }}>
                    <button onClick={onClose} style={{ width: '100%', padding: '10px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                        ¡Empezar a usar Workly! 🚀
                    </button>
                </div>
            )}
        </div>
    );
}