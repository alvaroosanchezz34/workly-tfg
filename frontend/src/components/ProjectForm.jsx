import { useState } from "react";

// Helper para normalizar fechas a YYYY-MM-DD
const formatDate = (date) => {
    if (!date) return "";
    return date.split("T")[0];
};

const ProjectForm = ({ initialData, clients, onSubmit, onCancel }) => {
    const safeData = initialData || {};

    const [form, setForm] = useState({
        client_id: safeData.client_id || "",
        title: safeData.title || "",
        description: safeData.description || "",
        status: safeData.status || "pending",
        start_date: formatDate(safeData.start_date),
        end_date: formatDate(safeData.end_date),
        budget: safeData.budget || "",
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!form.client_id || !form.title.trim()) {
            alert("Cliente y título son obligatorios");
            return;
        }

        onSubmit(form);
    };

    return (
        <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CLIENTE */}
                <div>
                    <label className="block text-sm mb-1">Cliente</label>
                    <select
                        name="client_id"
                        value={form.client_id}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2"
                    >
                        <option value="">Selecciona</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* TÍTULO */}
                <div>
                    <label className="block text-sm mb-1">Título</label>
                    <input
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                {/* DESCRIPCIÓN */}
                <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Descripción</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                {/* ESTADO */}
                <div>
                    <label className="block text-sm mb-1">Estado</label>
                    <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2"
                    >
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En progreso</option>
                        <option value="completed">Completado</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>

                {/* PRESUPUESTO */}
                <div>
                    <label className="block text-sm mb-1">Presupuesto (€)</label>
                    <input
                        type="number"
                        name="budget"
                        value={form.budget}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                {/* FECHAS */}
                <div>
                    <label className="block text-sm mb-1">Inicio</label>
                    <input
                        type="date"
                        name="start_date"
                        value={form.start_date}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm mb-1">Fin</label>
                    <input
                        type="date"
                        name="end_date"
                        value={form.end_date}
                        onChange={handleChange}
                        className="w-full border rounded-lg px-3 py-2"
                    />
                </div>
            </div>
        </form>
    );
};

export default ProjectForm;
