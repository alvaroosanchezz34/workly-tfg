import { createContext, useCallback, useEffect, useRef, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionWarning, setSessionWarning] = useState(null);

    // Ref para evitar doble refresh simultáneo
    const isRefreshing = useRef(false);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        // FIX: limpiar también refreshToken y loginTime
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        window.location.href = '/';
    }, []);

    // FIX: exponer refreshAccessToken desde el contexto para evitar duplicación
    const refreshAccessToken = useCallback(async () => {
        if (isRefreshing.current) return null;
        isRefreshing.current = true;

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

            if (!res.ok) throw new Error('Refresh failed');

            const data = await res.json();

            setToken(data.accessToken);
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('loginTime', Date.now());
            setSessionWarning(null);

            return data.accessToken;
        } catch (err) {
            logout();
            return null;
        } finally {
            isRefreshing.current = false;
        }
    }, [logout]);

    // Aviso de sesión próxima a expirar
    useEffect(() => {
        if (loading || !token) return;

        const MAX_SESSION_TIME = 30 * 60 * 1000;
        const WARNING_TIME = 5 * 60 * 1000;

        const interval = setInterval(() => {
            const loginTime = localStorage.getItem('loginTime');
            if (!loginTime) return;

            const elapsed = Date.now() - Number(loginTime);
            const remaining = MAX_SESSION_TIME - elapsed;

            if (remaining <= WARNING_TIME && remaining > 0) {
                setSessionWarning(Math.ceil(remaining / 1000));
            } else if (remaining <= 0) {
                logout();
            } else {
                setSessionWarning(null);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [token, loading, logout]);

    // Restaurar sesión al cargar
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedRefreshToken = localStorage.getItem('refreshToken');
        const storedUser = localStorage.getItem('user');
        const loginTime = localStorage.getItem('loginTime');

        const MAX_SESSION_TIME = 30 * 60 * 1000;

        if (!storedToken || !storedUser || !loginTime || !storedRefreshToken) {
            setLoading(false);
            return;
        }

        if (Date.now() - Number(loginTime) > MAX_SESSION_TIME) {
            logout();
            setLoading(false);
            return;
        }

        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setLoading(false);
    }, [logout]);

    // Detectar cambios de token en otras pestañas
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'token' && !e.newValue) {
                logout();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [logout]);

    const login = (accessToken, refreshToken, userData) => {
        setToken(accessToken);
        setUser(userData);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('loginTime', Date.now());
        localStorage.setItem('user', JSON.stringify(userData));
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                login,
                logout,
                refreshAccessToken,   // FIX: expuesto para que fetchWithAuth lo use
                isAuthenticated: !!token,
            }}
        >
            {sessionWarning && (
                <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b border-yellow-300 text-yellow-800 px-6 py-3 flex items-center justify-between z-50">
                    <span>
                        ⚠️ Tu sesión expirará en{' '}
                        <strong>{Math.ceil(sessionWarning / 60)}</strong> minuto(s)
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={refreshAccessToken}
                            className="px-3 py-1 bg-yellow-500 text-white rounded"
                        >
                            Seguir conectado
                        </button>
                        <button
                            onClick={logout}
                            className="px-3 py-1 bg-red-500 text-white rounded"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            )}

            {!loading && children}
        </AuthContext.Provider>
    );
};