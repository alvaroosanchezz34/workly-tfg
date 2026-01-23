import express from 'express';
import { getActivityLogs } from '../controllers/activityLogs.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, getActivityLogs);

export default router;
