import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';
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
        monthlyIncome: [],
        expensesByCategory: [],
    });


    useEffect(() => {
        getDashboard(token).then(setData);
    }, []);

    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="p-6 space-y-8">
                <h2 className="text-2xl font-semibold text-slate-800">
                    Resumen general
                </h2>

                {!data ? (
                    <p>Cargando datos...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    </div>
                )}
                {data && data.monthlyIncome && data.monthlyIncome.length > 0 && (
                    <ChartCard data={data.monthlyIncome} />
                )}
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
                        description={`Tienes ${data.overdueInvoices} factura(s) vencidas. Requieren atención inmediata`}
                    />
                )}


                <QuickActions />
            </div>
        </div>

    );
};

const styles = {
    layout: {
        display: 'flex',
    },
    main: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    content: {
        padding: '24px',
    },
    cards: {
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
    },

};

export default Dashboard;
