import { fetchWithAuth } from '../context/fetchWithAuth';

export const updateProfile = async (token, profileData) => {
    const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL}/users/profile`, token, {
        method: 'PUT',
        body: JSON.stringify(profileData),
    });
    if (!res.ok) throw new Error('Error al actualizar el perfil');
    return res.json();
};