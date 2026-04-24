import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from './AuthContext';

export const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const { token, isAuthenticated } = useContext(AuthContext);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const loadNotifications = useCallback(async () => {
        if (!token || !isAuthenticated) return;
        try {
            const API = import.meta.env.VITE_API_URL;
            const [invRes, projRes] = await Promise.all([
                fetch(`${API}/invoices`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const invoices = invRes.ok  ? await invRes.json()  : [];
            const projects = projRes.ok ? await projRes.json() : [];
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
        } catch {}
    }, [token, isAuthenticated]);

    useEffect(() => { loadNotifications(); }, [loadNotifications]);

    const unread = notifications.filter(n => !n.read).length;

    return (
        <UIContext.Provider value={{
            notifOpen,
            notifications,
            unread,
            toggleNotif: () => setNotifOpen(v => !v),
            closeNotif:  () => setNotifOpen(false),
            markAllRead: () => setNotifications(n => n.map(x => ({ ...x, read: true }))),
        }}>
            {children}
        </UIContext.Provider>
    );
};