// frontend/src/api/ai.js
import { fetchWithAuth } from '../context/fetchWithAuth';

const BASE = `${import.meta.env.VITE_API_URL}/ai`;

export const getBusinessSummary = (token) =>
    fetchWithAuth(`${BASE}/summary`, token).then(r => r.json());

export const generateInvoiceLines = (token, description) =>
    fetchWithAuth(`${BASE}/invoice-lines`, token, {
        method: 'POST',
        body:   JSON.stringify({ description }),
    }).then(r => r.json());

export const generateSmartQuote = (token, data) =>
    fetchWithAuth(`${BASE}/smart-quote`, token, {
        method: 'POST',
        body:   JSON.stringify(data),
    }).then(r => r.json());

export const sendAIChat = (token, message, history = []) =>
    fetchWithAuth(`${BASE}/chat`, token, {
        method: 'POST',
        body:   JSON.stringify({ message, history }),
    }).then(r => r.json());

export const ocrExpense = (token, image, mime_type = 'image/jpeg') =>
    fetchWithAuth(`${BASE}/ocr-expense`, token, {
        method: 'POST',
        body:   JSON.stringify({ image, mime_type }),
    }).then(r => r.json());
