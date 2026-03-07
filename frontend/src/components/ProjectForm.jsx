import { useState } from 'react';
import { Input, Select, Textarea, FormFooter } from './FormComponents';

const fmt = d => (!d ? '' : d.split('T')[0]);

const ProjectForm = ({ initialData, clients, onSubmit, onCancel }) => {
    const d = initialData || {};
    const [form, setForm] = useState({
        client_id:   d.client_id   || '',
        title:       d.title       || '',
        description: d.description || '',
        status:      d.status      || 'pending',
        start_date:  fmt(d.start_date),
        end_date:    fmt(d.end_date),
        budget:      d.budget      || '',
    });
    const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    const handleSubmit = e => {
        e.preventDefault();
        if (!form.client_id || !form.title.trim()) return alert('Cliente y título son obligatorios');
        onSubmit(form);
    };

    return (
        <form id="project-form" onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Select label="Cliente" name="client_id" value={form.client_id} onChange={set} required
                    placeholder="Selecciona un cliente"
                    options={clients.map(c => ({ value:c.id, label:c.name }))} />
                <Input label="Título del proyecto" name="title" value={form.title} onChange={set} required placeholder="Nombre del proyecto" />
                <div style={{ gridColumn:'1 / -1' }}>
                    <Textarea label="Descripción" name="description" value={form.description} onChange={set} rows={3} placeholder="Descripción del proyecto…" />
                </div>
                <Select label="Estado" name="status" value={form.status} onChange={set}
                    options={[
                        { value:'pending',     label:'Pendiente' },
                        { value:'in_progress', label:'En progreso' },
                        { value:'completed',   label:'Completado' },
                        { value:'cancelled',   label:'Cancelado' },
                    ]} />
                <Input label="Presupuesto (€)" name="budget" type="number" min="0" step="0.01" value={form.budget} onChange={set} placeholder="0.00" />
                <Input label="Fecha de inicio" name="start_date" type="date" value={form.start_date} onChange={set} />
                <Input label="Fecha de fin"    name="end_date"   type="date" value={form.end_date}   onChange={set} />
            </div>
            <FormFooter onCancel={onCancel} />
        </form>
    );
};

export default ProjectForm;