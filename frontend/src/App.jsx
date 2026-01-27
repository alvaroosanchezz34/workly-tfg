import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/DashBoard';
import { useContext } from 'react';
import Clients from './pages/Clients';
import Profile from './pages/Profile';
import ActivityLogs from './pages/ActivityLogs';
import DeletedClients from './pages/DeletedClients';
import Services from './pages/Services';
import Expenses from './pages/Expenses';
import Projects from './pages/Projects';
import Invoices from './pages/Invoices';

const PrivateRoute = ({ children }) => {
  const { token } = useContext(AuthContext);
  return token ? children : <Login />;
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/clients" element={<Clients />} />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route path="/activity" element={<ActivityLogs />} />
        <Route path="/clients/deleted" element={<DeletedClients />} />
        <Route path="/services" element={<Services />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/invoices" element={<Invoices />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
