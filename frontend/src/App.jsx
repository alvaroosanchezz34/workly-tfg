import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/DashBoard';
import { useContext } from 'react';
import Clients from './pages/Clients';
import Profile from './pages/Profile';
import ActivityLogs from './pages/ActivityLogs';
import DeletedClients from './pages/DeletedClients';

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
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
