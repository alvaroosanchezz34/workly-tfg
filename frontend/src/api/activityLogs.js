import { fetchWithAuth } from '../context/fetchWithAuth';

export const getActivityLogs = async (token) => {
    const res = await fetchWithAuth(
        `${import.meta.env.VITE_API_URL}/activity-logs`,
        token
    );

    if (!res.ok) {
        throw new Error('Error al obtener activity logs');
    }

    return res.json();
};