import { useState } from 'react';
import { Input, Select, FormFooter } from './FormComponents';

const CATS = [
    { value:'software',   label:'Software / Licencias' },
    { value:'hardware',   label:'Hardware / Equipos' },
    { value:'oficina',    label:'Oficina / Material' },
    { value:'transporte', label:'Transporte' },
    { value:'marketing',  label:'Marketing / Publicidad' },
    { value:'formacion',  label:'Formación' },
    { value:'servicios',  label:'Servicios externos' },
    { value:'otros',      label:'Otros' },
];

export default function ExpenseForm({ initialData, onSubmit, onCancel }) {
    const d = initialData || {};
    const [form, setForm] = useState({
        category:    d.category    || '',
        description: d.description || '',
        amount:      d.amount      || '',
        date:        d.date ? d.date.split('T')[0] : '',
        receipt_url: d.receipt_url || '',
    });
    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    const handleSubmit = e => {
        e.preventDefault();
        if (!form.amount || !form.date) return alert('Importe y fecha son obligatorios');
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Select label="Categoría" name="category" value={form.category} onChange={set} placeholder="Selecciona…" options={CATS} />
                <Input  label="Fecha" name="date" type="date" value={form.date} onChange={set} required />
                <div style={{ gridColumn:'1 / -1' }}>
                    <Input label="Descripción" name="description" value={form.description} onChange={set} placeholder="Descripción del gasto" />
                </div>
                <Input label="Importe (€)" name="amount" type="number" min="0" step="0.01" value={form.amount} onChange={set} required placeholder="0.00" />
                <Input label="URL del recibo" name="receipt_url" value={form.receipt_url} onChange={set} placeholder="https://…" />
            </div>
            <FormFooter onCancel={onCancel} />
        </form>
    );
}