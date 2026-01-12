import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import clientsRoutes from './routes/clients.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// rutas
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);

app.get('/api/health', async (req, res) => {
  res.json({ status: 'OK', database: 'connected' });
});

export default app;
