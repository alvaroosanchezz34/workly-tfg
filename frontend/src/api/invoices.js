// frontend/src/api/invoices.js
import { fetchWithAuth } from '../context/fetchWithAuth';

const BASE = `${import.meta.env.VITE_API_URL}/invoices`;

const parse = async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'No se pudo completar la operación');
    return data;
};

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
    fetchWithAuth(BASE, token, { method: 'POST', body: JSON.stringify(data) }).then(parse);

export const updateInvoice = (token, id, data) =>
    fetchWithAuth(`${BASE}/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }).then(parse);

export const deleteInvoice = (token, id) =>
    fetchWithAuth(`${BASE}/${id}`, token, { method: 'DELETE' });

export const updateInvoiceStatus = (token, id, status) =>
    fetchWithAuth(`${BASE}/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) }).then(parse);

export const issueInvoice = (token, id) =>
    fetchWithAuth(`${BASE}/${id}/issue`, token, { method: 'POST', body: '{}' }).then(parse);

export const voidInvoice = (token, id, reason) =>
    fetchWithAuth(`${BASE}/${id}/void`, token, { method: 'POST', body: JSON.stringify({ reason }) }).then(parse);

export const rectifyInvoice = (token, id, method) =>
    fetchWithAuth(`${BASE}/${id}/rectify`, token, { method: 'POST', body: JSON.stringify({ method }) }).then(parse);

export const getIssuerProfile = token =>
    fetchWithAuth(`${BASE}/issuer`, token).then(parse);

export const saveIssuerProfile = (token, data) =>
    fetchWithAuth(`${BASE}/issuer`, token, { method: 'PUT', body: JSON.stringify(data) }).then(parse);

export const bulkDeleteInvoices = (token, ids) =>
    fetchWithAuth(`${BASE}/bulk-delete`, token, { method: 'POST', body: JSON.stringify({ ids }) }).then(r => r.json());

export const bulkUpdateInvoiceStatus = (token, ids, status) =>
    fetchWithAuth(`${BASE}/bulk-status`, token, { method: 'POST', body: JSON.stringify({ ids, status }) }).then(r => r.json());

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
export const sendInvoiceByEmail = (token, id, to = null) =>
    fetchWithAuth(`${BASE}/${id}/send`, token, {
        method: 'POST',
        body: JSON.stringify(to ? { to } : {}),
    }).then(parse);