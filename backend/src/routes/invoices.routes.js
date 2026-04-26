import { Router } from 'express';
import {
    createInvoice, getInvoices, getInvoiceById, updateInvoice, softDeleteInvoice,
    downloadInvoicePDF, updateInvoiceStatus, sendInvoiceByEmail,
    addPayment, getPayments, deletePayment,
    getInvoiceStats, getInvoiceSettings, updateInvoiceSettings,
} from '../controllers/invoices.controller.js';
import { authenticate }               from '../middlewares/auth.middleware.js';
import { checkLimit, requireFeature } from '../middlewares/plan.middleware.js';

const router = Router();

router.get('/',         authenticate, getInvoices);
router.post('/',        authenticate, checkLimit('invoices'), createInvoice);       // Free: máx 10/mes
router.get('/stats',    authenticate, requireFeature('stats'), getInvoiceStats);    // Pro+
router.get('/settings', authenticate, getInvoiceSettings);
router.put('/settings', authenticate, updateInvoiceSettings);
router.get('/:id',      authenticate, getInvoiceById);
router.put('/:id',      authenticate, updateInvoice);
router.delete('/:id',   authenticate, softDeleteInvoice);
router.patch('/:id/status', authenticate, updateInvoiceStatus);
router.get('/:id/pdf',      authenticate, downloadInvoicePDF);                              // Free puede descargar PDF
router.post('/:id/send',    authenticate, requireFeature('email_send'), sendInvoiceByEmail); // Pro+

router.get('/:id/payments',               authenticate, getPayments);
router.post('/:id/payments',              authenticate, addPayment);
router.delete('/:id/payments/:paymentId', authenticate, deletePayment);

export default router;