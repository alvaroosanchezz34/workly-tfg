import { Router } from 'express';
import {
    createExpense,
    getExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
    importExpenses,
} from '../controllers/expenses.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { checkLimit } from '../middlewares/plan.middleware.js';

const router = Router();

router.post('/', authenticate, checkLimit('expenses'), createExpense);
router.post('/import', authenticate, importExpenses);
router.get('/', authenticate, getExpenses);
router.get('/:id', authenticate, getExpenseById);
router.put('/:id', authenticate, updateExpense);
router.delete('/:id', authenticate, deleteExpense);

export default router;
