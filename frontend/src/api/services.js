const API_URL = `${import.meta.env.VITE_API_URL}/services`;

export const getServices = async (token) => {
    const res = await fetch(API_URL, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) throw new Error('Error al cargar servicios');
    return res.json();
};

export const createService = async (token, data) => {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Error al crear servicio');
    return res.json();
};

export const updateService = async (token, id, data) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error('Error al actualizar servicio');
    return res.json();
};

export const deleteService = async (token, id) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!res.ok) throw new Error('Error al eliminar servicio');
    return true;
};
