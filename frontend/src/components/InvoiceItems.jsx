import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const genId = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const fmt   = v => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(v ?? 0);

const TAX_PRESETS = [
    { value: 0,   label: '0% (Exento)'   },
    { value: 4,   label: '4% (Superreducido)' },
    { value: 10,  label: '10% (Reducido)' },
    { value: 21,  label: '21% (General)'  },
];

export default function InvoiceItems({ items, setItems, services = [] }) {
    const [serviceOpen, setServiceOpen] = useState(null); // índice del item con picker abierto

    const recalc = item => {
        const subtotal   = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
        const taxRate    = Number(item.tax_rate)  || 0;
        const taxAmount  = Math.round(subtotal * taxRate / 100 * 100) / 100;
        return { ...item, subtotal, tax_amount: taxAmount, total: subtotal + taxAmount };
    };

    const updateItem = (id, field, value) => {
        setItems(prev => prev.map(item =>
            item.id !== id ? item : recalc({ ...item, [field]: field === 'description' ? value : Number(value) })
        ));
    };

    const addItem = () =>
        setItems(prev => [...prev, { id: genId(), description: '', quantity: 1, unit_price: 0, tax_rate: 21, subtotal: 0, tax_amount: 0, total: 0 }]);

    const removeItem = id => setItems(prev => prev.filter(i => i.id !== id));

    const applyService = (itemId, svc) => {
        setItems(prev => prev.map(item =>
            item.id !== itemId ? item : recalc({
                ...item,
                description: svc.name,
                unit_price:  Number(svc.default_rate) || 0,
                tax_rate:    21,
            })
        ));
        setServiceOpen(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Cabecera */}
            {items.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 90px 80px 80px 28px', gap: 6, padding: '6px 10px', background: 'var(--bg)', borderRadius: 6 }}>
                    {['Descripción', 'Cant.', 'Precio/u.', 'IVA%', 'IVA €', 'Total', ''].map((h, i) => (
                        <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', textAlign: i >= 1 && i <= 5 ? 'right' : 'left' }}>{h}</span>
                    ))}
                </div>
            )}

            {/* Filas */}
            {items.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 90px 80px 80px 28px', gap: 6, alignItems: 'center', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card-bg)', position: 'relative' }}>

                    {/* Descripción + selector de servicio */}
                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <input
                                className="form-input"
                                style={{ fontSize: 12.5, flex: 1 }}
                                placeholder="Descripción del servicio"
                                value={item.description}
                                onChange={e => updateItem(item.id, 'description', e.target.value)}
                            />
                            {services.length > 0 && (
                                <button
                                    type="button"
                                    title="Seleccionar del catálogo"
                                    onClick={() => setServiceOpen(serviceOpen === item.id ? null : item.id)}
                                    style={{ width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                >
                                    <ChevronDown size={12} color="var(--text-secondary)" />
                                </button>
                            )}
                        </div>
                        {/* Picker servicios */}
                        {serviceOpen === item.id && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setServiceOpen(null)} />
                                <div style={{ position: 'absolute', top: '105%', left: 0, zIndex: 200, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-md)', minWidth: 220, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                                    {services.map(svc => (
                                        <button
                                            key={svc.id}
                                            type="button"
                                            onClick={() => applyService(item.id, svc)}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, borderRadius: 5, fontFamily: 'inherit' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                            <span style={{ color: 'var(--text-primary)' }}>{svc.name}</span>
                                            {svc.default_rate && (
                                                <span style={{ color: 'var(--secondary)', fontWeight: 600, fontSize: 12 }}>
                                                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(svc.default_rate)}
                                                    {svc.unit ? `/${svc.unit}` : ''}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Cantidad */}
                    <input type="number" min="0" step="0.01" className="form-input"
                        style={{ fontSize: 12.5, textAlign: 'right' }}
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', e.target.value)} />

                    {/* Precio unitario */}
                    <input type="number" min="0" step="0.01" className="form-input"
                        style={{ fontSize: 12.5, textAlign: 'right' }}
                        value={item.unit_price}
                        onChange={e => updateItem(item.id, 'unit_price', e.target.value)} />

                    {/* IVA % */}
                    <select className="form-select"
                        style={{ fontSize: 12, textAlign: 'right' }}
                        value={item.tax_rate}
                        onChange={e => updateItem(item.id, 'tax_rate', e.target.value)}
                    >
                        {TAX_PRESETS.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>

                    {/* IVA € */}
                    <div style={{ fontSize: 12.5, textAlign: 'right', color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(item.tax_amount)} €
                    </div>

                    {/* Total */}
                    <div style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', color: 'var(--secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(item.total)} €
                    </div>

                    {/* Eliminar */}
                    <button type="button" onClick={() => removeItem(item.id)}
                        style={{ width: 24, height: 24, border: 'none', borderRadius: 5, background: 'var(--error-light)', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
                        ×
                    </button>
                </div>
            ))}

            <button type="button" onClick={addItem} className="btn btn-ghost"
                style={{ alignSelf: 'flex-start', fontSize: 13, marginTop: 4 }}>
                + Añadir línea
            </button>
        </div>
    );
}