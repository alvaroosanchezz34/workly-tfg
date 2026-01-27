import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
    getServices,
    createService,
    updateService,
    deleteService,
} from '../api/services';
import Sidebar from '../components/Sidebar';
import ServiceForm from '../components/ServiceForm';

export default function Services() {
    const { token } = useContext(AuthContext);
    const [services, setServices] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    const loadServices = async () => {
        const data = await getServices(token);
        setServices(data);
    };

    useEffect(() => {
        loadServices();
    }, []);

    const handleCreate = async (form) => {
        await createService(token, form);
        setShowForm(false);
        loadServices();
    };

    const handleUpdate = async (form) => {
        await updateService(token, editing.id, form);
        setEditing(null);
        loadServices();
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar servicio?')) return;
        await deleteService(token, id);
        loadServices();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />

            <main className="ml-64 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold">Servicios</h1>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                    >
                        + Nuevo servicio
                    </button>
                </div>

                <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left">Nombre</th>
                                <th className="px-4 py-3 text-left">Tarifa</th>
                                <th className="px-4 py-3 text-left">Unidad</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((s) => (
                                <tr key={s.id} className="border-t">
                                    <td className="px-4 py-3">{s.name}</td>
                                    <td className="px-4 py-3">€{s.default_rate}</td>
                                    <td className="px-4 py-3">{s.unit}</td>
                                    <td className="px-4 py-3 text-right space-x-3">
                                        <button onClick={() => setEditing(s)} className="text-indigo-600">
                                            Editar
                                        </button>
                                        <button onClick={() => handleDelete(s.id)} className="text-red-600">
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {(showForm || editing) && (
                    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md">
                            <ServiceForm
                                initialData={editing}
                                onSubmit={editing ? handleUpdate : handleCreate}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditing(null);
                                }}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
