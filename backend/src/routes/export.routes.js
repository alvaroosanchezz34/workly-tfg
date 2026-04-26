import { Router } from 'express';
import { exportInvoices, exportExpenses, exportClients } from '../controllers/export.controller.js';
import { authenticate }   from '../middlewares/auth.middleware.js';
import { requireFeature } from '../middlewares/plan.middleware.js';

const router = Router();

// Exportación Excel — solo Pro y Business
router.get('/invoices', authenticate, requireFeature('excel_export'), exportInvoices);
router.get('/expenses', authenticate, requireFeature('excel_export'), exportExpenses);
router.get('/clients',  authenticate, requireFeature('excel_export'), exportClients);

export default router;