const genId = () => `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function InvoiceItems({ items, setItems }) {
    const updateItem = (id, field, value) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: field === 'description' ? value : Number(value) };
            updated.total = (Number(updated.quantity) || 0) * (Number(updated.unit_price) || 0);
            return updated;
        }));
    };

    const addItem = () =>
        setItems(prev => [
            ...prev,
            { id: genId(), description: '', quantity: 1, unit_price: 0, total: 0 },
        ]);

    const removeItem = (id) => setItems(prev => prev.filter(item => item.id !== id));

    const fmt = v => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(v ?? 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Cabecera */}
            {items.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 90px 110px 90px 32px',
                    gap: 8,
                    padding: '6px 10px',
                    background: 'var(--bg)',
                    borderRadius: 6,
                }}>
                    {['Descripción', 'Cantidad', 'Precio/ud.', 'Total', ''].map((h, i) => (
                        <span key={i} style={{
                            fontSize: 10.5, fontWeight: 600, color: 'var(--text-disabled)',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            textAlign: i >= 1 && i <= 3 ? 'right' : 'left',
                        }}>
                            {h}
                        </span>
                    ))}
                </div>
            )}

            {/* Filas */}
            {items.map((item) => (
                <div
                    key={item.id}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 90px 110px 90px 32px',
                        gap: 8,
                        alignItems: 'center',
                        padding: '4px 10px',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        background: 'var(--card-bg)',
                    }}
                >
                    <input
                        className="form-input"
                        style={{ fontSize: 13 }}
                        placeholder="Descripción del servicio"
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                    />
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 13, textAlign: 'right' }}
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                    />
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        style={{ fontSize: 13, textAlign: 'right' }}
                        value={item.unit_price}
                        onChange={e => updateItem(item.id, 'unit_price', e.target.value)}
                    />
                    <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: 'var(--secondary)',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {fmt(item.total)} €
                    </div>
                    <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        title="Eliminar línea"
                        style={{
                            width: 26, height: 26,
                            border: 'none', borderRadius: 6,
                            background: 'var(--error-light)',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 700,
                            flexShrink: 0,
                        }}
                    >
                        ×
                    </button>
                </div>
            ))}

            <button
                type="button"
                onClick={addItem}
                className="btn btn-ghost"
                style={{ alignSelf: 'flex-start', fontSize: 13, marginTop: 4 }}
            >
                + Añadir línea
            </button>
        </div>
    );
}