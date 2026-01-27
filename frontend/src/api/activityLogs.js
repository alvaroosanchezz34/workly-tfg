import { fetchWithAuth } from '../context/fetchWithAuth';

export const getActivityLogs = async (token) => {
    const res = await fetch(
        `${import.meta.env.VITE_API_URL}/activity-logs`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) {
        throw new Error('Error al obtener activity logs');
    }

    return res.json();
};
