// frontend/src/api/tasks.js
import { fetchWithAuth } from '../context/fetchWithAuth';

const base = (projectId) => `${import.meta.env.VITE_API_URL}/projects/${projectId}/tasks`;

export const getTasks    = (token, projectId) =>
    fetchWithAuth(base(projectId), token).then(r => r.json());

export const createTask  = (token, projectId, data) =>
    fetchWithAuth(base(projectId), token, {
        method: 'POST', body: JSON.stringify(data),
    }).then(r => r.json());

export const updateTask  = (token, projectId, taskId, data) =>
    fetchWithAuth(`${base(projectId)}/${taskId}`, token, {
        method: 'PUT', body: JSON.stringify(data),
    }).then(r => r.json());

export const deleteTask  = (token, projectId, taskId) =>
    fetchWithAuth(`${base(projectId)}/${taskId}`, token, {
        method: 'DELETE',
    }).then(r => r.json());

export const moveTask    = (token, projectId, taskId, status, position) =>
    fetchWithAuth(`${base(projectId)}/${taskId}/move`, token, {
        method: 'PATCH', body: JSON.stringify({ status, position }),
    }).then(r => r.json());
