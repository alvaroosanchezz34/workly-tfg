import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';

export const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const { token, isAuthenticated } = useContext(AuthContext);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);

    const loadNotifications = useCallback(async () => {
        if (!token || !isAuthenticated) return;
        try {
            const notifs = await getNotifications(token);
            setNotifications(Array.isArray(notifs) ? notifs : []);
        } catch {
            // red intermitente / API caída: mantener notificaciones previas
        }
    }, [token, isAuthenticated]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos async, no derivable en el render
    useEffect(() => { loadNotifications(); }, [loadNotifications]);

    // Refrescar periódicamente mientras la sesión está activa
    useEffect(() => {
        if (!token || !isAuthenticated) return;
        const interval = setInterval(loadNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [token, isAuthenticated, loadNotifications]);

    // Atajo de teclado global ⌘K / Ctrl+K para abrir la búsqueda
    useEffect(() => {
        if (!isAuthenticated) return;
        const handle = e => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [isAuthenticated]);

    const markRead = useCallback(async id => {
        setNotifications(n => n.map(x => (x.id === id ? { ...x, is_read: 1 } : x)));
        try { await markNotificationRead(token, id); } catch { /* se corregirá en el próximo refresh */ }
    }, [token]);

    const markAllRead = useCallback(async () => {
        setNotifications(n => n.map(x => ({ ...x, is_read: 1 })));
        try { await markAllNotificationsRead(token); } catch { /* se corregirá en el próximo refresh */ }
    }, [token]);

    const unread = notifications.filter(n => !n.is_read).length;

    return (
        <UIContext.Provider value={{
            notifOpen,
            notifications,
            unread,
            toggleNotif: () => setNotifOpen(v => !v),
            closeNotif:  () => setNotifOpen(false),
            markRead,
            markAllRead,
            searchOpen,
            openSearch:  () => setSearchOpen(true),
            closeSearch: () => setSearchOpen(false),
        }}>
            {children}
        </UIContext.Provider>
    );
};
