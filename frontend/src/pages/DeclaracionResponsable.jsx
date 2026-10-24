import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { getDeclaracionResponsable } from '../api/verifactu';

const blocks = markdown => String(markdown || '').split(/\n{2,}/);

export default function DeclaracionResponsable() {
    const { token } = useContext(AuthContext);
    const [text, setText] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        getDeclaracionResponsable(token)
            .then(data => setText(data.markdown || ''))
            .catch(err => setError(err.message));
    }, [token]);

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Declaración responsable</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                            Borrador para que lo revise un asesor. No está firmado.
                            {' '}<Link to="/verifactu">Volver a VeriFactu</Link>
                        </p>
                    </div>
                </div>
                {error && <div className="alert alert-error">{error}</div>}
                <article style={{ maxWidth: 760, fontSize: 15, lineHeight: 1.55 }}>
                    {blocks(text).map((block, index) => {
                        const trimmed = block.trim();
                        if (!trimmed) return null;
                        if (trimmed.startsWith('# ')) {
                            return <h2 key={index} style={{ fontSize: 20, margin: '18px 0 8px' }}>{trimmed.replace(/^#\s+/, '')}</h2>;
                        }
                        if (trimmed.startsWith('## ')) {
                            return <h3 key={index} style={{ fontSize: 16, margin: '16px 0 8px' }}>{trimmed.replace(/^##\s+/, '')}</h3>;
                        }
                        if (trimmed.startsWith('DECLARACIÓN RESPONSABLE')) {
                            return <h2 key={index} style={{ fontSize: 18, margin: '18px 0 8px' }}>{trimmed}</h2>;
                        }
                        return <p key={index} style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{trimmed}</p>;
                    })}
                </article>
            </main>
        </div>
    );
}
