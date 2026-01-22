const QuickActions = () => {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mt-12">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Acciones rápidas
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button className="flex active:scale-[0.98] items-center justify-center gap-2 rounded-lg py-3 font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer">
                    + Nuevo cliente
                </button>

                <button className="flex active:scale-[0.98] items-center justify-center gap-2 rounded-lg py-3 font-medium bg-green-50 text-green-600 hover:bg-green-100 transition cursor-pointer">
                    + Nueva factura
                </button>

                <button className="flex active:scale-[0.98] items-center justify-center gap-2 rounded-lg py-3 font-medium bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer">
                    + Nuevo gasto
                </button>

                <button className="flex active:scale-[0.98] items-center justify-center gap-2 rounded-lg py-3 font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 transition cursor-pointer">
                    + Nuevo proyecto
                </button>
            </div>
        </div>
    );
};

export default QuickActions;
