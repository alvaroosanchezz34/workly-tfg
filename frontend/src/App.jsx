import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { UIProvider, UIContext } from './context/UIContext';
import { useContext } from 'react';

import Landing        from './pages/Landing';
import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import Clients        from './pages/Clients';
import ClientProfile  from './pages/ClientProfile';
import Profile        from './pages/Profile';
import ActivityLogs   from './pages/ActivityLogs';
import DeletedClients from './pages/DeletedClients';
import Services       from './pages/Services';
import Expenses       from './pages/Expenses';
import Projects       from './pages/Projects';
import Invoices       from './pages/Invoices';
import PublicInvoice  from './pages/PublicInvoice';
import Team           from './pages/Team';
import CompanySetup   from './pages/CompanySetup';

const PrivateRoute = ({ children }) => {
    const { token, isAuthenticated } = useContext(AuthContext);
    return isAuthenticated || token ? children : <Navigate to="/login" replace />;
};

const NotifPanel = () => {
    const { token } = useContext(AuthContext);
    const { notifOpen, closeNotif, notifications, markAllRead } = useContext(UIContext);
    if (!notifOpen || !token) return null;
    const COLOR = { overdue: '#F44336', warning: '#FF9800', info: '#1976D2' };
    return (
        <div style={{ position: 'fixed', bottom: 80, left: 270, width: 320, background: 'var(--card-bg, #fff)', border: '1.5px solid var(--border, #E0E0E0)', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 9999, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border, #E0E0E0)' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Notificaciones</span>
                <div style={{ display: 'flex', gap: 10 }}>
                    {notifications.some(n => !n.read) && <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#1976D2' }}>Marcar leído</button>}
                    <button onClick={closeNotif} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#999', lineHeight: 1 }}>×</button>
                </div>
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {notifications.length === 0
                    ? <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9E9E9E', fontSize: 13 }}>✓ Todo al día</div>
                    : notifications.map(n => (
                        <div key={n.id} style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border, #F0F0F0)', background: n.read ? 'transparent' : 'rgba(25,118,210,0.04)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR[n.type] || '#1976D2', flexShrink: 0, marginTop: 5 }} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600 }}>{n.title}</div>
                                <div style={{ fontSize: 12, color: '#616161', marginTop: 2 }}>{n.body}</div>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

const AppInner = () => (
    <UIProvider>
        <Routes>
            {/* Landing y auth */}
            <Route path="/"          element={<Landing />} />
            <Route path="/login"     element={<Login />} />
            <Route path="/register"  element={<Register />} />
            <Route path="/p/:token"  element={<PublicInvoice />} />

            {/* Protegidas */}
            <Route path="/dashboard"       element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/clients"         element={<PrivateRoute><Clients /></PrivateRoute>} />
            <Route path="/clients/deleted" element={<PrivateRoute><DeletedClients /></PrivateRoute>} />
            <Route path="/clients/:id"     element={<PrivateRoute><ClientProfile /></PrivateRoute>} />
            <Route path="/projects"        element={<PrivateRoute><Projects /></PrivateRoute>} />
            <Route path="/invoices"        element={<PrivateRoute><Invoices /></PrivateRoute>} />
            <Route path="/expenses"        element={<PrivateRoute><Expenses /></PrivateRoute>} />
            <Route path="/services"        element={<PrivateRoute><Services /></PrivateRoute>} />
            <Route path="/profile"         element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/activity"        element={<PrivateRoute><ActivityLogs /></PrivateRoute>} />
            <Route path="/team"            element={<PrivateRoute><Team /></PrivateRoute>} />
            <Route path="/company/setup"   element={<PrivateRoute><CompanySetup /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <NotifPanel />
    </UIProvider>
);

const App = () => (
    <AuthProvider>
        <BrowserRouter>
            <AppInner />
        </BrowserRouter>
    </AuthProvider>
);

export default App;