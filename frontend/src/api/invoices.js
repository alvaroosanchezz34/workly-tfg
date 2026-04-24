import { fetchWithAuth } from '../context/fetchWithAuth';

const API_URL = `${import.meta.env.VITE_API_URL}/invoices`;

export const getInvoices = async (token) => {
    const res = await fetchWithAuth(API_URL, token);
    if (!res.ok) throw new Error('Error al cargar facturas');
    return res.json();
};

export const getInvoiceById = async (token, id) => {
    const res = await fetchWithAuth(`${API_URL}/${id}`, token);
    if (!res.ok) throw new Error('Error al cargar factura');
    return res.json();
};

export const createInvoice = async (token, data) => {
    const res = await fetchWithAuth(API_URL, token, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear factura');
    return res.json();
};

export const updateInvoice = async (token, id, data) => {
    const res = await fetchWithAuth(`${API_URL}/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar factura');
    return res.json();
};

export const deleteInvoice = async (token, id) => {
    const res = await fetchWithAuth(`${API_URL}/${id}`, token, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar factura');
    return true;
};

export const downloadInvoicePDF = async (token, id) => {
    const res = await fetchWithAuth(`${API_URL}/${id}/pdf`, token);
    if (!res.ok) throw new Error('Error al descargar PDF');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // FIX: liberar la URL del objeto para evitar memory leak
    window.URL.revokeObjectURL(url);
};