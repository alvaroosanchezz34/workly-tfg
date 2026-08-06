// backend/src/routes/notifications.routes.js
import { Router } from 'express';
import { getNotifications, markRead, markAllRead } from '../controllers/notifications.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/',              authenticate, getNotifications);
router.patch('/read-all',    authenticate, markAllRead);
router.patch('/:id/read',    authenticate, markRead);

export default router;
