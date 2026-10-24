import { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
    deleteVerifactuCertificate, getVerifactuRecords, getVerifactuSettings,
    resubmitVerifactuRecord, saveVerifactuSettings, uploadVerifactuCertificate,
} from '../api/verifactu';

const STATUS = {
    queued: 'En cola',
    pending_certificate: 'Falta certificado',
    sending: 'Enviando',
    correcto: 'Correcto',
    aceptado_con_errores: 'Aceptado con errores',
    incorrecto: 'Incorrecto',
    error_tecnico: 'Error técnico',
    not_configured: 'Sin proveedor',
};

const fileToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const text = String(reader.result || '');
        resolve(text.includes(',') ? text.split(',')[1] : text);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el certificado'));
    reader.readAsDataURL(file);
});

export default function Verifactu() {
    const { token, user } = useContext(AuthContext);
    const [params] = useSearchParams();
    const invoiceId = params.get('invoiceId') || '';
    const [settings, setSettings] = useState(null);
    const [records, setRecords] = useState([]);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [mode, setMode] = useState('own_certificate');
    const [repName, setRepName] = useState('');
    const [repNif, setRepNif] = useState('');
    const [poder, setPoder] = useState('');
    const [passphrase, setPassphrase] = useState('');
    const [label, setLabel] = useState('Certificado');
    const [pfx, setPfx] = useState('');
    const [scope, setScope] = useState('issuer');
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setError('');
        const [cfg, rows] = await Promise.all([
            getVerifactuSettings(token),
            getVerifactuRecords(token, invoiceId),
        ]);
        setSettings(cfg);
        setMode(cfg.mode || 'own_certificate');
        setRepName(cfg.representativeName || '');
        setRepNif(cfg.representativeTaxId || '');
        setPoder(cfg.apoderamientoRef || '');
        setRecords(Array.isArray(rows) ? rows : []);
    };

    useEffect(() => {
        load().catch(err => setError(err.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, invoiceId]);

    const saveMode = async () => {
        setBusy(true); setError(''); setInfo('');
        try {
            const data = await saveVerifactuSettings(token, {
                mode, representativeName: repName, representativeTaxId: repNif, apoderamientoRef: poder,
            });
            setInfo(data.message);
            await load();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };

    const upload = async () => {
        setBusy(true); setError(''); setInfo('');
        try {
            const data = await uploadVerifactuCertificate(token, { pfxBase64: pfx, passphrase, label, scope });
            setInfo(data.message);
            setPassphrase('');
            setPfx('');
            await load();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };

    const removeCert = async which => {
        setBusy(true); setError(''); setInfo('');
        try {
            const data = await deleteVerifactuCertificate(token, which);
            setInfo(data.message);
            await load();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };

    const resubmit = async id => {
        setBusy(true); setError(''); setInfo('');
        try {
            const data = await resubmitVerifactuRecord(token, id);
            setInfo(data.message);
            await load();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="page-content">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">VeriFactu</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                            Estado de los registros enviados a la AEAT. Entorno: {settings?.env === 'production' ? 'producción' : 'pruebas'}.
                            {' '}<Link to="/verifactu/declaracion">Leer la declaración responsable (borrador)</Link>
                        </p>
                    </div>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
                {info && <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 13 }}>{info}</div>}

                {settings && settings.provider !== 'aeat' && (
                    <div style={{ marginBottom: 16, padding: 12, border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
                        El servidor sigue en modo <strong>{settings.provider}</strong>. Hasta que el titular ponga <code>VERIFACTU_PROVIDER=aeat</code> no se genera huella ni se envía nada.
                    </div>
                )}
                {settings && !settings.producerConfigured && (
                    <div style={{ marginBottom: 16, padding: 12, border: '1px solid var(--warning, #FF9800)', borderRadius: 8, fontSize: 13 }}>
                        Faltan los datos del productor en el servidor (nombre, NIF y código de sistema). Sin ellos no se puede emitir en modo AEAT.
                    </div>
                )}

                <section style={{ marginBottom: 24, padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
                    <h2 style={{ fontSize: 16, marginBottom: 8 }}>Quién envía</h2>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                        <input type="radio" name="vf-mode" checked={mode === 'own_certificate'} onChange={() => setMode('own_certificate')} />
                        {' '}Certificado propio de este emisor. No hace falta apoderamiento.
                    </label>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                        <input type="radio" name="vf-mode" checked={mode === 'platform_representation'} onChange={() => setMode('platform_representation')} />
                        {' '}La plataforma envía como representante. Hace falta un poder ante la AEAT.
                    </label>
                    {mode === 'platform_representation' && (
                        <div style={{ display: 'grid', gap: 8, margin: '12px 0' }}>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{settings?.legal?.platformRepresentation}</p>
                            <input className="form-input" placeholder="Nombre del representante" value={repName} onChange={e => setRepName(e.target.value)} />
                            <input className="form-input" placeholder="NIF del representante" value={repNif} onChange={e => setRepNif(e.target.value)} />
                            <input className="form-input" placeholder="Referencia del apoderamiento" value={poder} onChange={e => setPoder(e.target.value)} />
                        </div>
                    )}
                    <button className="btn btn-primary" disabled={busy} onClick={saveMode}>Guardar modo</button>
                </section>

                <section style={{ marginBottom: 24, padding: 16, border: '1px solid var(--border)', borderRadius: 12 }}>
                    <h2 style={{ fontSize: 16, marginBottom: 8 }}>Certificado</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {settings?.hasCertificate
                            ? `Hay un certificado de este emisor (${settings.certificateLabel || 'sin etiqueta'}).`
                            : 'Este emisor todavía no ha subido un certificado.'}
                        {settings?.platformCertificateConfigured ? ' El certificado de la plataforma está configurado.' : ' No hay certificado de plataforma.'}
                    </p>
                    {user?.role === 'admin' && (
                        <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
                            <input type="checkbox" checked={scope === 'platform'} onChange={e => setScope(e.target.checked ? 'platform' : 'issuer')} />
                            {' '}Guardar como certificado de la plataforma (solo el administrador)
                        </label>
                    )}
                    <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
                        <input className="form-input" placeholder="Etiqueta" value={label} onChange={e => setLabel(e.target.value)} />
                        <input className="form-input" type="password" placeholder="Contraseña del PFX" value={passphrase} onChange={e => setPassphrase(e.target.value)} autoComplete="new-password" />
                        <input className="form-input" type="file" accept=".pfx,.p12" onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setPfx(await fileToBase64(file));
                        }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" disabled={busy || !pfx} onClick={upload}>Subir certificado</button>
                            {settings?.hasCertificate && <button className="btn btn-ghost" disabled={busy} onClick={() => removeCert('issuer')}>Borrar el mío</button>}
                            {user?.role === 'admin' && <button className="btn btn-ghost" disabled={busy} onClick={() => removeCert('platform')}>Borrar el de la plataforma</button>}
                        </div>
                    </div>
                </section>

                <section>
                    <h2 style={{ fontSize: 16, marginBottom: 8 }}>Registros {invoiceId ? `de la factura ${invoiceId}` : ''}</h2>
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Factura</th><th>Operación</th><th>Estado</th><th>CSV</th><th>Error</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 && (
                                    <tr><td colSpan={6} style={{ padding: 16, color: 'var(--text-secondary)' }}>Todavía no hay registros.</td></tr>
                                )}
                                {records.map(row => (
                                    <tr key={row.id}>
                                        <td>{row.num_serie || row.invoice_number}</td>
                                        <td>{row.operation}</td>
                                        <td>{STATUS[row.status] || row.status}</td>
                                        <td style={{ fontSize: 12 }}>{row.csv || '—'}</td>
                                        <td style={{ fontSize: 12, maxWidth: 280 }}>{row.descripcion_error || row.codigo_error || '—'}</td>
                                        <td>
                                            {row.status !== 'correcto' && row.status !== 'sending' && (
                                                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => resubmit(row.id)}>Reenviar</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}
