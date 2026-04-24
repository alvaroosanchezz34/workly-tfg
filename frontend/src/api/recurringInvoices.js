// frontend/src/api/recurringInvoices.js
import { fetchWithAuth } from '../context/fetchWithAuth';
const URL = `${import.meta.env.VITE_API_URL}/recurring-invoices`;

export const getRecurring              = (token)           => fetchWithAuth(URL, token).then(r => r.json());
export const getRecurringById          = (token, id)       => fetchWithAuth(`${URL}/${id}`, token).then(r => r.json());
export const createRecurring           = (token, data)     => fetchWithAuth(URL, token, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());
export const updateRecurringStatus     = (token, id, status) => fetchWithAuth(`${URL}/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) }).then(r => r.json());
export const deleteRecurring           = (token, id)       => fetchWithAuth(`${URL}/${id}`, token, { method: 'DELETE' });