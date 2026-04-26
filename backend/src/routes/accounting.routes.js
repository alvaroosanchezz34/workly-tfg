import { Router } from 'express';
import { getSummary, getModelo130, getModelo303, getLibro } from '../controllers/accounting.controller.js';
import { authenticate }   from '../middlewares/auth.middleware.js';
import { requireFeature } from '../middlewares/plan.middleware.js';

const router = Router();

// Contabilidad — disponible desde plan Pro
router.get('/summary',    authenticate, requireFeature('stats'), getSummary);
router.get('/modelo130',  authenticate, requireFeature('stats'), getModelo130);
router.get('/modelo303',  authenticate, requireFeature('stats'), getModelo303);
router.get('/libro',      authenticate, requireFeature('stats'), getLibro);

export default router;