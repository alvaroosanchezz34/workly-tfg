// frontend/src/api/timeTracking.js
import { fetchWithAuth } from '../context/fetchWithAuth';

const BASE = `${import.meta.env.VITE_API_URL}/time`;

export const getTimeEntries  = (token, params = '') =>
    fetchWithAuth(`${BASE}${params ? '?' + params : ''}`, token).then(r => r.json());

export const getActiveEntry  = (token) =>
    fetchWithAuth(`${BASE}/active`, token).then(r => r.json());

export const getTimeStats    = (token) =>
    fetchWithAuth(`${BASE}/stats`, token).then(r => r.json());

export const startTimer      = (token, data) =>
    fetchWithAuth(`${BASE}/start`, token, {
        method: 'POST', body: JSON.stringify(data),
    }).then(r => r.json());

export const stopTimer       = (token, id) =>
    fetchWithAuth(`${BASE}/${id}/stop`, token, {
        method: 'PATCH',
    }).then(r => r.json());

export const addManualEntry  = (token, data) =>
    fetchWithAuth(`${BASE}/manual`, token, {
        method: 'POST', body: JSON.stringify(data),
    }).then(r => r.json());

export const deleteTimeEntry = (token, id) =>
    fetchWithAuth(`${BASE}/${id}`, token, {
        method: 'DELETE',
    }).then(r => r.json());
