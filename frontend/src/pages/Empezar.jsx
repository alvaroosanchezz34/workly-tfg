import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { fetchWithAuth } from '../context/fetchWithAuth';
import { useFeedback } from '../context/FeedbackContext';
import Sidebar from '../components/Sidebar';

const API = import.meta.env.VITE_API_URL;

export default function Empezar() {
    const { token } = useContext(AuthContext);
    const { toast } = useFeedback();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [fiscal, setFiscal] = useState({ legal_name: '', tax_id: '', fiscal_address: '' });
    const [series, setSeries] = useState('FAC');
    const [client, setClient] = useState({ name: '', phone: '' });

    const saveFiscal = async () => {
        const res = await fetchWithAuth(`${API}/invoices/issuer`, token, { method: 'PUT', body: JSON.stringify(fiscal) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'No se ha guardado');
    };

    const saveSeries = async () => {
        const prefix = series.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'FAC';
        await fetchWithAuth(`${API}/invoices/settings`, token);
        const res = await fetchWithAuth(`${API}/invoices/settings`, token, {
            method: 'PUT',
            body: JSON.stringify({ prefix, padding: 4, reset_yearly: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'No se ha guardado la serie');
    };

    const saveClient = async () => {
        const res = await fetchWithAuth(`${API}/clients`, token, { method: 'POST', body: JSON.stringify(client) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'No se ha creado el cliente');
    };

    const next = async () => {
        try {
            if (step === 0) await saveFiscal();
            if (step === 1) await saveSeries();
            if (step === 2) await saveClient();
            if (step === 2) {
                toast('Listo para el primer presupuesto', 'success');
                navigate('/invoices');
                return;
            }
            setStep(s => s + 1);
        } catch (err) {
            toast(err.message, 'error');
        }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content" style={{ maxWidth: 560 }}>
                <h1 className="page-title">Deja Workly listo en tres pasos</h1>
                <p className="page-subtitle">Paso {step + 1} de 3. Sin los datos fiscales no se puede emitir una factura VeriFactu.</p>
                {step === 0 && (
                    <form className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }} onSubmit={e => { e.preventDefault(); next(); }}>
                        <label htmlFor="legal">Nombre con el que facturas
                            <input id="legal" className="form-input" value={fiscal.legal_name} onChange={e => setFiscal(f => ({ ...f, legal_name: e.target.value }))} required />
                        </label>
                        <label htmlFor="nif">NIF
                            <input id="nif" className="form-input" value={fiscal.tax_id} onChange={e => setFiscal(f => ({ ...f, tax_id: e.target.value }))} required />
                        </label>
                        <label htmlFor="addr">Domicilio fiscal
                            <input id="addr" className="form-input" value={fiscal.fiscal_address} onChange={e => setFiscal(f => ({ ...f, fiscal_address: e.target.value }))} required />
                        </label>
                        <button className="btn btn-primary" type="submit" style={{ minHeight: 48 }}>Guardar y seguir</button>
                    </form>
                )}
                {step === 1 && (
                    <form className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }} onSubmit={e => { e.preventDefault(); next(); }}>
                        <label htmlFor="series">Serie de las facturas
                            <input id="series" className="form-input" value={series} maxLength={10} onChange={e => setSeries(e.target.value)} required />
                        </label>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Por ejemplo FAC. El número correlativo sale solo al emitir, y no se reutiliza si anulas.</p>
                        <button className="btn btn-primary" type="submit" style={{ minHeight: 48 }}>Guardar serie</button>
                    </form>
                )}
                {step === 2 && (
                    <form className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }} onSubmit={e => { e.preventDefault(); next(); }}>
                        <label htmlFor="cname">Primer cliente
                            <input id="cname" className="form-input" value={client.name} onChange={e => setClient(c => ({ ...c, name: e.target.value }))} required />
                        </label>
                        <label htmlFor="cphone">Teléfono
                            <input id="cphone" className="form-input" value={client.phone} onChange={e => setClient(c => ({ ...c, phone: e.target.value }))} />
                        </label>
                        <button className="btn btn-primary" type="submit" style={{ minHeight: 48 }}>Crear cliente y hacer un presupuesto</button>
                    </form>
                )}
            </main>
        </div>
    );
}
