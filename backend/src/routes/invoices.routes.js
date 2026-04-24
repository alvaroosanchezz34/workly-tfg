import { Router } from 'express';
import {
    createInvoice, getInvoices, getInvoiceById, updateInvoice, softDeleteInvoice,
    downloadInvoicePDF, updateInvoiceStatus, sendInvoiceByEmail,
    addPayment, getPayments, deletePayment,
    getInvoiceStats, getInvoiceSettings, updateInvoiceSettings,
} from '../controllers/invoices.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/',          authenticate, getInvoices);
router.post('/',         authenticate, createInvoice);
router.get('/stats',     authenticate, getInvoiceStats);
router.get('/settings',  authenticate, getInvoiceSettings);
router.put('/settings',  authenticate, updateInvoiceSettings);
router.get('/:id',       authenticate, getInvoiceById);
router.put('/:id',       authenticate, updateInvoice);
router.delete('/:id',    authenticate, softDeleteInvoice);
router.patch('/:id/status', authenticate, updateInvoiceStatus);
router.get('/:id/pdf',   authenticate, downloadInvoicePDF);
router.post('/:id/send', authenticate, sendInvoiceByEmail);

router.get('/:id/payments',               authenticate, getPayments);
router.post('/:id/payments',              authenticate, addPayment);
router.delete('/:id/payments/:paymentId', authenticate, deletePayment);

export default router;