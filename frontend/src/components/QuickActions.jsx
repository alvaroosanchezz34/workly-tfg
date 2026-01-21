const QuickActions = () => {
    return (
        <div style={styles.card}>
            <h3 style={styles.title}>Acciones rápidas</h3>

            <div style={styles.buttons}>
                <button style={{ ...styles.btn, background: '#2563eb' }}>
                    + Nuevo cliente
                </button>
                <button style={{ ...styles.btn, background: '#16a34a' }}>
                    + Nueva factura
                </button>
                <button style={{ ...styles.btn, background: '#dc2626' }}>
                    + Nuevo gasto
                </button>
                <button style={{ ...styles.btn, background: '#7c3aed' }}>
                    + Nuevo proyecto
                </button>
            </div>
        </div>
    );
};

const styles = {
    card: {
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '32px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
    },
    title: {
        marginBottom: '16px',
    },
    buttons: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
    },
    btn: {
        color: '#fff',
        border: 'none',
        padding: '12px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
    },
};

export default QuickActions;
