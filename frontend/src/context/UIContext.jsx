import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from './AuthContext';

export const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const { token, isAuthenticated } = useContext(AuthContext);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);

    const loadNotifications = useCallback(async () => {
        if (!token || !isAuthenticated) return;
        try {
            const API = import.meta.env.VITE_API_URL;
            const headers = { Authorization: `Bearer ${token}` };
            const [invRes, projRes] = await Promise.all([
                fetch(`${API}/invoices?limit=100`, { headers }),
                fetch(`${API}/projects`,           { headers }),
            ]);
            const invData  = invRes.ok  ? await invRes.json()  : {};
            const projData = projRes.ok ? await projRes.json() : [];
            // invoices devuelve {data, pagination} — extraer el array
            const invoices = Array.isArray(invData)      ? invData      : (invData?.data   ?? []);
            const projects = Array.isArray(projData)     ? projData     : (projData?.data  ?? []);
            const today = new Date();
            const in7   = new Date(); in7.setDate(today.getDate() + 7);
            const notifs = [];
            invoices.forEach(inv => {
                if (inv.status === 'overdue') notifs.push({ id: `inv-ov-${inv.id}`, type: 'overdue', title: 'Factura vencida', body: `${inv.invoice_number} — ${inv.client_name}`, link: '/invoices', read: false });
                else if (inv.status === 'sent' && inv.due_date && new Date(inv.due_date) <= in7 && new Date(inv.due_date) >= today) notifs.push({ id: `inv-soon-${inv.id}`, type: 'warning', title: 'Factura vence pronto', body: inv.invoice_number, link: '/invoices', read: false });
            });
            projects.forEach(proj => {
                if (['completed','cancelled'].includes(proj.status) || !proj.end_date) return;
                const end = new Date(proj.end_date);
                if (end < today) notifs.push({ id: `proj-ov-${proj.id}`, type: 'overdue', title: 'Proyecto vencido', body: proj.title, link: '/projects', read: false });
            });
            setNotifications(notifs.slice(0, 15));
        } catch {
            // red intermitente / API caída: mantener notificaciones previas
        }
    }, [token, isAuthenticated]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos async, no derivable en el render
    useEffect(() => { loadNotifications(); }, [loadNotifications]);

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

    const unread = notifications.filter(n => !n.read).length;

    return (
        <UIContext.Provider value={{
            notifOpen,
            notifications,
            unread,
            toggleNotif: () => setNotifOpen(v => !v),
            closeNotif:  () => setNotifOpen(false),
            markAllRead: () => setNotifications(n => n.map(x => ({ ...x, read: true }))),
            searchOpen,
            openSearch:  () => setSearchOpen(true),
            closeSearch: () => setSearchOpen(false),
        }}>
            {children}
        </UIContext.Provider>
    );
};