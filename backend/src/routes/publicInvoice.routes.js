// backend/src/routes/publicInvoice.routes.js
import { Router } from 'express';
import { getPublicInvoice, createPublicInvoiceCheckout } from '../controllers/publicInvoice.controller.js';

const router = Router();

// GET /api/public/invoice/:token  — sin authenticate
router.get('/invoice/:token', getPublicInvoice);
router.post('/invoice/:token/checkout', createPublicInvoiceCheckout);

export default router;