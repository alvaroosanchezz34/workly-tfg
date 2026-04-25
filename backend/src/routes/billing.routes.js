// backend/src/routes/billing.routes.js
import { Router } from 'express';
import express from 'express';
import { getPlans, getBillingStatus, createCheckout, createPortal, stripeWebhook } from '../controllers/billing.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// Webhook necesita raw body (antes del json parser)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Rutas protegidas
router.get('/plans',    getPlans);
router.get('/status',   authenticate, getBillingStatus);
router.post('/checkout', authenticate, createCheckout);
router.post('/portal',   authenticate, createPortal);

export default router;