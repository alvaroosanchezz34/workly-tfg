// backend/src/routes/quotes.routes.js
import { Router } from 'express';
import {
    createQuote, getQuotes, getQuoteById,
    updateQuote, deleteQuote, convertQuoteToInvoice,
} from '../controllers/quotes.controller.js';
import { authenticate }     from '../middlewares/auth.middleware.js';
import { requireFeature }   from '../middlewares/plan.middleware.js';

const router = Router();

// Todas las rutas de presupuestos requieren plan Pro o superior (quotes: false en Free)
router.get('/',              authenticate, requireFeature('quotes'), getQuotes);
router.post('/',             authenticate, requireFeature('quotes'), createQuote);
router.get('/:id',           authenticate, requireFeature('quotes'), getQuoteById);
router.put('/:id',           authenticate, requireFeature('quotes'), updateQuote);
router.delete('/:id',        authenticate, requireFeature('quotes'), deleteQuote);
router.post('/:id/convert',  authenticate, requireFeature('quotes'), convertQuoteToInvoice);

export default router;