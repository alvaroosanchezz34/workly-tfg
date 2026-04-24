// backend/src/routes/creditNotes.routes.js
import { Router } from 'express';
import {
    createCreditNote, getCreditNotes, getCreditNoteById,
    issueCreditNote, deleteCreditNote,
} from '../controllers/creditNotes.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();
router.get('/',              authenticate, getCreditNotes);
router.post('/',             authenticate, createCreditNote);
router.get('/:id',           authenticate, getCreditNoteById);
router.patch('/:id/issue',   authenticate, issueCreditNote);
router.delete('/:id',        authenticate, deleteCreditNote);

export default router;