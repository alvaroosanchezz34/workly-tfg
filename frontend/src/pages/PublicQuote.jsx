import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;
const fmt = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);

export default function PublicQuote() {
    const { token } = useParams();
    const canvasRef = useRef(null);
    const drawing = useRef(false);
    const [quote, setQuote] = useState(null);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [done, setDone] = useState('');

    useEffect(() => {
        fetch(`${API}/public/quote/${token}`)
            .then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'No encontrado');
                setQuote(data);
            })
            .catch(err => setError(err.message));
    }, [token]);

    const pointOf = event => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const accept = async () => {
        const signature = canvasRef.current?.toDataURL('image/png');
        const res = await fetch(`${API}/public/quote/${token}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signerName: name, signature }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message); return; }
        setDone(data.message);
    };

    if (error && !quote) return <main style={{ padding: 24 }}><p>{error}</p></main>;
    if (!quote) return <main style={{ padding: 24 }}><p>Cargando presupuesto…</p></main>;

    return (
        <main style={{ maxWidth: 560, margin: '0 auto', padding: 20, fontFamily: 'inherit' }}>
            <p style={{ fontSize: 13, color: '#3E4462' }}>Presupuesto</p>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>{quote.quote_number}</h1>
            <p>Para {quote.client_name}</p>
            <p style={{ fontSize: 22, fontWeight: 800, margin: '12px 0' }}>{fmt(quote.total_amount)}</p>
            <ul>
                {(quote.items || []).map(item => (
                    <li key={item.description}>{item.description} · {item.quantity} × {fmt(item.unit_price)}</li>
                ))}
            </ul>
            {done ? <p role="status">{done}</p> : (
                <form onSubmit={e => { e.preventDefault(); accept(); }} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label htmlFor="signer">Tu nombre
                        <input id="signer" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
                    </label>
                    <p id="sign-help">Firma con el dedo en el recuadro.</p>
                    <canvas
                        ref={canvasRef}
                        width={480}
                        height={160}
                        aria-label="Zona de firma"
                        aria-describedby="sign-help"
                        style={{ width: '100%', border: '1px solid #C5C8D8', borderRadius: 12, touchAction: 'none', background: '#fff' }}
                        onPointerDown={event => {
                            drawing.current = true;
                            event.currentTarget.setPointerCapture(event.pointerId);
                            const ctx = canvasRef.current.getContext('2d');
                            const p = pointOf(event);
                            ctx.beginPath();
                            ctx.moveTo(p.x, p.y);
                        }}
                        onPointerMove={event => {
                            if (!drawing.current) return;
                            const ctx = canvasRef.current.getContext('2d');
                            const p = pointOf(event);
                            ctx.lineWidth = 2.5;
                            ctx.lineCap = 'round';
                            ctx.strokeStyle = '#1C2033';
                            ctx.lineTo(p.x, p.y);
                            ctx.stroke();
                        }}
                        onPointerUp={() => { drawing.current = false; }}
                        onPointerCancel={() => { drawing.current = false; }}
                    />
                    {error && <p role="alert">{error}</p>}
                    <button type="submit" className="btn btn-primary" style={{ minHeight: 48 }}>Aceptar presupuesto</button>
                </form>
            )}
        </main>
    );
}
