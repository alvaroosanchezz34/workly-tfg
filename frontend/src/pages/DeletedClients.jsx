import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getDeletedClients, restoreClient } from '../api/clients';
import Sidebar from '../components/Sidebar';

export default function DeletedClients() {
    const { token } = useContext(AuthContext);
    const [clients, setClients] = useState([]);

    const loadClients = async () => {
        const data = await getDeletedClients(token);
        setClients(data);
    };

    useEffect(() => {
        loadClients();
    }, []);

    const handleRestore = async (id) => {
        await restoreClient(token, id);
        loadClients();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />

            <main className="ml-64 p-8">
                <h1 className="text-2xl font-semibold mb-6">
                    Clientes eliminados
                </h1>

                <div className="bg-white rounded-xl border">
                    {clients.length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">
                            No hay clientes eliminados
                        </p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left">Nombre</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map((c) => (
                                    <tr key={c.id} className="border-t">
                                        <td className="px-4 py-3">{c.name}</td>
                                        <td className="px-4 py-3">{c.email}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleRestore(c.id)}
                                                className="text-indigo-600 hover:underline"
                                            >
                                                Restaurar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
