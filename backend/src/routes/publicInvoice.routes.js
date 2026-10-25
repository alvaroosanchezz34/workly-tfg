// backend/src/routes/publicInvoice.routes.js
import { Router } from 'express';
import { getPublicInvoice, createPublicInvoiceCheckout } from '../controllers/publicInvoice.controller.js';
import { acceptPublicQuote, getPublicQuote } from '../controllers/publicQuote.controller.js';

const router = Router();

// GET /api/public/invoice/:token  — sin authenticate
router.get('/quote/:token', getPublicQuote);
router.post('/quote/:token/accept', acceptPublicQuote);
router.get('/invoice/:token', getPublicInvoice);
router.post('/invoice/:token/checkout', createPublicInvoiceCheckout);

export default router;