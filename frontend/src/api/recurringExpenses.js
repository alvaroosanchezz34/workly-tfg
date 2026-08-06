import { fetchWithAuth } from '../context/fetchWithAuth';

const BASE = `${import.meta.env.VITE_API_URL}/recurring-expenses`;

export const getRecurringExpenses = (token) =>
    fetchWithAuth(BASE, token).then(r => r.json());

export const createRecurringExpense = (token, data) =>
    fetchWithAuth(BASE, token, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());

export const updateRecurringExpenseStatus = (token, id, status) =>
    fetchWithAuth(`${BASE}/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) }).then(r => r.json());

export const deleteRecurringExpense = (token, id) =>
    fetchWithAuth(`${BASE}/${id}`, token, { method: 'DELETE' }).then(r => r.json());
