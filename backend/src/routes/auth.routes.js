import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { refreshToken } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

export default router;
