// backend/src/routes/recurringInvoices.routes.js
import { Router } from 'express';
import {
    createRecurring, getRecurring, getRecurringById,
    updateRecurringStatus, deleteRecurring,
    processRecurringInvoices,
} from '../controllers/recurringInvoices.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();
router.get('/',           authenticate, getRecurring);
router.post('/',          authenticate, createRecurring);
router.get('/process',    authenticate, processRecurringInvoices); // llamar como cron
router.get('/:id',        authenticate, getRecurringById);
router.patch('/:id/status', authenticate, updateRecurringStatus);
router.delete('/:id',     authenticate, deleteRecurring);

export default router;