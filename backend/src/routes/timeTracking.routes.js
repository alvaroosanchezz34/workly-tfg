// backend/src/routes/timeTracking.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
    getTimeEntries, getActiveEntry, startTimer,
    stopTimer, addManualEntry, deleteTimeEntry, getTimeStats,
} from '../controllers/timeTracking.controller.js';

const router = Router();

router.get('/',           authenticate, getTimeEntries);
router.get('/active',     authenticate, getActiveEntry);
router.get('/stats',      authenticate, getTimeStats);
router.post('/start',     authenticate, startTimer);
router.post('/manual',    authenticate, addManualEntry);
router.patch('/:id/stop', authenticate, stopTimer);
router.delete('/:id',     authenticate, deleteTimeEntry);

export default router;
