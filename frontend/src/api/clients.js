export const getClients = async (token) => {
    const res = await fetch(
        `${import.meta.env.VITE_API_URL}/clients`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) throw new Error('Error al cargar clientes');
    return res.json();
};

export const createClient = async (token, data) => {
    const res = await fetch(
        `${import.meta.env.VITE_API_URL}/clients`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        }
    );

    if (!res.ok) throw new Error('Error al crear cliente');
    return res.json();
};

export const updateClient = async (token, id, data) => {
    const res = await fetch(
        `${import.meta.env.VITE_API_URL}/clients/${id}`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        }
    );

    if (!res.ok) throw new Error('Error al actualizar cliente');
    return res.json();
};

export const deleteClient = async (token, id) => {
    const res = await fetch(
        `${import.meta.env.VITE_API_URL}/clients/${id}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) {
        throw new Error('Error al eliminar cliente');
    }

    return true;
};

export const getDeletedClients = async (token) => {
    const res = await fetch(
        `${import.meta.env.VITE_API_URL}/clients/deleted`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) throw new Error('Error al cargar clientes eliminados');
    return res.json();
};

export const restoreClient = async (token, id) => {
    const res = await fetch(
        `${import.meta.env.VITE_API_URL}/clients/${id}/restore`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!res.ok) throw new Error('Error al restaurar cliente');
    return res.json();
};
