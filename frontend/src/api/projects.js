const API_URL = `${import.meta.env.VITE_API_URL}/projects`;

export const getProjects = async (token) => {
    const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al cargar proyectos');
    return res.json();
};

export const createProject = async (token, data) => {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear proyecto');
    return res.json();
};

export const updateProject = async (token, id, data) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar proyecto');
    return res.json();
};

export const deleteProject = async (token, id) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al eliminar proyecto');
    return true;
};
