import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend
);

const ChartCard = ({ data }) => {
    const chartData = {
        labels: data.map(item => item.month),
        datasets: [
            {
                label: 'Ingresos (€)',
                data: data.map(item => Number(item.total)),
                backgroundColor: '#2563eb',
                borderRadius: 6,

                // 👇 CLAVE PARA EL GROSOR
                barThickness: 60,
                maxBarThickness: 70,
                categoryPercentage: 0.6,
                barPercentage: 0.7,
            },
        ],

    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: value => `€${value}`,
                },
            },
        },
    };

    return (
        <div style={styles.card}>
            <h3 style={styles.title}>Evolución de ingresos</h3>
            <Bar data={chartData} options={options} />
        </div>
    );
};

const styles = {
    card: {
        marginTop: '32px',
        background: '#ffffff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
    },
    title: {
        marginBottom: '16px',
    },
};

export default ChartCard;
