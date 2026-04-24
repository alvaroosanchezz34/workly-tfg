import { fetchWithAuth } from '../context/fetchWithAuth';

const API_URL = `${import.meta.env.VITE_API_URL}/services`;

export const getServices = async (token) => {
    const res = await fetchWithAuth(API_URL, token);
    if (!res.ok) throw new Error('Error al cargar servicios');
    return res.json();
};

export const createService = async (token, data) => {
    const res = await fetchWithAuth(API_URL, token, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear servicio');
    return res.json();
};

export const updateService = async (token, id, data) => {
    const res = await fetchWithAuth(`${API_URL}/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar servicio');
    return res.json();
};

export const deleteService = async (token, id) => {
    const res = await fetchWithAuth(`${API_URL}/${id}`, token, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar servicio');
    return true;
};