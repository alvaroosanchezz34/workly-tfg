import { AlertTriangle, XCircle, CheckCircle, Info } from 'lucide-react';

const MAP = {
    warning: { cls: 'alert-warning', icon: <AlertTriangle size={15}/> },
    danger:  { cls: 'alert-danger',  icon: <XCircle size={15}/> },
    success: { cls: 'alert-success', icon: <CheckCircle size={15}/> },
    info:    { cls: 'alert-info',    icon: <Info size={15}/> },
};

const AlertBox = ({ type, title, description }) => {
    const { cls, icon } = MAP[type] || MAP.info;
    return (
        <div className={`alert ${cls}`}>
            <div style={{ flexShrink:0, marginTop:1 }}>{icon}</div>
            <div>
                <p style={{ fontWeight:600, marginBottom:2 }}>{title}</p>
                {description && <p style={{ opacity:.85, fontSize:13 }}>{description}</p>}
            </div>
        </div>
    );
};

export default AlertBox;