// frontend/src/components/ai/AIChat.jsx
// Asistente financiero tipo mini-chat integrado en el Dashboard
import { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { sendAIChat } from '../../api/ai';
import { MessageSquare, Send, X, Bot, User, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
    '¿Cuánto he ganado este mes?',
    '¿Qué clientes me deben dinero?',
    '¿Cuál es mi beneficio neto este año?',
    '¿Qué gasto puedo reducir?',
    '¿Cuántas facturas tengo pendientes?',
];

export default function AIChat() {
    const { token }   = useContext(AuthContext);
    const [open,      setOpen]      = useState(false);
    const [messages,  setMessages]  = useState([]);
    const [input,     setInput]     = useState('');
    const [loading,   setLoading]   = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async (text = input) => {
        const msg = text.trim();
        if (!msg || loading) return;
        setInput('');

        const userMsg = { role: 'user', content: msg };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const history = messages.slice(-6);
            const data    = await sendAIChat(token, msg, history);
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.' }]);
        } finally {
            setLoading(false);
        }
    };

    const clear = () => setMessages([]);

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 900,
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
                    transition: 'transform 0.2s',
                }}
                title="Asistente financiero IA"
            >
                {open ? <X size={22} color="#fff" /> : <Sparkles size={22} color="#fff" />}
            </button>

            {/* Chat window */}
            {open && (
                <div style={{
                    position: 'fixed', bottom: 88, right: 24, zIndex: 900,
                    width: 380, height: 520,
                    background: 'var(--card-bg)',
                    borderRadius: 18,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                    border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        padding: '14px 18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={18} color="#fff" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>Asistente financiero</div>
                                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)' }}>Pregúntame sobre tu negocio</div>
                            </div>
                        </div>
                        {messages.length > 0 && (
                            <button onClick={clear} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 11.5, cursor: 'pointer' }}>
                                Limpiar
                            </button>
                        )}
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 8px' }}>
                        {messages.length === 0 && (
                            <div>
                                <div style={{ textAlign: 'center', padding: '16px 0 20px', color: 'var(--text-secondary)', fontSize: 13 }}>
                                    <Sparkles size={28} color="var(--primary)" style={{ marginBottom: 10 }} />
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>¿En qué puedo ayudarte?</div>
                                    <div style={{ fontSize: 12 }}>Tengo acceso a todos tus datos financieros</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {SUGGESTIONS.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => send(s)}
                                            style={{
                                                background: 'var(--bg)', border: '1px solid var(--border)',
                                                borderRadius: 10, padding: '9px 14px',
                                                fontSize: 12.5, color: 'var(--text-secondary)',
                                                cursor: 'pointer', textAlign: 'left',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                                marginBottom: 10,
                                gap: 8,
                                alignItems: 'flex-end',
                            }}>
                                {m.role === 'assistant' && (
                                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Bot size={13} color="#fff" />
                                    </div>
                                )}
                                <div style={{
                                    maxWidth: '78%',
                                    background: m.role === 'user'
                                        ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                                        : 'var(--bg)',
                                    color: m.role === 'user' ? '#fff' : 'var(--text)',
                                    borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                    padding: '9px 13px',
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                    border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                                }}>
                                    {m.content}
                                </div>
                                {m.role === 'user' && (
                                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <User size={13} color="#fff" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Bot size={13} color="#fff" />
                                </div>
                                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px', padding: '12px 16px', display: 'flex', gap: 5 }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{
                                            width: 7, height: 7, borderRadius: '50%',
                                            background: 'var(--primary)',
                                            animation: `bounce 1s infinite ${i * 0.15}s`,
                                        }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div style={{ padding: '10px 14px 14px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                                placeholder="Escribe tu pregunta…"
                                style={{
                                    flex: 1, border: '1.5px solid var(--border)', borderRadius: 10,
                                    padding: '9px 14px', fontSize: 13,
                                    background: 'var(--bg)', color: 'var(--text)',
                                    outline: 'none', fontFamily: 'inherit',
                                }}
                            />
                            <button
                                onClick={() => send()}
                                disabled={!input.trim() || loading}
                                style={{
                                    width: 38, height: 38,
                                    background: input.trim() && !loading ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'var(--border)',
                                    border: 'none', borderRadius: 10, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                <Send size={16} color={input.trim() && !loading ? '#fff' : 'var(--text-disabled)'} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes bounce {
                    0%, 80%, 100% { transform: translateY(0); }
                    40% { transform: translateY(-6px); }
                }
            `}</style>
        </>
    );
}
