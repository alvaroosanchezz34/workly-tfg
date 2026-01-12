import { Router } from 'express';
import { getMe, updateMe } from '../controllers/users.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/me', authenticate, getMe);
router.put('/me', authenticate, updateMe);

export default router;
