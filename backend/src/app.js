import express        from 'express';
import cors           from 'cors';
import helmet         from 'helmet';
import rateLimit      from 'express-rate-limit';
import morgan         from 'morgan';

import authRoutes            from './routes/auth.routes.js';
import clientsRoutes         from './routes/clients.routes.js';
import projectsRoutes        from './routes/projects.routes.js';
import invoicesRoutes        from './routes/invoices.routes.js';
import quotesRoutes          from './routes/quotes.routes.js';
import creditNotesRoutes     from './routes/creditNotes.routes.js';
import recurringRoutes       from './routes/recurringInvoices.routes.js';
import expensesRoutes        from './routes/expenses.routes.js';
import dashboardRoutes       from './routes/dashboard.routes.js';
import activityLogsRoutes    from './routes/activityLogs.routes.js';
import servicesRoutes        from './routes/services.routes.js';
import companyRoutes         from './routes/company.routes.js';
import usersRoutes           from './routes/users.routes.js';
import exportRoutes          from './routes/export.routes.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));

const generalLimiter = rateLimit({ windowMs: 15*60*1000, max: 500, standardHeaders: true, legacyHeaders: false, message: { message: 'Demasiadas peticiones. Inténtalo en 15 minutos.' } });
const authLimiter    = rateLimit({ windowMs: 15*60*1000, max: 20,  message: { message: 'Demasiados intentos. Inténtalo en 15 minutos.' } });

app.use(generalLimiter);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth',               authLimiter, authRoutes);
app.use('/api/users',              usersRoutes);
app.use('/api/company',            companyRoutes);
app.use('/api/clients',            clientsRoutes);
app.use('/api/projects',           projectsRoutes);
app.use('/api/invoices',           invoicesRoutes);
app.use('/api/quotes',             quotesRoutes);
app.use('/api/credit-notes',       creditNotesRoutes);
app.use('/api/recurring-invoices', recurringRoutes);
app.use('/api/expenses',           expensesRoutes);
app.use('/api/dashboard',          dashboardRoutes);
app.use('/api/activity-logs',      activityLogsRoutes);
app.use('/api/services',           servicesRoutes);
app.use('/api/export',             exportRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date() }));

app.use((err, _req, res, _next) => {
    console.error('[Error]', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

export default app;