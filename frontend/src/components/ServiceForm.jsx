import { useState } from 'react';

export default function ServiceForm({ initialData, onSubmit, onCancel }) {
    const data = initialData || {};

    const [form, setForm] = useState({
        name: data.name || '',
        default_rate: data.default_rate || '',
        unit: data.unit || '',
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            alert('El nombre es obligatorio');
            return;
        }
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nombre" name="name" value={form.name} onChange={handleChange} />
            <Input label="Tarifa por defecto (€)" name="default_rate" value={form.default_rate} onChange={handleChange} />
            <Input label="Unidad (hora, servicio, etc.)" name="unit" value={form.unit} onChange={handleChange} />

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

/* AUX */
const Input = ({ label, ...props }) => (
    <div>
        <label className="block text-sm mb-1">{label}</label>
        <input
            {...props}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
    </div>
);
