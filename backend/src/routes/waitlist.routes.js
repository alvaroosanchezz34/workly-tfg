import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middlewares/auth.middleware.js';
import { exportWaitlist, joinWaitlist, listWaitlist } from '../controllers/waitlist.controller.js';

const router = Router();
const joinLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiados intentos. Prueba más tarde.' },
});

router.post('/', joinLimiter, joinWaitlist);
router.get('/', authenticate, listWaitlist);
router.get('/export', authenticate, exportWaitlist);

export default router;
