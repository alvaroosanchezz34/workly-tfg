// backend/src/routes/invoices.routes.js
import { Router } from 'express';
import {
    createInvoice, getInvoices, getInvoiceById, updateInvoice, softDeleteInvoice,
    downloadInvoicePDF, updateInvoiceStatus,
    addPayment, getPayments, deletePayment,
    getInvoiceStats,
    getInvoiceSettings, updateInvoiceSettings,
} from '../controllers/invoices.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// CRUD base
router.get('/',         authenticate, getInvoices);
router.post('/',        authenticate, createInvoice);
router.get('/stats',    authenticate, getInvoiceStats);
router.get('/settings', authenticate, getInvoiceSettings);
router.put('/settings', authenticate, updateInvoiceSettings);
router.get('/:id',      authenticate, getInvoiceById);
router.put('/:id',      authenticate, updateInvoice);
router.delete('/:id',   authenticate, softDeleteInvoice);

// Estado rápido
router.patch('/:id/status', authenticate, updateInvoiceStatus);

// PDF
router.get('/:id/pdf',  authenticate, downloadInvoicePDF);

// Pagos
router.get('/:id/payments',         authenticate, getPayments);
router.post('/:id/payments',        authenticate, addPayment);
router.delete('/:id/payments/:paymentId', authenticate, deletePayment);

export default router;