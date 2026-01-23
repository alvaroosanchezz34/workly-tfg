import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ClientForm from '../components/ClientForm';
import {
    getClients,
    createClient,
    updateClient,
} from '../api/clients';
import Modal from "../components/Modal";
import { deleteClient } from '../api/clients';


const Clients = () => {
    const { token } = useContext(AuthContext);

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [clientToDelete, setClientToDelete] = useState(null);


    useEffect(() => {
        if (!token) return;

        loadClients();
    }, [token]);

    const loadClients = async () => {
        setLoading(true);
        try {
            const data = await getClients(token);
            setClients(data);
        } catch (error) {
            alert('Error al cargar clientes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (formData) => {
        try {
            await createClient(token, formData);
            setShowForm(false);
            await loadClients();
        } catch (error) {
            alert('Error al crear cliente');
        }
    };

    const handleEdit = async (formData) => {
        try {
            await updateClient(token, editingClient.id, formData);
            setEditingClient(null);
            await loadClients();
        } catch (error) {
            alert('Error al actualizar cliente');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteClient(token, clientToDelete.id);
            setClientToDelete(null);
            await loadClients();
        } catch (error) {
            alert('No se pudo eliminar el cliente');
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen">
            <Sidebar />

            <main className="ml-64 p-8">
                {/* HEADER */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-slate-800">
                        Clientes
                    </h2>

                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition"
                    >
                        + Nuevo cliente
                    </button>
                </div>

                {/* FORM */}
                <Modal
                    open={showForm || !!editingClient}
                    title={editingClient ? "Editar cliente" : "Nuevo cliente"}
                    onClose={() => {
                        setShowForm(false);
                        setEditingClient(null);
                    }}
                >
                    <ClientForm
                        initialData={editingClient}
                        onSubmit={editingClient ? handleEdit : handleCreate}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingClient(null);
                        }}
                    />
                </Modal>
                <Modal
                    open={!!clientToDelete}
                    title="Eliminar cliente"
                    onClose={() => setClientToDelete(null)}
                >
                    <p className="text-sm text-slate-600 mb-6">
                        ¿Estás seguro de que deseas eliminar el cliente{" "}
                        <strong>{clientToDelete?.name}</strong>?
                        Esta acción no se puede deshacer.
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setClientToDelete(null)}
                            className="px-4 py-2 border rounded-lg"
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            Eliminar
                        </button>
                    </div>
                </Modal>

                {/* CONTENT */}
                {loading ? (
                    <p className="text-slate-500">Cargando clientes...</p>
                ) : clients.length === 0 ? (
                    <p className="text-slate-500">
                        No tienes clientes registrados todavía.
                    </p>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                    <th className="text-left px-4 py-3">Nombre</th>
                                    <th className="text-left px-4 py-3">Empresa</th>
                                    <th className="text-left px-4 py-3">Email</th>
                                    <th className="text-left px-4 py-3">Teléfono</th>
                                    <th className="text-right px-4 py-3">Acciones</th>
                                </tr>
                            </thead>

                            <tbody>
                                {clients.map((client) => (
                                    <tr
                                        key={client.id}
                                        className="border-t hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            {client.name}
                                        </td>
                                        <td className="px-4 py-3">
                                            {client.company || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {client.email || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {client.phone || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setEditingClient(client)}
                                                className="text-indigo-600 hover:underline"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => setClientToDelete(client)}
                                                className="text-red-600 hover:underline ml-4"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Clients;
