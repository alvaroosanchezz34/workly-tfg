// backend/src/routes/quotes.routes.js
import { Router } from 'express';
import {
    createQuote, getQuotes, getQuoteById,
    updateQuote, deleteQuote, convertQuoteToInvoice,
} from '../controllers/quotes.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();
router.get('/',              authenticate, getQuotes);
router.post('/',             authenticate, createQuote);
router.get('/:id',           authenticate, getQuoteById);
router.put('/:id',           authenticate, updateQuote);
router.delete('/:id',        authenticate, deleteQuote);
router.post('/:id/convert',  authenticate, convertQuoteToInvoice);

export default router;