import { Router } from 'express';
import {
    createInvoice, getInvoices, getInvoiceById, updateInvoice, softDeleteInvoice,
    downloadInvoicePDF, updateInvoiceStatus, sendInvoiceByEmail,
    addPayment, getPayments, deletePayment,
    getInvoiceStats, getInvoiceSettings, updateInvoiceSettings,
    bulkDeleteInvoices, bulkUpdateInvoiceStatus,
} from '../controllers/invoices.controller.js';
import {
    getIssuerProfile, saveIssuerProfile, issueInvoice, voidInvoice,
    createRectificativa, getInvoiceEvents,
} from '../controllers/invoiceCompliance.controller.js';
import { authenticate }               from '../middlewares/auth.middleware.js';
import { checkLimit, requireFeature } from '../middlewares/plan.middleware.js';

const router = Router();

router.get('/',         authenticate, getInvoices);
router.post('/',        authenticate, checkLimit('invoices'), createInvoice);       // Free: máx 10/mes
router.get('/stats',    authenticate, requireFeature('stats'), getInvoiceStats);    // Pro+
router.get('/settings', authenticate, getInvoiceSettings);
router.put('/settings', authenticate, updateInvoiceSettings);
router.get('/issuer', authenticate, getIssuerProfile);
router.put('/issuer', authenticate, saveIssuerProfile);
router.post('/bulk-delete', authenticate, bulkDeleteInvoices);
router.post('/bulk-status', authenticate, bulkUpdateInvoiceStatus);
router.get('/:id',      authenticate, getInvoiceById);
router.put('/:id',      authenticate, updateInvoice);
router.delete('/:id',   authenticate, softDeleteInvoice);
router.post('/:id/issue', authenticate, issueInvoice);
router.post('/:id/void', authenticate, voidInvoice);
router.post('/:id/rectify', authenticate, createRectificativa);
router.get('/:id/events', authenticate, getInvoiceEvents);
router.patch('/:id/status', authenticate, updateInvoiceStatus);
router.get('/:id/pdf',      authenticate, downloadInvoicePDF);                              // Free puede descargar PDF
router.post('/:id/send',    authenticate, requireFeature('email_send'), sendInvoiceByEmail); // Pro+

router.get('/:id/payments',               authenticate, getPayments);
router.post('/:id/payments',              authenticate, addPayment);
router.delete('/:id/payments/:paymentId', authenticate, deletePayment);

export default router;