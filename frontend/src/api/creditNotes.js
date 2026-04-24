// frontend/src/api/creditNotes.js
import { fetchWithAuth } from '../context/fetchWithAuth';
const URL = `${import.meta.env.VITE_API_URL}/credit-notes`;

export const getCreditNotes    = (token)        => fetchWithAuth(URL, token).then(r => r.json());
export const getCreditNoteById = (token, id)    => fetchWithAuth(`${URL}/${id}`, token).then(r => r.json());
export const createCreditNote  = (token, data)  => fetchWithAuth(URL, token, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());
export const issueCreditNote   = (token, id)    => fetchWithAuth(`${URL}/${id}/issue`, token, { method: 'PATCH' }).then(r => r.json());
export const deleteCreditNote  = (token, id)    => fetchWithAuth(`${URL}/${id}`, token, { method: 'DELETE' });