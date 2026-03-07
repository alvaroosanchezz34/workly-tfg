import {
    LayoutDashboard, Users, FolderOpen, FileText,
    CreditCard, Wrench, Activity, Trash2,
    ChevronUp, LogOut, UserCircle,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Sidebar() {
    const { logout, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const btnRef  = useRef(null);

    useEffect(() => {
        const close = (e) => {
            if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)
                && btnRef.current && !btnRef.current.contains(e.target))
                setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [menuOpen]);

    const handleLogout = () => { logout(); navigate('/'); };

    const initials = user?.name?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || 'U';

    return (
        <aside className="sidebar">
            {/* ── LOGO ─────────────────────────────── */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">W</div>
                <div>
                    <div className="sidebar-logo-name">WORKLY</div>
                    <div className="sidebar-logo-sub">Gestión freelance</div>
                </div>
            </div>

            {/* ── NAV ──────────────────────────────── */}
            <nav className="sidebar-nav">
                <span className="sidebar-section-label">Principal</span>
                <Item to="/dashboard" icon={<LayoutDashboard size={16}/>} label="Dashboard" />
                <Item to="/clients"   icon={<Users size={16}/>}           label="Clientes" />
                <Item to="/projects"  icon={<FolderOpen size={16}/>}      label="Proyectos" />
                <Item to="/invoices"  icon={<FileText size={16}/>}        label="Facturas" />

                <span className="sidebar-section-label" style={{ marginTop: 8 }}>Finanzas</span>
                <Item to="/expenses"  icon={<CreditCard size={16}/>}      label="Gastos" />
                <Item to="/services"  icon={<Wrench size={16}/>}          label="Servicios" />

                {user?.role === 'admin' && (
                    <>
                        <div className="sidebar-divider" />
                        <span className="sidebar-section-label">Admin</span>
                        <Item to="/activity"        icon={<Activity size={16}/>} label="Actividad"          badge="Admin" />
                        <Item to="/clients/deleted" icon={<Trash2 size={16}/>}   label="Clientes eliminados" badge="Admin" />
                    </>
                )}
            </nav>

            {/* ── USER BLOCK ───────────────────────── */}
            <div className="sidebar-user">
                <button ref={btnRef} className="sidebar-user-btn" onClick={() => setMenuOpen(v => !v)}>
                    {user?.avatar_url
                        ? <img src={user.avatar_url} alt="avatar" className="sidebar-avatar" style={{ objectFit:'cover' }}/>
                        : <div className="sidebar-avatar">{initials}</div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                        <div className="sidebar-user-name">{user?.name || 'Usuario'}</div>
                        <div className="sidebar-user-sub">{user?.company_name || user?.email || ''}</div>
                    </div>
                    <ChevronUp size={13} style={{ color:'rgba(255,255,255,0.25)', transition:'transform .2s', transform: menuOpen ? 'rotate(0deg)' : 'rotate(180deg)', flexShrink:0 }}/>
                </button>

                {/* popup */}
                <div ref={menuRef} className={`popup-menu ${menuOpen ? 'open' : 'closed'}`}>
                    <NavLink to="/profile" onClick={() => setMenuOpen(false)} className="popup-item">
                        <UserCircle size={14}/> Editar perfil
                    </NavLink>
                    <div className="popup-separator"/>
                    <button onClick={handleLogout} className="popup-item popup-item-danger">
                        <LogOut size={14}/> Cerrar sesión
                    </button>
                </div>
            </div>
        </aside>
    );
}

const Item = ({ to, icon, label, badge }) => (
    <NavLink to={to} className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
        <span className="sidebar-icon">{icon}</span>
        <span style={{ flex:1 }}>{label}</span>
        {badge && <span className="sidebar-badge">{badge}</span>}
    </NavLink>
);