import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authenticate, getDashboardData);

export default router;
