const API_URL = `${import.meta.env.VITE_API_URL}/invoices`;

export const getInvoices = async (token) => {
    const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al cargar facturas');
    return res.json();
};

export const getInvoiceById = async (token, id) => {
    const res = await fetch(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al cargar factura');
    return res.json();
};

export const createInvoice = async (token, data) => {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear factura');
    return res.json();
};

export const deleteInvoice = async (token, id) => {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al eliminar factura');
    return true;
};

export const downloadInvoicePDF = async (token, id) => {
    const res = await fetch(`${API_URL}/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Error al descargar PDF');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${id}.pdf`;
    a.click();
};

export const updateInvoice = async (token, id, data) => {
    const res = await fetch(
        `${API_URL}/${id}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        }
    );

    if (!res.ok) throw new Error("Error al actualizar factura");
    return res.json();
};
