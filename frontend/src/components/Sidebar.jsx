import {
    LayoutDashboard,
    Users,
    Folder,
    FileText,
    CreditCard,
    Settings,
    UserCog,
    Activity,
    LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
    return (
        <aside className="fixed left-0 top-0 w-64 h-screen bg-white border-r border-slate-200 flex flex-col">
            {/* LOGO */}
            <div className="px-6 py-5 border-b border-slate-200">
                <h1 className="text-xl font-bold text-indigo-600">
                    WorkLy
                </h1>
            </div>

            {/* MENU */}
            <nav className="flex-1 px-4 py-6 space-y-1 text-sm">
                <SidebarItem
                    to="/dashboard"
                    icon={<LayoutDashboard size={18} />}
                    label="Dashboard"
                />

                <SidebarItem
                    to="/clients"
                    icon={<Users size={18} />}
                    label="Clients"
                />

                <SidebarItem
                    to="/projects"
                    icon={<Folder size={18} />}
                    label="Projects"
                />

                <SidebarItem
                    to="/invoices"
                    icon={<FileText size={18} />}
                    label="Invoices"
                />

                <SidebarItem
                    to="/expenses"
                    icon={<CreditCard size={18} />}
                    label="Expenses"
                />
            </nav>

            {/* USER */}
            <div className="border-t border-slate-200 p-4">
                <button className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition">
                    <LogOut size={18} />
                    Cerrar sesión
                </button>
            </div>
        </aside>
    );
}

const SidebarItem = ({ to, icon, label }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `
        flex items-center gap-3 px-3 py-2 rounded-lg
        ${isActive
                    ? "bg-indigo-50 text-indigo-600 font-medium"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }
        transition
      `
            }
        >
            {icon}
            <span>{label}</span>
        </NavLink>
    );
};
