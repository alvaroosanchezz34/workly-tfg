// frontend/src/components/Sidebar.jsx
import {
    LayoutDashboard, Users, FolderOpen, FileText, ShieldCheck,
    CreditCard, Wrench, Activity, Trash2, Crown, BookOpen,
    ChevronUp, LogOut, UserCircle, Bell, Search, Moon, Sun, Timer,
    CalendarDays, Menu, X, Building2,
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { UIContext } from '../context/UIContext';
import useIsMobile from '../hooks/useIsMobile';

export default function Sidebar() {
    const { logout, user }                    = useContext(AuthContext);
    const { theme, toggle }                   = useContext(ThemeContext);
    const { openSearch, toggleNotif, unread } = useContext(UIContext);

    const navigate  = useNavigate();
    const location  = useLocation();
    const isMobile  = useIsMobile();
    const [open, setOpen]     = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const btnRef  = useRef(null);

    // Cerrar drawer al cambiar de ruta en móvil (reacciona a la navegación, no a datos derivables en el render)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { if (isMobile) setOpen(false); }, [location.pathname, isMobile]);

    // Cerrar popup de usuario al hacer click fuera
    useEffect(() => {
        const close = e => {
            if (menuOpen
                && menuRef.current && !menuRef.current.contains(e.target)
                && btnRef.current  && !btnRef.current.contains(e.target))
                setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [menuOpen]);

    // Bloquear scroll del body cuando el drawer está abierto
    useEffect(() => {
        if (isMobile) document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open, isMobile]);

    const handleLogout = () => { logout(); navigate('/'); };
    const initials = user?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'U';

    return (
        <>
            {/* ── Botón hamburguesa (solo móvil) ── */}
            <button
                className="sidebar-toggle"
                onClick={() => setOpen(v => !v)}
                aria-label="Abrir menú"
            >
                {open ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* ── Overlay ── */}
            {isMobile && (
                <div
                    className={`sidebar-overlay${open ? ' visible' : ''}`}
                    onClick={() => setOpen(false)}
                />
            )}

            {/* ── Sidebar / Drawer ── */}
            <aside className={`sidebar${isMobile && open ? ' open' : ''}`}>

                {/* LOGO */}
                <div className="sidebar-logo">
                    <img src="/logo.png" alt="Workly" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="sidebar-logo-name">WORKLY</div>
                        <div className="sidebar-logo-sub">Gestión freelance</div>
                    </div>
                    <button
                        onClick={toggle}
                        title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                        style={{ width: 28, height: 28, border: 'none', borderRadius: 6, background: 'rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
                    >
                        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                </div>

                {/* BUSCADOR */}
                <button
                    onClick={openSearch}
                    style={{ margin: '10px 10px 4px', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 12.5, fontFamily: 'inherit', width: 'calc(100% - 20px)' }}
                >
                    <Search size={13} />
                    <span style={{ flex: 1, textAlign: 'left' }}>Buscar…</span>
                    <kbd style={{ fontSize: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 5px' }}>⌘K</kbd>
                </button>

                {/* NAV */}
                <nav className="sidebar-nav">
                    <span className="sidebar-section-label">Principal</span>
                    <Item to="/dashboard" icon={<LayoutDashboard size={16}/>} label="Dashboard" />
                    <Item to="/clients"   icon={<Users size={16}/>}           label="Clientes" />
                    <Item to="/projects"  icon={<FolderOpen size={16}/>}      label="Proyectos" />
                    <Item to="/invoices"  icon={<FileText size={16}/>}        label="Facturas" />
                    <Item to="/verifactu" icon={<ShieldCheck size={16}/>}      label="VeriFactu" />

                    <span className="sidebar-section-label" style={{ marginTop: 8 }}>Finanzas</span>
                    <Item to="/expenses"  icon={<CreditCard size={16}/>}    label="Gastos" />
                    <Item to="/services"  icon={<Wrench size={16}/>}        label="Servicios" />
                    <Item to="/time"      icon={<Timer size={16}/>}         label="Control de horas" />
                    <Item to="/calendar"  icon={<CalendarDays size={16}/>}  label="Calendario" />

                    {user?.role === 'admin' && (
                        <>
                            <div className="sidebar-divider" />
                            <span className="sidebar-section-label">Admin</span>
                            <Item to="/activity"        icon={<Activity size={16}/>} label="Actividad"           badge="Admin" />
                            <Item to="/clients/deleted" icon={<Trash2 size={16}/>}   label="Clientes eliminados" badge="Admin" />
                        </>
                    )}

                    <div className="sidebar-divider" />
                    <Item to="/billing"    icon={<Crown size={16}/>}    label="Plan y facturación" />
                    <Item to="/accounting" icon={<BookOpen size={16}/>} label="Contabilidad" />
                    {user?.company_id
                        ? <Item to="/team" icon={<Users size={16}/>} label="Equipo" />
                        : <Item to="/company/setup" icon={<Building2 size={16}/>} label="Crear empresa" />
                    }
                </nav>

                {/* USER BLOCK */}
                <div className="sidebar-user">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 4px 8px' }}>
                        <button
                            onClick={toggleNotif}
                            title="Notificaciones"
                            style={{ position: 'relative', width: 32, height: 32, border: 'none', borderRadius: 6, background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: unread > 0 ? '#FFA726' : 'rgba(255,255,255,0.45)' }}
                        >
                            <Bell size={15} />
                            {unread > 0 && (
                                <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, background: '#F44336', borderRadius: '50%', border: '1.5px solid #121212' }} />
                            )}
                        </button>
                    </div>

                    <button ref={btnRef} className="sidebar-user-btn" onClick={() => setMenuOpen(v => !v)}>
                        {user?.avatar_url
                            ? <img src={user.avatar_url} alt="avatar" className="sidebar-avatar" style={{ objectFit: 'cover' }} />
                            : <div className="sidebar-avatar">{initials}</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="sidebar-user-name">{user?.name || 'Usuario'}</div>
                            <div className="sidebar-user-sub">{user?.company_name || user?.email || ''}</div>
                        </div>
                        <ChevronUp size={13} style={{ color: 'rgba(255,255,255,0.25)', transition: 'transform .2s', transform: menuOpen ? 'rotate(0deg)' : 'rotate(180deg)', flexShrink: 0 }} />
                    </button>

                    <div ref={menuRef} className={`popup-menu ${menuOpen ? 'open' : 'closed'}`}>
                        <NavLink to="/profile" onClick={() => setMenuOpen(false)} className="popup-item">
                            <UserCircle size={14} /> Editar perfil
                        </NavLink>
                        <div className="popup-separator" />
                        <button onClick={() => { toggle(); setMenuOpen(false); }} className="popup-item">
                            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                        </button>
                        <div className="popup-separator" />
                        <button onClick={handleLogout} className="popup-item popup-item-danger">
                            <LogOut size={14} /> Cerrar sesión
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

const Item = ({ to, icon, label, badge }) => (
    <NavLink to={to} className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
        <span className="sidebar-icon">{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        {badge && <span className="sidebar-badge">{badge}</span>}
    </NavLink>
);