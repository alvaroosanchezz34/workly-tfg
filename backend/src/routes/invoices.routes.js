import { Router } from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById
} from '../controllers/invoices.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { downloadInvoicePDF } from '../controllers/invoices.controller.js';

const router = Router();

router.post('/', authenticate, createInvoice);
router.get('/', authenticate, getInvoices);
router.get('/:id', authenticate, getInvoiceById);
router.get('/:id/pdf', authenticate, downloadInvoicePDF);

export default router;
