import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getClients } from '../api/clients';
import Sidebar from '../components/Sidebar';

const Clients = () => {
    const { token } = useContext(AuthContext);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;

        getClients(token)
            .then(setClients)
            .finally(() => setLoading(false));
    }, [token]);

    return (
        <div className="bg-slate-50 min-h-screen">
            <Sidebar />

            <main className="ml-64 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-slate-800">
                        Clientes
                    </h2>

                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition">
                        + Nuevo cliente
                    </button>
                </div>

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
                                {clients.map(client => (
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
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <button className="text-indigo-600 hover:underline">
                                                Editar
                                            </button>
                                            <button className="text-red-600 hover:underline">
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
