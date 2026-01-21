import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { getDashboard } from '../api/dashboard';

const Dashboard = () => {
    const { token } = useContext(AuthContext);
    const [data, setData] = useState(null);

    useEffect(() => {
        getDashboard(token).then(setData);
    }, []);

    if (!data) return <p>Cargando...</p>;

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Ingresos: €{data.income}</p>
            <p>Gastos: €{data.expenses}</p>
            <p>Beneficio: €{data.profit}</p>
            <p>Facturas pendientes: {data.pendingInvoices}</p>
        </div>
    );
};

export default Dashboard;
