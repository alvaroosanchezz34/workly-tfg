// frontend/src/api/quotes.js
import { fetchWithAuth } from '../context/fetchWithAuth';
const URL = `${import.meta.env.VITE_API_URL}/quotes`;

export const getQuotes          = (token)         => fetchWithAuth(URL, token).then(r => r.json());
export const getQuoteById       = (token, id)     => fetchWithAuth(`${URL}/${id}`, token).then(r => r.json());
export const createQuote        = (token, data)   => fetchWithAuth(URL, token, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());
export const updateQuote        = (token, id, d)  => fetchWithAuth(`${URL}/${id}`, token, { method: 'PUT', body: JSON.stringify(d) }).then(r => r.json());
export const deleteQuote        = (token, id)     => fetchWithAuth(`${URL}/${id}`, token, { method: 'DELETE' });
export const convertQuote       = (token, id, d)  => fetchWithAuth(`${URL}/${id}/convert`, token, { method: 'POST', body: JSON.stringify(d) }).then(r => r.json());