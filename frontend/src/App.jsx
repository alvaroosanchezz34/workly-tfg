import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Login          from './pages/Login';
import Dashboard      from './pages/DashBoard';
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
    return isAuthenticated || token ? children : <Navigate to="/" replace />;
};

const App = () => (
    <AuthProvider>
        <BrowserRouter>
            <Routes>
                {/* Públicas */}
                <Route path="/"         element={<Login />} />
                <Route path="/p/:token" element={<PublicInvoice />} />

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

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    </AuthProvider>
);

export default App;