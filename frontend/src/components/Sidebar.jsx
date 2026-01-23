import {
    LayoutDashboard,
    Users,
    Folder,
    FileText,
    CreditCard,
    Settings,
    Shield,
    Activity,
    LogOut,
    Trash,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useContext, useState, useRef, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Sidebar() {
    const { logout, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [openProfileMenu, setOpenProfileMenu] = useState(false);
    const popupRef = useRef(null);
    const buttonRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                openProfileMenu &&
                popupRef.current &&
                !popupRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setOpenProfileMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [openProfileMenu]);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <aside className="fixed left-0 top-0 w-64 h-screen bg-white border-r border-slate-200 flex flex-col">

            {/* LOGO */}
            <div className="px-6 py-5">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
                    <div className="h-7 w-7 rounded bg-indigo-600 text-white flex items-center justify-center text-sm">
                        W
                    </div>
                    WorkLy
                </div>
            </div>

            {/* MENU */}
            <nav className="flex-1 px-3 space-y-1 text-sm">
                <SidebarItem to="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
                <SidebarItem to="/clients" icon={<Users size={18} />} label="Clients" />
                <SidebarItem to="/projects" icon={<Folder size={18} />} label="Projects" />
                <SidebarItem to="/invoices" icon={<FileText size={18} />} label="Invoices" />
                <SidebarItem to="/expenses" icon={<CreditCard size={18} />} label="Expenses" />
                <SidebarItem to="/services" icon={<Settings size={18} />} label="Services" />

                {/* ADMIN */}
                {user?.role === 'admin' && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <SidebarItem
                            to="/users"
                            icon={<Shield size={18} />}
                            label="Users"
                            badge="Admin"
                        />
                        <SidebarItem
                            to="/activity"
                            icon={<Activity size={18} />}
                            label="Activity Logs"
                            badge="Admin"
                        />
                        <SidebarItem
                            to="/clients/deleted"
                            icon={<Trash size={18} />}
                            label="Clientes borrados"
                            badge="Admin"
                        />
                    </div>
                )}
            </nav>

            {/* USER MENU */}
            <div className="relative px-4 py-4 border-t border-slate-200">
                <button
                    ref={buttonRef}
                    onClick={() => setOpenProfileMenu((prev) => !prev)}
                    className="w-full flex items-center gap-3 hover:bg-slate-100 rounded-lg p-2 transition"
                >
                    {user?.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt="Avatar"
                            className="h-9 w-9 rounded-full object-cover"
                        />
                    ) : (
                        <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                            {user?.name?.charAt(0) || "U"}
                        </div>
                    )}

                    <div className="text-left flex-1">
                        <p className="text-sm font-medium text-slate-700 truncate">
                            {user?.name || "Usuario"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                            {user?.company_name || "Compañía"}
                        </p>
                    </div>
                </button>

                {/* POPUP */}
                <div
                    ref={popupRef}
                    className={`
    absolute bottom-16 left-4 w-56
    bg-white border border-slate-200 rounded-xl shadow-lg z-50
    transition-all duration-200 ease-out
    origin-bottom
    ${openProfileMenu
                            ? "opacity-100 scale-100 pointer-events-auto"
                            : "opacity-0 scale-95 pointer-events-none"
                        }
  `}
                >
                    <NavLink
                        to="/profile"
                        onClick={() => setOpenProfileMenu(false)}
                        className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-100"
                    >
                        Ver perfil
                    </NavLink>

                    <NavLink
                        to="/profile"
                        onClick={() => setOpenProfileMenu(false)}
                        className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-100"
                    >
                        Editar perfil
                    </NavLink>

                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </aside>
    );
}

/* ITEM */
const SidebarItem = ({ to, icon, label, badge }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `
        flex items-center gap-3 px-3 py-2 rounded-lg
        ${isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }
        transition
      `
            }
        >
            {icon}
            <span className="flex-1">{label}</span>

            {badge && (
                <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                    {badge}
                </span>
            )}
        </NavLink>
    );
};
