export default function InvoiceItems({ items, setItems }) {
    const updateItem = (i, field, value) => {
        const updated = [...items];

        if (field === 'description') {
            updated[i][field] = value; // TEXTO
        } else {
            updated[i][field] = Number(value); // NÚMERO
        }

        const quantity = Number(updated[i].quantity) || 0;
        const unitPrice = Number(updated[i].unit_price) || 0;

        updated[i].total = quantity * unitPrice;

        setItems(updated);
    };

    const addItem = () =>
        setItems([
            ...items,
            { description: '', quantity: 1, unit_price: 0, total: 0 },
        ]);


    const removeItem = (i) => setItems(items.filter((_, index) => index !== i));

    return (
        <div className="space-y-3">
            {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                    <input
                        className="col-span-5 border px-2 py-1 rounded"
                        placeholder="Descripción"
                        value={item.description}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                    />
                    <input
                        type="number"
                        className="col-span-2 border px-2 py-1 rounded"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', +e.target.value)}
                    />
                    <input
                        type="number"
                        className="col-span-2 border px-2 py-1 rounded"
                        value={item.unit_price}
                        onChange={(e) => updateItem(i, 'unit_price', +e.target.value)}
                    />
                    <div className="col-span-2 flex items-center">
                        €{Number(item.total || 0).toFixed(2)}

                    </div>
                    <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="col-span-1 text-red-600"
                    >
                        ✕
                    </button>
                </div>
            ))}

            <button
                type="button"
                onClick={addItem}
                className="text-indigo-600 text-sm"
            >
                + Añadir línea
            </button>
        </div>
    );
}
