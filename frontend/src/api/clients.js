import { fetchWithAuth } from '../context/fetchWithAuth';

export const getClients = async (token) => {
    const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/clients`, token);
    if (!res.ok) throw new Error('Error al cargar clientes');
    return res.json();
};

export const createClient = async (token, data) => {
    const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/clients`, token, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear cliente');
    return res.json();
};

export const updateClient = async (token, id, data) => {
    const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/clients/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar cliente');
    return res.json();
};

export const deleteClient = async (token, id) => {
    const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/clients/${id}`, token, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar cliente');
    return true;
};

export const getDeletedClients = async (token) => {
    const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/clients/deleted`, token);
    if (!res.ok) throw new Error('Error al cargar clientes eliminados');
    return res.json();
};

export const restoreClient = async (token, id) => {
    const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/clients/${id}/restore`, token, {
        method: 'PUT',
    });
    if (!res.ok) throw new Error('Error al restaurar cliente');
    return res.json();
};

export const getClientProfile = async (token, id) => {
    const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/clients/${id}/profile`, token);
    if (!res.ok) throw new Error('Error al cargar perfil del cliente');
    return res.json();
};