import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Topbar = () => {
    const { logout } = useContext(AuthContext);

    return (
        <header style={styles.topbar}>
            <span>Dashboard</span>
            <button onClick={logout}>Salir</button>
        </header>
    );
};

const styles = {
    topbar: {
        height: '60px',
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
    },
};

export default Topbar;
