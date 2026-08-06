// FIX: centralizado para evitar doble refresh simultáneo
// Usa la misma lógica que AuthContext para coherencia

const logoutHard = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    window.location.href = '/';
};

let refreshPromise = null; // evitar múltiples refreshes en paralelo

// AuthContext se suscribe a esto para mantener su estado `token` sincronizado
// cuando el refresh ocurre aquí (fuera de React), evitando que las páginas sigan
// usando un token expirado y disparen un 401 + refresh en cada petición siguiente.
let onTokenRefreshed = null;
export const setTokenRefreshListener = fn => { onTokenRefreshed = fn; };

const doRefresh = async () => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const storedRefreshToken = localStorage.getItem('refreshToken');
            if (!storedRefreshToken) throw new Error('No refresh token');

            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/auth/refresh`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: storedRefreshToken }),
                }
            );

            if (!res.ok) throw new Error('Refresh inválido');

            const data = await res.json();
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('loginTime', Date.now());
            onTokenRefreshed?.(data.accessToken);
            return data.accessToken;
        } catch {
            logoutHard();
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
};

export const fetchWithAuth = async (url, token, options = {}) => {
    let res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) {
        const newToken = await doRefresh();
        if (!newToken) throw new Error('Sesión expirada');

        res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
            },
        });
    }

    return res;
};