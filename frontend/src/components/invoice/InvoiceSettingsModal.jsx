import { useEffect, useState } from 'react';
import Modal from '../Modal';
import { getInvoiceSettings, updateInvoiceSettings, getIssuerProfile, saveIssuerProfile } from '../../api/invoices';
import { CheckCircle } from 'lucide-react';

export default function InvoiceSettingsModal({ token, onClose }) {
    const [cfg,     setCfg]     = useState({ prefix: 'FAC', padding: 4, reset_yearly: 1, next_number: 1, current_year: new Date().getFullYear() });
    const [issuer,  setIssuer]  = useState({ legal_name: '', tax_id: '', fiscal_address: '' });
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);
    const [success, setSuccess] = useState(false);
    const [error,   setError]   = useState('');

    useEffect(() => {
        Promise.all([getInvoiceSettings(token), getIssuerProfile(token).catch(() => null)])
            .then(([settings, profile]) => {
                setCfg(settings);
                if (profile) setIssuer({
                    legal_name: profile.legal_name || '',
                    tax_id: profile.tax_id || '',
                    fiscal_address: profile.fiscal_address || '',
                });
            })
            .finally(() => setLoading(false));
    }, [token]);

    const set = e => {
        const val = e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value;
        setCfg(f => ({ ...f, [e.target.name]: val }));
    };

    const setIssuerField = e => setIssuer(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSave = async e => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await saveIssuerProfile(token, issuer);
            await updateInvoiceSettings(token, { prefix: cfg.prefix, padding: cfg.padding, reset_yearly: cfg.reset_yearly });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2500);
        } catch (err) {
            setError(err.message);
        } finally { setSaving(false); }
    };

    const year    = cfg.current_year || new Date().getFullYear();
    const padded  = String(cfg.next_number || 1).padStart(Number(cfg.padding) || 4, '0');
    const preview = `${cfg.prefix || 'FAC'}-${year}-${padded}`;

    return (
        <Modal open title="Datos fiscales y numeración" onClose={onClose}>
            {loading ? (
                <div style={{ padding: '20px 0' }}><div className="skeleton" style={{ height: 14, width: '60%' }} /></div>
            ) : (
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {success && (
                        <div className="alert alert-success">
                            <CheckCircle size={14} />
                            <span>Configuración guardada</span>
                        </div>
                    )}
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Nombre o razón social</label>
                        <input name="legal_name" className="form-input" value={issuer.legal_name} onChange={setIssuerField} placeholder="Ana López o Mi Empresa SL" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">NIF del emisor</label>
                        <input name="tax_id" className="form-input" value={issuer.tax_id} onChange={setIssuerField} placeholder="12345678Z" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Domicilio fiscal</label>
                        <input name="fiscal_address" className="form-input" value={issuer.fiscal_address} onChange={setIssuerField} placeholder="Calle, número, código postal y municipio" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Prefijo</label>
                            <input name="prefix" className="form-input" value={cfg.prefix} onChange={set} placeholder="FAC" maxLength={10} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Dígitos del número</label>
                            <select name="padding" className="form-select" value={cfg.padding} onChange={set}>
                                {[3, 4, 5, 6].map(n => <option key={n} value={n}>{n} dígitos</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="checkbox" id="reset_yearly" name="reset_yearly"
                            checked={cfg.reset_yearly === 1 || cfg.reset_yearly === true}
                            onChange={set}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <label htmlFor="reset_yearly" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                            Reiniciar numeración cada año
                        </label>
                    </div>

                    {/* Vista previa */}
                    <div style={{ background: 'var(--primary-light)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10.5, color: 'var(--text-disabled)', textTransform: 'uppercase', marginBottom: 4 }}>Vista previa</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
                            {preview}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                            El número se asigna al emitir, seguido y sin huecos, para este emisor y esta serie.
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Guardando…' : 'Guardar configuración'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}