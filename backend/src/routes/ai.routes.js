// backend/src/routes/ai.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
    getBusinessSummary,
    generateInvoiceLines,
    generateSmartQuote,
    financialChat,
    ocrExpense,
} from '../controllers/ai.controller.js';

const router = Router();

// Todas las rutas de IA requieren autenticación
router.get('/summary',       authenticate, getBusinessSummary);
router.post('/invoice-lines', authenticate, generateInvoiceLines);
router.post('/smart-quote',   authenticate, generateSmartQuote);
router.post('/chat',          authenticate, financialChat);
router.post('/ocr-expense',   authenticate, ocrExpense);

export default router;
