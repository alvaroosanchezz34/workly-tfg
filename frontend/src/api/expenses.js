import { fetchWithAuth } from '../context/fetchWithAuth';

const API_URL = `${import.meta.env.VITE_API_URL}/expenses`;

export const getExpenses = async (token) => {
    const res = await fetchWithAuth(API_URL, token);
    if (!res.ok) throw new Error('Error al cargar gastos');
    return res.json();
};

export const createExpense = async (token, data) => {
    const res = await fetchWithAuth(API_URL, token, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear gasto');
    return res.json();
};

export const updateExpense = async (token, id, data) => {
    const res = await fetchWithAuth(`${API_URL}/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar gasto');
    return res.json();
};

export const deleteExpense = async (token, id) => {
    const res = await fetchWithAuth(`${API_URL}/${id}`, token, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar gasto');
    return true;
};