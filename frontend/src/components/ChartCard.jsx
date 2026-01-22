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
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">
                Evolución de ingresos
            </h3>
            <Bar data={chartData} options={options} />
        </div>
    );
};

export default ChartCard;
