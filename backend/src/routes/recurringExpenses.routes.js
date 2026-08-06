// backend/src/routes/recurringExpenses.routes.js
import { Router } from 'express';
import {
    createRecurringExpense, getRecurringExpenses,
    updateRecurringExpenseStatus, deleteRecurringExpense,
} from '../controllers/recurringExpenses.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireFeature } from '../middlewares/plan.middleware.js';

const router = Router();

router.get('/',              authenticate, getRecurringExpenses);
router.post('/',             authenticate, requireFeature('recurring'), createRecurringExpense);
router.patch('/:id/status',  authenticate, updateRecurringExpenseStatus);
router.delete('/:id',        authenticate, deleteRecurringExpense);

export default router;
