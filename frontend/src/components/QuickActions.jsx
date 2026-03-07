import { useNavigate } from 'react-router-dom';
import { UserPlus, FileText, TrendingDown, FolderPlus } from 'lucide-react';

const ACTIONS = [
    { label:'Nuevo cliente',   icon:<UserPlus size={15}/>,     to:'/clients',  iconBg:'var(--primary-light)',   iconColor:'var(--primary)'   },
    { label:'Nueva factura',   icon:<FileText size={15}/>,     to:'/invoices', iconBg:'var(--secondary-light)', iconColor:'var(--secondary)' },
    { label:'Registrar gasto', icon:<TrendingDown size={15}/>, to:'/expenses', iconBg:'var(--error-light)',     iconColor:'var(--error)'     },
    { label:'Nuevo proyecto',  icon:<FolderPlus size={15}/>,   to:'/projects', iconBg:'var(--warning-light)',   iconColor:'var(--warning)'   },
];

const QuickActions = () => {
    const navigate = useNavigate();
    return (
        <div className="card card-p">
            <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:14 }}>
                Acciones rápidas
            </h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {ACTIONS.map(({ label, icon, to, iconBg, iconColor }) => (
                    <button key={to} className="quick-action-btn" onClick={() => navigate(to)}>
                        <span className="quick-action-icon" style={{ background:iconBg, color:iconColor }}>
                            {icon}
                        </span>
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default QuickActions;