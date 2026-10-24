import { fetchWithAuth } from '../context/fetchWithAuth';

const BASE = `${import.meta.env.VITE_API_URL}/verifactu`;

const parse = async res => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'No se pudo completar la operación');
    return data;
};

export const getVerifactuSettings = token =>
    fetchWithAuth(`${BASE}/settings`, token).then(parse);

export const saveVerifactuSettings = (token, data) =>
    fetchWithAuth(`${BASE}/settings`, token, { method: 'PUT', body: JSON.stringify(data) }).then(parse);

export const uploadVerifactuCertificate = (token, data) =>
    fetchWithAuth(`${BASE}/certificate`, token, { method: 'POST', body: JSON.stringify(data) }).then(parse);

export const deleteVerifactuCertificate = (token, scope = 'issuer') =>
    fetchWithAuth(`${BASE}/certificate?scope=${scope}`, token, { method: 'DELETE' }).then(parse);

export const getVerifactuRecords = (token, invoiceId) => {
    const url = invoiceId ? `${BASE}/records?invoiceId=${invoiceId}` : `${BASE}/records`;
    return fetchWithAuth(url, token).then(parse);
};

export const resubmitVerifactuRecord = (token, id) =>
    fetchWithAuth(`${BASE}/records/${id}/resubmit`, token, { method: 'POST', body: '{}' }).then(parse);

export const getDeclaracionResponsable = token =>
    fetchWithAuth(`${BASE}/declaracion`, token).then(parse);
