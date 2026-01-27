import { useState } from 'react';

export default function ExpenseForm({ initialData, onSubmit, onCancel }) {
    const data = initialData || {};

    const [form, setForm] = useState({
        category: data.category || '',
        description: data.description || '',
        amount: data.amount || '',
        date: data.date || '',
        receipt_url: data.receipt_url || '',
    });

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.amount || !form.date) {
            alert('Importe y fecha son obligatorios');
            return;
        }
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Categoría" name="category" value={form.category} onChange={handleChange} />
            <Input label="Descripción" name="description" value={form.description} onChange={handleChange} />
            <Input label="Importe (€)" name="amount" type="number" value={form.amount} onChange={handleChange} />
            <Input label="Fecha" name="date" type="date" value={form.date} onChange={handleChange} />
            <Input label="URL del recibo" name="receipt_url" value={form.receipt_url} onChange={handleChange} />

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg">
                    Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                    Guardar
                </button>
            </div>
        </form>
    );
}

const Input = ({ label, ...props }) => (
    <div>
        <label className="block text-sm mb-1">{label}</label>
        <input
            {...props}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
    </div>
);
