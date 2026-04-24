// backend/src/routes/export.routes.js
import { Router } from 'express';
import { exportInvoices, exportExpenses, exportClients } from '../controllers/export.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();
router.get('/invoices', authenticate, exportInvoices);
router.get('/expenses', authenticate, exportExpenses);
router.get('/clients',  authenticate, exportClients);

export default router;