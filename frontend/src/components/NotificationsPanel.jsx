import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertCircle, Clock, FileText, CheckCircle, X } from 'lucide-react';
import { fetchWithAuth } from '../context/fetchWithAuth';

const API = import.meta.env.VITE_API_URL;

const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';

const TYPE_META = {
    overdue_invoice:  { icon: <AlertCircle size={14}/>, color: 'var(--error)',    bg: 'var(--error-light)'    },
    pending_invoice:  { icon: <Clock size={14}/>,       color: 'var(--warning)',  bg: 'var(--warning-light)'  },
    invoice_paid:     { icon: <CheckCircle size={14}/>, color: 'var(--secondary)',bg: 'var(--secondary-light)' },
    project_overdue:  { icon: <FileText size={14}/>,    color: 'var(--error)',    bg: 'var(--error-light)'    },
    project_due_soon: { icon: <Clock size={14}/>,       color: 'var(--warning)',  bg: 'var(--warning-light)'  },
};

/** Genera notificaciones locales a partir de los datos ya cargados */
export const buildNotifications = (invoices = [], projects = []) => {
    const notifs = [];
    const today  = new Date();
    const in7    = new Date(today); in7.setDate(today.getDate() + 7);

    invoices.forEach(inv => {
        if (inv.status === 'overdue') {
            notifs.push({ id: `inv-ov-${inv.id}`, type: 'overdue_invoice', title: 'Factura vencida', body: `${inv.invoice_number} — ${inv.client_name}`, date: inv.due_date, link: '/invoices', read: false });
        } else if (inv.status === 'sent' && inv.due_date) {
            const due = new Date(inv.due_date);
            if (due <= in7 && due >= today) {
                notifs.push({ id: `inv-pend-${inv.id}`, type: 'pending_invoice', title: 'Vence pronto', body: `${inv.invoice_number} vence el ${fmtDate(inv.due_date)}`, date: inv.due_date, link: '/invoices', read: false });
            }
        }
    });

    projects.forEach(proj => {
        if (proj.status !== 'completed' && proj.status !== 'cancelled' && proj.end_date) {
            const end = new Date(proj.end_date);
            if (end < today) {
                notifs.push({ id: `proj-ov-${proj.id}`, type: 'project_overdue', title: 'Proyecto vencido', body: proj.title, date: proj.end_date, link: '/projects', read: false });
            } else if (end <= in7) {
                notifs.push({ id: `proj-soon-${proj.id}`, type: 'project_due_soon', title: 'Proyecto termina pronto', body: `${proj.title} — ${fmtDate(proj.end_date)}`, date: proj.end_date, link: '/projects', read: false });
            }
        }
    });

    return notifs.slice(0, 20);
};

export default function NotificationsPanel({ notifications, onClose, onMarkAllRead }) {
    const navigate = useNavigate();
    const ref = useRef(null);

    useEffect(() => {
        const close = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [onClose]);

    const go = notif => {
        navigate(notif.link);
        onClose();
    };

    const unread = notifications.filter(n => !n.read).length;

    return (
        <div ref={ref} className="notif-dropdown" style={{ position: 'fixed', bottom: 80, left: 10, width: 320 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Bell size={14} color="var(--text-primary)" />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>Notificaciones</span>
                    {unread > 0 && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, background: 'var(--error)', color: '#fff', padding: '1px 6px', borderRadius: 99 }}>{unread}</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {unread > 0 && (
                        <button onClick={onMarkAllRead} style={{ fontSize: 11.5, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Marcar todo leído
                        </button>
                    )}
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', display: 'flex' }}>
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Lista */}
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <CheckCircle size={28} color="var(--secondary)" style={{ marginBottom: 8 }} />
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Todo al día</div>
                        <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 4 }}>No tienes notificaciones pendientes</div>
                    </div>
                ) : notifications.map(n => {
                    const meta = TYPE_META[n.type] || TYPE_META.pending_invoice;
                    return (
                        <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`} onClick={() => go(n)}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, flexShrink: 0 }}>
                                {meta.icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: n.read ? 400 : 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>
                                {n.date && <div style={{ fontSize: 10.5, color: 'var(--text-disabled)', marginTop: 2 }}>{fmtDate(n.date)}</div>}
                            </div>
                            {!n.read && (
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: 4 }} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}