// backend/src/routes/publicInvoice.routes.js
import { Router } from 'express';
import { getPublicInvoice } from '../controllers/publicInvoice.controller.js';

const router = Router();

// GET /api/public/invoice/:token  — sin authenticate
router.get('/invoice/:token', getPublicInvoice);

export default router;