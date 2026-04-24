// frontend/src/api/invoices.js
import { fetchWithAuth } from '../context/fetchWithAuth';

const BASE = `${import.meta.env.VITE_API_URL}/invoices`;

export const getInvoices = (token, filters = {}) => {
    const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null))
    );
    const url = params.toString() ? `${BASE}?${params}` : BASE;
    return fetchWithAuth(url, token).then(r => r.json());
};

export const getInvoiceById = (token, id) =>
    fetchWithAuth(`${BASE}/${id}`, token).then(r => r.json());

export const createInvoice = (token, data) =>
    fetchWithAuth(BASE, token, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());

export const updateInvoice = (token, id, data) =>
    fetchWithAuth(`${BASE}/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json());

export const deleteInvoice = (token, id) =>
    fetchWithAuth(`${BASE}/${id}`, token, { method: 'DELETE' });

export const updateInvoiceStatus = (token, id, status) =>
    fetchWithAuth(`${BASE}/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) }).then(r => r.json());

export const getPayments   = (token, id)            => fetchWithAuth(`${BASE}/${id}/payments`, token).then(r => r.json());
export const addPayment    = (token, id, data)       => fetchWithAuth(`${BASE}/${id}/payments`, token, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());
export const deletePayment = (token, id, paymentId)  => fetchWithAuth(`${BASE}/${id}/payments/${paymentId}`, token, { method: 'DELETE' });

export const getInvoiceStats       = (token)        => fetchWithAuth(`${BASE}/stats`, token).then(r => r.json());
export const getInvoiceSettings    = (token)        => fetchWithAuth(`${BASE}/settings`, token).then(r => r.json());
export const updateInvoiceSettings = (token, data)  => fetchWithAuth(`${BASE}/settings`, token, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json());

export const downloadInvoicePDF = async (token, id) => {
    const res = await fetchWithAuth(`${BASE}/${id}/pdf`, token);
    if (!res.ok) throw new Error('Error al descargar PDF');
    const blob = await res.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `factura-${id}.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};