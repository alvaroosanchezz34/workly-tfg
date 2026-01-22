export default function Sidebar() {
    return (
        <aside className="w-64 bg-white border-r border-slate-200 min-h-screen px-6 py-8">
            <h1 className="text-xl font-bold text-indigo-600 mb-10">
                WorkLy
            </h1>

            <nav className="space-y-3 text-sm">
                <a className="block px-3 py-2 rounded-md bg-indigo-50 text-indigo-600 font-medium">
                    Dashboard
                </a>
                <a className="block px-3 py-2 rounded-md text-slate-600 hover:bg-slate-100">
                    Facturas
                </a>
                <a className="block px-3 py-2 rounded-md text-slate-600 hover:bg-slate-100">
                    Clientes
                </a>
            </nav>
        </aside>
    )
}
