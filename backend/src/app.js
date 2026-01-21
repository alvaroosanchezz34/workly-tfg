import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import expensesRoutes from './routes/expenses.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// rutas
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/expenses', expensesRoutes);

app.get('/api/health', async (req, res) => {
  res.json({ status: 'OK', database: 'connected' });
});

export default app;
