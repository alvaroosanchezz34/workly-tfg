import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getActivityLogs } from '../api/activityLogs';
import {
    FilePlus,
    FileEdit,
    Trash2,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

const iconMap = {
    created: <FilePlus className="text-green-600" size={18} />,
    updated: <FileEdit className="text-blue-600" size={18} />,
    deleted: <Trash2 className="text-red-600" size={18} />,
};

const entityLabel = {
    client: 'Cliente',
    project: 'Proyecto',
    invoice: 'Factura',
    expense: 'Gasto',
    service: 'Servicio',
};

export default function ActivityLogs() {
    const { token } = useContext(AuthContext);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getActivityLogs(token)
            .then(setLogs)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* SIDEBAR */}
            <Sidebar />

            {/* MAIN CONTENT */}
            <main className="ml-64 p-8">
                <h1 className="text-2xl font-semibold text-slate-800 mb-6">
                    Activity Logs
                </h1>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    {loading ? (
                        <p className="p-6 text-sm text-slate-500">
                            Cargando actividad...
                        </p>
                    ) : logs.length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">
                            No hay actividad registrada
                        </p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-4 py-3 text-left">Acción</th>
                                    <th className="px-4 py-3 text-left">Entidad</th>
                                    <th className="px-4 py-3 text-left">Fecha</th>
                                </tr>
                            </thead>

                            <tbody>
                                {logs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="border-t border-slate-100 hover:bg-slate-50"
                                    >
                                        <td className="px-4 py-3 flex items-center gap-2">
                                            {iconMap[log.action]}
                                            <span className="capitalize">{log.action}</span>
                                        </td>

                                        <td className="px-4 py-3">
                                            {entityLabel[log.entity]} #{log.entity_id}
                                        </td>

                                        <td className="px-4 py-3 text-slate-500">
                                            {new Date(log.created_at).toLocaleString()}
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
