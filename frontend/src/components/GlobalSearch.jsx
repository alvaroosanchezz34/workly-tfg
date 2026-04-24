import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, FolderOpen, FileText, X } from 'lucide-react';
import { fetchWithAuth } from '../context/fetchWithAuth';

const API = import.meta.env.VITE_API_URL;

const TYPE_META = {
    client:  { icon: <Users size={14} />,      color: 'var(--primary)',   label: 'Cliente',  path: id => `/clients/${id}` },
    project: { icon: <FolderOpen size={14} />,  color: 'var(--secondary)', label: 'Proyecto', path: () => `/projects` },
    invoice: { icon: <FileText size={14} />,    color: 'var(--warning)',   label: 'Factura',  path: () => `/invoices` },
};

export default function GlobalSearch({ token, onClose }) {
    const [query,   setQuery]   = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [active,  setActive]  = useState(0);
    const inputRef  = useRef(null);
    const navigate  = useNavigate();

    useEffect(() => { inputRef.current?.focus(); }, []);

    // Cerrar con Escape
    useEffect(() => {
        const handle = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [onClose]);

    // Búsqueda con debounce
    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const q = encodeURIComponent(query.trim());
                const [cli, proj, inv] = await Promise.all([
                    fetchWithAuth(`${API}/clients?search=${q}`, token).then(r => r.json()).catch(() => []),
                    fetchWithAuth(`${API}/projects?search=${q}`, token).then(r => r.json()).catch(() => []),
                    fetchWithAuth(`${API}/invoices?search=${q}`, token).then(r => r.json()).catch(() => []),
                ]);
                const all = [
                    ...(Array.isArray(cli)  ? cli.slice(0,4).map(c => ({ type: 'client',  id: c.id, label: c.name,           sub: c.company || c.email })) : []),
                    ...(Array.isArray(proj) ? proj.slice(0,4).map(p => ({ type: 'project', id: p.id, label: p.title,          sub: p.client_name })) : []),
                    ...(Array.isArray(inv)  ? inv.slice(0,3).map(i => ({ type: 'invoice', id: i.id, label: i.invoice_number, sub: i.client_name })) : []),
                ];
                setResults(all);
                setActive(0);
            } finally { setLoading(false); }
        }, 280);
        return () => clearTimeout(t);
    }, [query, token]);

    // Navegar con teclado
    useEffect(() => {
        const handle = e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
            if (e.key === 'Enter' && results[active]) { go(results[active]); }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [results, active]);

    const go = item => {
        const meta = TYPE_META[item.type];
        navigate(meta.path(item.id));
        onClose();
    };

    return (
        <div className="global-search-backdrop" onClick={onClose}>
            <div className="global-search-box" onClick={e => e.stopPropagation()}>
                {/* Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}>
                    <Search size={18} color="var(--text-disabled)" style={{ flexShrink: 0 }} />
                    <input
                        ref={inputRef}
                        className="global-search-input"
                        placeholder="Buscar clientes, proyectos, facturas…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    {query && (
                        <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', display: 'flex' }}>
                            <X size={16} />
                        </button>
                    )}
                    <kbd style={{ fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', color: 'var(--text-disabled)', flexShrink: 0 }}>Esc</kbd>
                </div>

                {/* Resultados */}
                {loading && (
                    <div style={{ padding: '16px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-disabled)' }}>Buscando…</div>
                )}

                {!loading && query.length >= 2 && results.length === 0 && (
                    <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-disabled)' }}>
                        Sin resultados para "<strong>{query}</strong>"
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div>
                        {results.map((r, i) => {
                            const meta = TYPE_META[r.type];
                            return (
                                <div key={`${r.type}-${r.id}`}
                                    className={`global-search-result${i === active ? ' active' : ''}`}
                                    onClick={() => go(r)}
                                    onMouseEnter={() => setActive(i)}
                                >
                                    <div style={{ width: 30, height: 30, borderRadius: 7, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, flexShrink: 0 }}>
                                        {meta.icon}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
                                        {r.sub && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1 }}>{r.sub}</div>}
                                    </div>
                                    <span style={{ fontSize: 10.5, fontWeight: 600, color: meta.color, background: `${meta.color}18`, padding: '2px 7px', borderRadius: 99, flexShrink: 0 }}>
                                        {meta.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Hint */}
                {query.length < 2 && (
                    <div style={{ padding: '14px 16px', display: 'flex', gap: 16, borderTop: '1px solid var(--border)' }}>
                        {[
                            { icon: <Users size={12}/>, text: 'Clientes' },
                            { icon: <FolderOpen size={12}/>, text: 'Proyectos' },
                            { icon: <FileText size={12}/>, text: 'Facturas' },
                        ].map(h => (
                            <span key={h.text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-disabled)' }}>
                                {h.icon} {h.text}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}