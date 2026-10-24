import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { deleteAccount, exportAccount } from '../controllers/account.controller.js';

const router = Router();

router.get('/export', authenticate, exportAccount);
router.post('/delete', authenticate, deleteAccount);

export default router;
