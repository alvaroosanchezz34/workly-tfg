import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
} from '../api/expenses';
import Sidebar from '../components/Sidebar';
import ExpenseForm from '../components/ExpenseForm';

export default function Expenses() {
    const { token } = useContext(AuthContext);
    const [expenses, setExpenses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);

    const loadExpenses = async () => {
        const data = await getExpenses(token);
        setExpenses(data);
    };

    useEffect(() => {
        loadExpenses();
    }, []);

    const handleCreate = async (form) => {
        await createExpense(token, form);
        setShowForm(false);
        loadExpenses();
    };

    const handleUpdate = async (form) => {
        await updateExpense(token, editing.id, form);
        setEditing(null);
        loadExpenses();
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar gasto?')) return;
        await deleteExpense(token, id);
        loadExpenses();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />

            <main className="ml-64 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold">Gastos</h1>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                    >
                        + Nuevo gasto
                    </button>
                </div>

                <div className="bg-white rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left">Fecha</th>
                                <th className="px-4 py-3 text-left">Categoría</th>
                                <th className="px-4 py-3 text-left">Descripción</th>
                                <th className="px-4 py-3 text-left">Importe</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map((e) => (
                                <tr key={e.id} className="border-t">
                                    <td className="px-4 py-3">{e.date}</td>
                                    <td className="px-4 py-3">{e.category}</td>
                                    <td className="px-4 py-3">{e.description}</td>
                                    <td className="px-4 py-3">€{e.amount}</td>
                                    <td className="px-4 py-3 text-right space-x-3">
                                        <button onClick={() => setEditing(e)} className="text-indigo-600">
                                            Editar
                                        </button>
                                        <button onClick={() => handleDelete(e.id)} className="text-red-600">
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
                            <ExpenseForm
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
