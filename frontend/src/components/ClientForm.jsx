import { useState } from 'react';

const ClientForm = ({ initialData, onSubmit, onCancel }) => {
    const safeData = initialData || {};

    const [form, setForm] = useState({
        name: safeData.name || '',
        email: safeData.email || '',
        phone: safeData.phone || '',
        company: safeData.company || '',
        notes: safeData.notes || '',
        document: safeData.document || '',
    });


    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
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
            <Input label="Email" name="email" value={form.email} onChange={handleChange} />
            <Input label="Teléfono" name="phone" value={form.phone} onChange={handleChange} />
            <Input label="Empresa" name="company" value={form.company} onChange={handleChange} />
            <Input label="Documento" name="document" value={form.document} onChange={handleChange} />
            <Textarea label="Notas" name="notes" value={form.notes} onChange={handleChange} />

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg border"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                    Guardar
                </button>
            </div>
        </form>
    );

};

export default ClientForm;

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

const Textarea = ({ label, ...props }) => (
    <div>
        <label className="block text-sm mb-1">{label}</label>
        <textarea
            {...props}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
    </div>
);
