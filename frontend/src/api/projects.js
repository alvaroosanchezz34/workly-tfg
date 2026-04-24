import { fetchWithAuth } from '../context/fetchWithAuth';

const API_URL = `${import.meta.env.VITE_API_URL}/projects`;

export const getProjects = async (token) => {
    const res = await fetchWithAuth(API_URL, token);
    if (!res.ok) throw new Error('Error al cargar proyectos');
    return res.json();
};

export const createProject = async (token, data) => {
    const res = await fetchWithAuth(API_URL, token, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear proyecto');
    return res.json();
};

export const updateProject = async (token, id, data) => {
    const res = await fetchWithAuth(`${API_URL}/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar proyecto');
    return res.json();
};

export const deleteProject = async (token, id) => {
    const res = await fetchWithAuth(`${API_URL}/${id}`, token, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar proyecto');
    return true;
};