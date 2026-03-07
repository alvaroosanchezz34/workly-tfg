import { useState } from 'react';
import { Input, Select, FormFooter } from './FormComponents';

const UNITS = [
    { value:'hora',     label:'Hora' },
    { value:'dia',      label:'Día' },
    { value:'proyecto', label:'Proyecto' },
    { value:'pagina',   label:'Página' },
    { value:'unidad',   label:'Unidad' },
    { value:'mes',      label:'Mes' },
];

export default function ServiceForm({ initialData, onSubmit, onCancel }) {
    const d = initialData || {};
    const [form, setForm] = useState({
        name:         d.name         || '',
        default_rate: d.default_rate || '',
        unit:         d.unit         || '',
    });
    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    const handleSubmit = e => {
        e.preventDefault();
        if (!form.name.trim()) return alert('El nombre es obligatorio');
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <Input label="Nombre del servicio" name="name" value={form.name} onChange={set} required placeholder="Ej: Desarrollo web, Diseño gráfico…" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Input label="Tarifa por defecto (€)" name="default_rate" type="number" min="0" step="0.01" value={form.default_rate} onChange={set} placeholder="0.00" />
                <Select label="Unidad" name="unit" value={form.unit} onChange={set} placeholder="Selecciona…" options={UNITS} />
            </div>
            <FormFooter onCancel={onCancel} />
        </form>
    );
}