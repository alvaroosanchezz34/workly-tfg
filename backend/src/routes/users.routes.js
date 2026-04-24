import { Router } from 'express';
import { getMe, updateMe, updateProfile } from '../controllers/users.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/me',      authenticate, getMe);
router.put('/me',      authenticate, updateMe);
router.put('/profile', authenticate, updateProfile); // ← usado por Profile.jsx

export default router;