const API_URL = `${import.meta.env.VITE_API_URL}/expenses`;

export const getExpenses = async (token) => {
    const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al cargar gastos');
    return res.json();
};

export const createExpense = async (token, data) => {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear gasto');
    return res.json();
};

export const updateExpense = async (token, id, data) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar gasto');
    return res.json();
};

export const deleteExpense = async (token, id) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al eliminar gasto');
    return true;
};
