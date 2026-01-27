import { useContext, useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import InvoiceForm from '../components/InvoiceForm';
import { AuthContext } from '../context/AuthContext';
import {
    getInvoices,
    getInvoiceById,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    downloadInvoicePDF
} from '../api/invoices';
import { getClients } from '../api/clients';
import { getProjects } from '../api/projects';

export default function Invoices() {
    const { token } = useContext(AuthContext);
    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [projects, setProjects] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);

    const loadData = async () => {
        const [i, c, p] = await Promise.all([
            getInvoices(token),
            getClients(token),
            getProjects(token),
        ]);
        setInvoices(i);
        setClients(c);
        setProjects(p);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleEdit = async (invoice) => {
        const fullInvoice = await getInvoiceById(token, invoice.id);
        setEditingInvoice(fullInvoice);
        setShowForm(true);
    };


    const handleCreateOrUpdate = async (data) => {
        if (data.id) {
            await updateInvoice(token, data.id, data);
        } else {
            await createInvoice(token, data);
        }

        setShowForm(false);
        setEditingInvoice(null);
        loadData();
    };


    return (
        <div className="flex">
            <Sidebar />

            <div className="ml-64 p-6 w-full">
                <div className="flex justify-between mb-4">
                    <h1 className="text-2xl font-semibold">Facturas</h1>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded"
                    >
                        + Nueva factura
                    </button>
                </div>

                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-600">
                            <tr>
                                <th className="p-3 text-left">Número</th>
                                <th className="p-3 text-left">Cliente</th>
                                <th className="p-3 text-left">Estado</th>
                                <th className="p-3 text-left">Total</th>
                                <th className="p-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((i) => (
                                <tr key={i.id} className="border-t hover:bg-slate-50">
                                    <td className="p-3 font-medium">{i.invoice_number}</td>
                                    <td className="p-3">{i.client_name}</td>
                                    <td className="p-3">
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-medium
        ${i.status === 'draft' && 'bg-gray-100 text-gray-600'}
        ${i.status === 'sent' && 'bg-blue-100 text-blue-700'}
        ${i.status === 'paid' && 'bg-green-100 text-green-700'}
        ${i.status === 'overdue' && 'bg-red-100 text-red-700'}
    `}
                                        >
                                            {i.status}
                                        </span>

                                    </td>
                                    <td className="p-3 font-semibold">€{i.total_amount}</td>
                                    <td className="p-3 text-right space-x-3">
                                        <button
                                            onClick={() => handleEdit(i)}
                                            className="text-indigo-600 hover:underline"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => downloadInvoicePDF(token, i.id)}
                                            className="text-slate-600 hover:underline"
                                        >
                                            PDF
                                        </button>
                                        <button
                                            onClick={() => deleteInvoice(token, i.id)}
                                            className="text-red-600 hover:underline"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* MODAL */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-white w-full max-w-3xl rounded-xl p-6 max-h-[90vh] overflow-y-auto">
                        <InvoiceForm
                            clients={clients}
                            projects={projects}
                            onSubmit={handleCreateOrUpdate}
                            initialData={editingInvoice}
                        />
                        <div className="flex justify-end mt-4 gap-2">
                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingInvoice(null);
                                }}
                                className="border px-4 py-2 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                form="invoice-form"
                                type="submit"
                                className="bg-indigo-600 text-white px-4 py-2 rounded"
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
