import { fetchWithAuth } from '../context/fetchWithAuth';

const BASE = `${import.meta.env.VITE_API_URL}/notifications`;

export const getNotifications = async token => {
    const res = await fetchWithAuth(BASE, token);
    if (!res.ok) throw new Error('Error al obtener notificaciones');
    return res.json();
};

export const markNotificationRead = async (token, id) => {
    const res = await fetchWithAuth(`${BASE}/${id}/read`, token, { method: 'PATCH' });
    if (!res.ok) throw new Error('Error al marcar la notificación como leída');
    return res.json();
};

export const markAllNotificationsRead = async token => {
    const res = await fetchWithAuth(`${BASE}/read-all`, token, { method: 'PATCH' });
    if (!res.ok) throw new Error('Error al marcar las notificaciones como leídas');
    return res.json();
};
