// ── ClientForm ───────────────────────────────────────────────
import { useState } from 'react';
import { Input, Textarea, FormFooter } from './FormComponents';

const ClientForm = ({ initialData, onSubmit, onCancel }) => {
    const d = initialData || {};
    const [form, setForm] = useState({
        name: d.name||'', email:d.email||'', phone:d.phone||'',
        company:d.company||'', notes:d.notes||'', document:d.document||'',
    });
    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    const handleSubmit = e => { e.preventDefault(); if(!form.name.trim()) return alert('El nombre es obligatorio'); onSubmit(form); };

    return (
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Input label="Nombre" name="name" value={form.name} onChange={set} required placeholder="Nombre completo" />
                <Input label="Email" name="email" type="email" value={form.email} onChange={set} placeholder="email@empresa.com" />
                <Input label="Teléfono" name="phone" value={form.phone} onChange={set} placeholder="+34 600 000 000" />
                <Input label="Empresa" name="company" value={form.company} onChange={set} placeholder="Nombre de la empresa" />
                <Input label="DNI / NIF" name="document" value={form.document} onChange={set} placeholder="12345678A" />
            </div>
            <Textarea label="Notas" name="notes" value={form.notes} onChange={set} placeholder="Información adicional…" rows={3} />
            <FormFooter onCancel={onCancel} />
        </form>
    );
};

export default ClientForm;