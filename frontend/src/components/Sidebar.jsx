const Sidebar = () => {
    return (
        <aside style={styles.sidebar}>
            <h2 style={styles.logo}>WorkLy</h2>

            <nav style={styles.nav}>
                <a href="/dashboard">Dashboard</a>
                <a href="#">Clientes</a>
                <a href="#">Proyectos</a>
                <a href="#">Facturas</a>
                <a href="#">Gastos</a>
            </nav>
        </aside>
    );
};

const styles = {
    sidebar: {
        width: '220px',
        height: '100vh',
        background: '#0f172a',
        color: '#fff',
        padding: '20px',
    },
    logo: {
        marginBottom: '40px',
    },
    nav: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
};

export default Sidebar;
