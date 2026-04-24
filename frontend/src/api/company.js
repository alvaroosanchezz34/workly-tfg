// frontend/src/api/company.js
import { fetchWithAuth } from '../context/fetchWithAuth';

const BASE = `${import.meta.env.VITE_API_URL}/company`;

export const getMyCompany    = (token)        => fetchWithAuth(BASE, token).then(r => r.json());
export const createCompany   = (token, data)  => fetchWithAuth(BASE, token, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());
export const updateCompany   = (token, data)  => fetchWithAuth(BASE, token, { method: 'PUT',  body: JSON.stringify(data) }).then(r => r.json());

export const getTeamMembers  = (token)               => fetchWithAuth(`${BASE}/team`, token).then(r => r.json());
export const inviteMember    = (token, data)          => fetchWithAuth(`${BASE}/team/invite`, token, { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());
export const updateMemberRole   = (token, userId, role)   => fetchWithAuth(`${BASE}/team/${userId}/role`,   token, { method: 'PATCH', body: JSON.stringify({ role })   }).then(r => r.json());
export const updateMemberStatus = (token, userId, status) => fetchWithAuth(`${BASE}/team/${userId}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) }).then(r => r.json());
export const removeMember    = (token, userId)        => fetchWithAuth(`${BASE}/team/${userId}`, token, { method: 'DELETE' });

export const getTeamDashboard = (token)                  => fetchWithAuth(`${BASE}/dashboard`, token).then(r => r.json());
export const assignClient     = (token, clientId, userId)  => fetchWithAuth(`${BASE}/clients/${clientId}/assign`,   token, { method: 'PATCH', body: JSON.stringify({ userId }) }).then(r => r.json());
export const assignProject    = (token, projectId, userId) => fetchWithAuth(`${BASE}/projects/${projectId}/assign`, token, { method: 'PATCH', body: JSON.stringify({ userId }) }).then(r => r.json());