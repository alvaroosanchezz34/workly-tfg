export default function Topbar() {
    return (
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
            {/* Breadcrumb / título */}
            <span className="text-sm font-medium text-slate-700">
                Dashboard
            </span>

            {/* Usuario */}
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">
                        Usuario
                    </p>
                    <p className="text-xs text-slate-500">
                        Freelancer
                    </p>
                </div>

                <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                    U
                </div>
            </div>
        </header>
    );
}
