import { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionWarning, setSessionWarning] = useState(null);
    const extendSession = () => {
        localStorage.setItem("loginTime", Date.now());
        setSessionWarning(null);
    };


    useEffect(() => {
        if (loading || !token) return;

        const MAX_SESSION_TIME = 30 * 60 * 1000;
        const WARNING_TIME = 5 * 60 * 1000;


        const interval = setInterval(() => {
            const loginTime = localStorage.getItem("loginTime");
            if (!loginTime) return;

            const elapsed = Date.now() - Number(loginTime);
            const remaining = MAX_SESSION_TIME - elapsed;

            if (remaining <= WARNING_TIME && remaining > 0) {
                setSessionWarning(Math.ceil(remaining / 1000));
            } else {
                setSessionWarning(null);
            }
        }, 1000); // cada segundo

        return () => clearInterval(interval);
    }, [token, loading]);


    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedRefreshToken = localStorage.getItem('refreshToken');
        const storedUser = localStorage.getItem('user');
        const loginTime = localStorage.getItem("loginTime");

        const MAX_SESSION_TIME = 30 * 60 * 1000;

        if (!storedToken || !storedUser || !loginTime || !storedRefreshToken) {
            setLoading(false);
            return;
        }

        if (Date.now() - loginTime > MAX_SESSION_TIME) {
            logout();
            return;
        }

        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setLoading(false);
    }, []);

    useEffect(() => {
        const handleStorageChange = () => {
            const storedToken = localStorage.getItem("token");

            if (!storedToken || storedToken !== token) {
                logout();
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [token]);

    const refreshAccessToken = async () => {
        try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) throw new Error("No refresh token");

            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/auth/refresh`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken }),
                }
            );

            if (!res.ok) throw new Error("Refresh failed");

            const data = await res.json();

            setToken(data.accessToken);
            localStorage.setItem("token", data.accessToken);
            localStorage.setItem("loginTime", Date.now());

            return data.accessToken;
        } catch (err) {
            logout();
            return null;
        }
    };

    const login = (accessToken, refreshToken, userData) => {
        setToken(accessToken);
        setUser(userData);

        localStorage.setItem("token", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("loginTime", Date.now());
        localStorage.setItem("user", JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                login,
                logout,
                isAuthenticated: !!token
            }}
        >
            {sessionWarning && (
                <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b border-yellow-300 text-yellow-800 px-6 py-3 flex items-center justify-between z-50">
                    <span>
                        ⚠️ Tu sesión expirará en <strong>{sessionWarning}</strong> minuto(s)
                    </span>

                    <div className="flex gap-3">
                        <button
                            onClick={async () => {
                                await refreshAccessToken();
                                setSessionWarning(null);
                            }}
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
