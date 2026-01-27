import { useState } from 'react';
import InvoiceItems from './InvoiceItems';

export default function InvoiceForm({ clients, projects, onSubmit, initialData }) {
    const formatDate = (date) => {
        if (!date) return '';
        return date.split('T')[0];
    };

    const [items, setItems] = useState(
        initialData?.items || [{ description: '', quantity: 1, unit_price: 0, total: 0 }]
    );

    const [form, setForm] = useState({
        client_id: initialData?.client_id || '',
        project_id: initialData?.project_id || '',
        issue_date: formatDate(initialData?.issue_date),
        due_date: formatDate(initialData?.due_date),
        status: initialData?.status || 'draft',
        notes: initialData?.notes || '',
    });


    const total = items.reduce(
        (sum, i) => sum + Number(i.total || 0),
        0
    );


    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...form,
            items,
            id: initialData?.id,
        });
    };


    return (
        <form id="invoice-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <select
                    name="client_id"
                    value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    className="border px-3 py-2 rounded"
                >
                    <option value="">Cliente</option>
                    {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>

                <select
                    name="project_id"
                    value={form.project_id}
                    onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                    className="border px-3 py-2 rounded"
                >
                    <option value="">Proyecto (opcional)</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                </select>

                <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) =>
                        setForm({ ...form, issue_date: e.target.value })
                    }
                    className="border px-3 py-2 rounded"
                />

                <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) =>
                        setForm({ ...form, due_date: e.target.value })
                    }
                    className="border px-3 py-2 rounded"
                />
            </div>

            <InvoiceItems items={items} setItems={setItems} />

            <div className="text-right font-semibold">
                Total: €{Number(total).toFixed(2)}
            </div>
        </form>
    );
}
