import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import ProjectForm from "../components/ProjectForm";
import {
    getProjects,
    createProject,
    updateProject,
} from "../api/projects";
import { getClients } from "../api/clients";

export default function Projects() {
    const { token } = useContext(AuthContext);

    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    const loadData = async () => {
        setLoading(true);
        const [p, c] = await Promise.all([
            getProjects(token),
            getClients(token),
        ]);
        setProjects(p);
        setClients(c);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async (data) => {
        await createProject(token, data);
        setShowForm(false);
        loadData();
    };

    const handleUpdate = async (data) => {
        await updateProject(token, editing.id, data);
        setEditing(null);
        setShowForm(false);
        loadData();
    };

    return (
        <div className="flex">
            <Sidebar />

            <div className="flex-1 p-6 ml-64">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold">Proyectos</h1>
                    <button
                        onClick={() => {
                            setEditing(null);
                            setShowForm(true);
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
                    >
                        + Nuevo proyecto
                    </button>
                </div>

                {loading ? (
                    <p>Cargando...</p>
                ) : (
                    <div className="bg-white border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Título</th>
                                    <th className="px-4 py-3 text-left">Cliente</th>
                                    <th className="px-4 py-3 text-left">Estado</th>
                                    <th className="px-4 py-3 text-left">Presupuesto</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map((p) => (
                                    <tr key={p.id} className="border-t">
                                        <td className="px-4 py-3">{p.title}</td>
                                        <td className="px-4 py-3">{p.client_name}</td>
                                        <td className="px-4 py-3 capitalize">{p.status}</td>
                                        <td className="px-4 py-3 capitalize">{p.budget}€</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => {
                                                    setEditing(p);
                                                    setShowForm(true);
                                                }}
                                                className="text-indigo-600 hover:underline"
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {showForm && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        {/* HEADER */}
                        <div className="px-6 py-4 border-b">
                            <h2 className="text-lg font-semibold">
                                {editing ? "Editar proyecto" : "Nuevo proyecto"}
                            </h2>
                        </div>

                        {/* BODY */}
                        <div className="px-6 py-4 overflow-y-auto">
                            <ProjectForm
                                initialData={editing}
                                clients={clients}
                                onSubmit={editing ? handleUpdate : handleCreate}
                                onCancel={() => {
                                    setShowForm(false);
                                    setEditing(null);
                                }}
                            />
                        </div>

                        {/* FOOTER */}
                        <div className="px-6 py-4 border-t flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setEditing(null);
                                }}
                                className="px-4 py-2 rounded-lg border"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                form="project-form"
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
