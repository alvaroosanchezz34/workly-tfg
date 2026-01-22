import { AlertTriangle, XCircle, Info } from "lucide-react";

const AlertBox = ({ type, title, description }) => {
    const variants = {
        warning: {
            bg: "bg-orange-50",
            border: "border-orange-400",
            icon: <AlertTriangle className="text-orange-500" size={18} />,
        },
        danger: {
            bg: "bg-red-50",
            border: "border-red-500",
            icon: <XCircle className="text-red-500" size={18} />,
        },
        info: {
            bg: "bg-blue-50",
            border: "border-blue-400",
            icon: <Info className="text-blue-500" size={18} />,
        },
    };

    const current = variants[type] || variants.info;

    return (
        <div
            className={`flex items-start gap-4 ${current.bg} border-l-4 ${current.border} rounded-xl p-5`}
        >
            <div className="mt-0.5">{current.icon}</div>

            <div>
                <p className="font-medium text-slate-800">
                    {title}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                    {description}
                </p>
            </div>
        </div>
    );
};

export default AlertBox;
