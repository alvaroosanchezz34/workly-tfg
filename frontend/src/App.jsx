import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { UIProvider, UIContext } from './context/UIContext';
import { useContext, useState, useEffect, lazy, Suspense } from 'react';

// Landing y Login se cargan de forma inmediata (primera pantalla más habitual).
// El resto de páginas se cargan bajo demanda para no meter todo el dashboard
// en el bundle inicial (evita un único chunk de >1MB).
import Landing         from './pages/Landing';
import Login           from './pages/Login';
const Register         = lazy(() => import('./pages/Register'));
const Dashboard        = lazy(() => import('./pages/Dashboard'));
const Clients          = lazy(() => import('./pages/Clients'));
const ClientProfile    = lazy(() => import('./pages/ClientProfile'));
const Profile          = lazy(() => import('./pages/Profile'));
const ActivityLogs     = lazy(() => import('./pages/ActivityLogs'));
const DeletedClients   = lazy(() => import('./pages/DeletedClients'));
const Services         = lazy(() => import('./pages/Services'));
const Expenses         = lazy(() => import('./pages/Expenses'));
const Projects         = lazy(() => import('./pages/Projects'));
const ProjectTasks     = lazy(() => import('./pages/ProjectTasks'));
const TimeTracker      = lazy(() => import('./pages/TimeTracker'));
const Invoices         = lazy(() => import('./pages/Invoices'));
const Verifactu        = lazy(() => import('./pages/Verifactu'));
const DeclaracionResponsable = lazy(() => import('./pages/DeclaracionResponsable'));
const PublicInvoice    = lazy(() => import('./pages/PublicInvoice'));
const Team             = lazy(() => import('./pages/Team'));
const CompanySetup     = lazy(() => import('./pages/CompanySetup'));
const LegalDraft       = lazy(() => import('./pages/LegalDraft'));
const WaitlistAdmin    = lazy(() => import('./pages/WaitlistAdmin'));
const Estado           = lazy(() => import('./pages/Estado'));
const Billing          = lazy(() => import('./pages/Billing'));
const BillingSuccess   = lazy(() => import('./pages/BillingSuccess'));
const Accounting       = lazy(() => import('./pages/Accounting'));
const CalendarPage     = lazy(() => import('./pages/Calendar'));

import CookieBanner        from './components/CookieBanner';
import SkipLink            from './components/SkipLink';
import OnboardingChecklist from './components/OnboardingChecklist';
import GlobalSearch        from './components/GlobalSearch';

const RouteFallback = () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #888)', fontSize: 14, fontFamily: 'inherit' }}>
        Cargando…
    </div>
);

const PrivateRoute = ({ children }) => {
    const { token, isAuthenticated } = useContext(AuthContext);
    return isAuthenticated || token ? children : <Navigate to="/login" replace />;
};

const NotifPanel = () => {
    const { token } = useContext(AuthContext);
    const { notifOpen, closeNotif, notifications, markAllRead, markRead } = useContext(UIContext);
    const navigate = useNavigate();
    if (!notifOpen || !token) return null;
    const COLOR = { overdue: '#F44336', warning: '#FF9800', info: '#1976D2' };

    const openNotif = n => {
        if (!n.is_read) markRead(n.id);
        closeNotif();
        if (n.link) navigate(n.link);
    };

    return (
        <div style={{ position: 'fixed', bottom: 80, left: 270, width: 320, background: 'var(--card-bg, #fff)', border: '1.5px solid var(--border, #E0E0E0)', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 9999, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border, #E0E0E0)' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Notificaciones</span>
                <div style={{ display: 'flex', gap: 10 }}>
                    {notifications.some(n => !n.is_read) && <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#1976D2' }}>Marcar leído</button>}
                    <button onClick={closeNotif} aria-label="Cerrar notificaciones" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#999', lineHeight: 1 }}>×</button>
                </div>
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {notifications.length === 0
                    ? <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9E9E9E', fontSize: 13 }}>✓ Todo al día</div>
                    : notifications.map(n => (
                        <div key={n.id} onClick={() => openNotif(n)} role="button" tabIndex={0}
                            style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border, #F0F0F0)', background: n.is_read ? 'transparent' : 'rgba(25,118,210,0.04)', cursor: n.link ? 'pointer' : 'default' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR[n.type] || '#1976D2', flexShrink: 0, marginTop: 5 }} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600 }}>{n.title}</div>
                                <div style={{ fontSize: 12, color: '#616161', marginTop: 2 }}>{n.body}</div>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

const GlobalSearchWrapper = () => {
    const { token } = useContext(AuthContext);
    const { searchOpen, closeSearch } = useContext(UIContext);
    if (!searchOpen || !token) return null;
    return <GlobalSearch token={token} onClose={closeSearch} />;
};

const OnboardingWrapper = () => {
    const { token, isAuthenticated } = useContext(AuthContext);
    const location = useLocation();
    const [show, setShow] = useState(false);
    const PUBLIC = ['/', '/login', '/register', '/privacidad', '/aviso-legal', '/cookies', '/terminos', '/encargado', '/estado', '/billing', '/billing/success'];
    const isPublic = PUBLIC.includes(location.pathname) || location.pathname.startsWith('/p/');

    useEffect(() => {
        if (!token || !isAuthenticated || isPublic) return;
        const dismissed = localStorage.getItem('workly_onboarding_dismissed');
        const done = JSON.parse(localStorage.getItem('workly_onboarding') || '[]');
        if (!dismissed && done.length < 5) {
            const t = setTimeout(() => setShow(true), 1200);
            return () => clearTimeout(t);
        }
    }, [token, isAuthenticated, location.pathname, isPublic]);

    const close = () => { setShow(false); localStorage.setItem('workly_onboarding_dismissed', '1'); };
    if (!show) return null;
    return <OnboardingChecklist onClose={close} />;
};

const AppInner = () => (
    <UIProvider>
        <SkipLink />
        <Suspense fallback={<RouteFallback />}>
            <Routes>
                <Route path="/"                element={<Landing />} />
                <Route path="/login"           element={<Login />} />
                <Route path="/register"        element={<Register />} />
                <Route path="/privacidad"      element={<LegalDraft docId="privacidad" />} />
                <Route path="/aviso-legal"     element={<LegalDraft docId="aviso-legal" />} />
                <Route path="/cookies"         element={<LegalDraft docId="cookies" />} />
                <Route path="/terminos"        element={<LegalDraft docId="terminos" />} />
                <Route path="/encargado"       element={<LegalDraft docId="encargado" />} />
                <Route path="/estado"          element={<Estado />} />
                <Route path="/p/:token"        element={<PublicInvoice />} />

                <Route path="/dashboard"       element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/clients"         element={<PrivateRoute><Clients /></PrivateRoute>} />
                <Route path="/clients/deleted" element={<PrivateRoute><DeletedClients /></PrivateRoute>} />
                <Route path="/clients/:id"     element={<PrivateRoute><ClientProfile /></PrivateRoute>} />
                <Route path="/projects"        element={<PrivateRoute><Projects /></PrivateRoute>} />
                <Route path="/projects/:projectId/tasks" element={<PrivateRoute><ProjectTasks /></PrivateRoute>} />
                <Route path="/time"            element={<PrivateRoute><TimeTracker /></PrivateRoute>} />
                <Route path="/invoices"        element={<PrivateRoute><Invoices /></PrivateRoute>} />
                <Route path="/verifactu"       element={<PrivateRoute><Verifactu /></PrivateRoute>} />
                <Route path="/verifactu/declaracion" element={<PrivateRoute><DeclaracionResponsable /></PrivateRoute>} />
                <Route path="/expenses"        element={<PrivateRoute><Expenses /></PrivateRoute>} />
                <Route path="/services"        element={<PrivateRoute><Services /></PrivateRoute>} />
                <Route path="/profile"         element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="/activity"        element={<PrivateRoute><ActivityLogs /></PrivateRoute>} />
                <Route path="/waitlist"        element={<PrivateRoute><WaitlistAdmin /></PrivateRoute>} />
                <Route path="/team"            element={<PrivateRoute><Team /></PrivateRoute>} />
                <Route path="/company/setup"   element={<PrivateRoute><CompanySetup /></PrivateRoute>} />
                <Route path="/billing"         element={<PrivateRoute><Billing /></PrivateRoute>} />
                <Route path="/billing/success" element={<PrivateRoute><BillingSuccess /></PrivateRoute>} />
                <Route path="/accounting"      element={<PrivateRoute><Accounting /></PrivateRoute>} />
                <Route path="/calendar"        element={<PrivateRoute><CalendarPage /></PrivateRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>

        <NotifPanel />
        <GlobalSearchWrapper />
        <OnboardingWrapper />
        {import.meta.env.VITE_OPTIONAL_COOKIES === '1' && <CookieBanner />}
    </UIProvider>
);

const App = () => (
    <AuthProvider>
        <FeedbackProvider>
            <BrowserRouter>
                <AppInner />
            </BrowserRouter>
        </FeedbackProvider>
    </AuthProvider>
);

export default App;
