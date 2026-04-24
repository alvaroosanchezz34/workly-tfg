import { createContext, useCallback, useEffect, useRef, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token,          setToken]          = useState(null);
    const [user,           setUser]           = useState(null);
    const [company,        setCompany]        = useState(null);
    const [companyRole,    setCompanyRole]    = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [sessionWarning, setSessionWarning] = useState(null);
    const isRefreshing = useRef(false);

    const logout = useCallback(() => {
        setToken(null); setUser(null); setCompany(null); setCompanyRole(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('company');
        localStorage.removeItem('companyRole');
        localStorage.removeItem('loginTime');
        window.location.href = '/';
    }, []);

    const refreshAccessToken = useCallback(async () => {
        if (isRefreshing.current) return null;
        isRefreshing.current = true;
        try {
            const storedRefreshToken = localStorage.getItem('refreshToken');
            if (!storedRefreshToken) throw new Error('No refresh token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: storedRefreshToken }),
            });
            if (!res.ok) throw new Error('Refresh failed');
            const data = await res.json();
            setToken(data.accessToken);
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('loginTime', Date.now());
            setSessionWarning(null);
            return data.accessToken;
        } catch {
            logout(); return null;
        } finally {
            isRefreshing.current = false;
        }
    }, [logout]);

    // Aviso sesión próxima a expirar
    useEffect(() => {
        if (loading || !token) return;
        const MAX = 30 * 60 * 1000;
        const WARN = 5 * 60 * 1000;
        const interval = setInterval(() => {
            const loginTime = localStorage.getItem('loginTime');
            if (!loginTime) return;
            const remaining = MAX - (Date.now() - Number(loginTime));
            if (remaining <= WARN && remaining > 0) setSessionWarning(Math.ceil(remaining / 1000));
            else if (remaining <= 0) logout();
            else setSessionWarning(null);
        }, 1000);
        return () => clearInterval(interval);
    }, [token, loading, logout]);

    // Restaurar sesión
    useEffect(() => {
        const storedToken       = localStorage.getItem('token');
        const storedRefresh     = localStorage.getItem('refreshToken');
        const storedUser        = localStorage.getItem('user');
        const storedCompany     = localStorage.getItem('company');
        const storedCompanyRole = localStorage.getItem('companyRole');
        const loginTime         = localStorage.getItem('loginTime');
        const MAX               = 30 * 60 * 1000;

        if (!storedToken || !storedUser || !loginTime || !storedRefresh) {
            setLoading(false); return;
        }
        if (Date.now() - Number(loginTime) > MAX) {
            logout(); setLoading(false); return;
        }
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedCompany)     setCompany(JSON.parse(storedCompany));
        if (storedCompanyRole) setCompanyRole(storedCompanyRole);
        setLoading(false);
    }, [logout]);

    // Detectar cambios en otras pestañas
    useEffect(() => {
        const handle = e => { if (e.key === 'token' && !e.newValue) logout(); };
        window.addEventListener('storage', handle);
        return () => window.removeEventListener('storage', handle);
    }, [logout]);

    const login = (accessToken, refreshToken, userData, companyData = null, role = null) => {
        setToken(accessToken);
        setUser(userData);
        setCompany(companyData);
        setCompanyRole(role);
        localStorage.setItem('token',        accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('loginTime',    Date.now());
        localStorage.setItem('user',         JSON.stringify(userData));
        if (companyData) localStorage.setItem('company',     JSON.stringify(companyData));
        if (role)        localStorage.setItem('companyRole', role);
    };

    const updateCompanyContext = (companyData, role) => {
        setCompany(companyData);
        setCompanyRole(role);
        localStorage.setItem('company',     JSON.stringify(companyData));
        localStorage.setItem('companyRole', role);
    };

    // Helpers de rol
    const isCompanyAdmin = companyRole === 'admin' || user?.role === 'admin' || user?.role === 'company_admin';
    const isTechnician   = companyRole === 'technician' || user?.role === 'technician';
    const hasCompany     = !!company;

    return (
        <AuthContext.Provider value={{
            token, user, company, companyRole,
            login, logout, refreshAccessToken,
            updateCompanyContext,
            isAuthenticated: !!token,
            isCompanyAdmin,
            isTechnician,
            hasCompany,
        }}>
            {sessionWarning && (
                <div className="fixed top-0 left-0 right-0 bg-yellow-100 border-b border-yellow-300 text-yellow-800 px-6 py-3 flex items-center justify-between z-50">
                    <span>⚠️ Tu sesión expirará en <strong>{Math.ceil(sessionWarning / 60)}</strong> minuto(s)</span>
                    <div className="flex gap-3">
                        <button onClick={refreshAccessToken} className="px-3 py-1 bg-yellow-500 text-white rounded">Seguir conectado</button>
                        <button onClick={logout} className="px-3 py-1 bg-red-500 text-white rounded">Cerrar sesión</button>
                    </div>
                </div>
            )}
            {!loading && children}
        </AuthContext.Provider>
    );
};