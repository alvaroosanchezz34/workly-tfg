import express from 'express';
import {
    createClient, getClients, getClientById,
    updateClient, deleteClient, getDeletedClients, restoreClient,
    getClientProfile,
} from '../controllers/clients.controller.js';
import { authenticate }  from '../middlewares/auth.middleware.js';
import { checkLimit }    from '../middlewares/plan.middleware.js';

const router = express.Router();

router.get('/deleted',       authenticate, getDeletedClients);
router.put('/:id/restore',   authenticate, restoreClient);
router.get('/:id/profile',   authenticate, getClientProfile);   // mini-CRM

router.get('/',    authenticate, getClients);
router.post('/',   authenticate, checkLimit('clients'), createClient);  // Free: máx 5
router.get('/:id', authenticate, getClientById);
router.put('/:id', authenticate, updateClient);
router.delete('/:id', authenticate, deleteClient);

export default router;