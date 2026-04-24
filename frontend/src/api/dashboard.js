import { fetchWithAuth } from '../context/fetchWithAuth';

export const getDashboard = async (token) => {
    const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/dashboard`, token);
    if (!res.ok) throw new Error('Error al cargar dashboard');
    return res.json();
};