import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import MetricCard from '../components/MetricCard';
import ChartCard from '../components/ChartCard';
import AlertBox from '../components/AlertBox';
import QuickActions from '../components/QuickActions';

const Dashboard = () => {
    const { token } = useContext(AuthContext);

    const [data, setData] = useState({
        income: 0,
        expenses: 0,
        profit: 0,
        pendingInvoices: 0,
        overdueInvoices: 0,
        monthlyIncome: [],
        expensesByCategory: [],
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;

        getDashboard(token)
            .then(setData)
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) {
        return (
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1">
                    <main className="ml-64 min-h-screen p-8 space-y-12">
                        <div className="p-6">
                            <p className="text-slate-500">Cargando datos del dashboard...</p>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <Sidebar />

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col">

                <main className="ml-64 min-h-screen p-8 space-y-12">
                    <section className="space-y-4">
                        {/* TÍTULO */}
                        <h2 className="text-2xl font-semibold text-slate-800">
                            Resumen general
                        </h2>

                        {/* MÉTRICAS */}
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <MetricCard
                                title="Ingresos"
                                value={`€${data.income}`}
                                color="#16a34a"
                            />

                            <MetricCard
                                title="Gastos"
                                value={`€${data.expenses}`}
                                color="#dc2626"
                            />

                            <MetricCard
                                title="Beneficio"
                                value={`€${data.profit}`}
                                color={data.profit >= 0 ? '#2563eb' : '#dc2626'}
                            />

                            <MetricCard
                                title="Facturas pendientes"
                                value={data.pendingInvoices}
                                color="#f59e0b"
                            />

                            <MetricCard
                                title="Facturas vencidas"
                                value={data.overdueInvoices}
                                color="#dc2626"
                            />
                        </section>
                    </section>

                    {/* ALERTAS */}
                    <section className="space-y-4">
                        {data.pendingInvoices > 0 && (
                            <AlertBox
                                type="warning"
                                title="Facturas pendientes"
                                description={`Tienes ${data.pendingInvoices} factura(s) pendiente(s) de cobro`}
                            />
                        )}

                        {data.overdueInvoices > 0 && (
                            <AlertBox
                                type="danger"
                                title="Facturas vencidas"
                                description={`Tienes ${data.overdueInvoices} factura(s) vencida(s). Requieren atención inmediata`}
                            />
                        )}
                    </section>

                    {/* GRÁFICA */}
                    <section className="mt-12">
                        {data.monthlyIncome?.length > 0 && (
                            <section className="mt-12 max-w-5xl">
                                <ChartCard data={data.monthlyIncome} />
                            </section>
                        )}
                    </section>


                    {/* ACCIONES RÁPIDAS */}
                    <section>
                        <QuickActions />
                    </section>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
