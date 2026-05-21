import { fetchWithAuth } from '../context/fetchWithAuth';

const BASE = `${import.meta.env.VITE_API_URL}/activity-logs`;

export const getActivityLogs = async (token, queryString = '') => {
    const url = queryString ? `${BASE}?${queryString}` : BASE;
    const res = await fetchWithAuth(url, token);
    if (!res.ok) throw new Error('Error al obtener activity logs');
    return res.json();
};