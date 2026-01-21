const AlertBox = ({ type, title, description }) => {
    const colors = {
        warning: '#f59e0b',
        danger: '#dc2626',
        info: '#2563eb',
    };

    return (
        <div style={{ ...styles.box, borderLeft: `4px solid ${colors[type]}` }}>
            <h4 style={styles.title}>{title}</h4>
            <p style={styles.desc}>{description}</p>
        </div>
    );
};

const styles = {
    box: {
        background: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
    },
    title: {
        margin: 0,
        fontSize: '15px',
    },
    desc: {
        margin: '6px 0 0',
        fontSize: '14px',
        color: '#64748b',
    },
};

export default AlertBox;
