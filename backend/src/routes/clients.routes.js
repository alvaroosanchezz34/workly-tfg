import express from 'express';
import {
    createClient,
    getClients,
    getClientById,
    updateClient,
    deleteClient,
    getDeletedClients,
    restoreClient,
} from '../controllers/clients.controller.js';
import  { authenticate }  from '../middlewares/auth.middleware.js';

const router = express.Router();

// ⚠️ RUTAS ESPECÍFICAS PRIMERO
router.get('/deleted', authenticate, getDeletedClients);
router.put('/:id/restore', authenticate, restoreClient);

// CRUD NORMAL
router.get('/', authenticate, getClients);
router.post('/', authenticate, createClient);
router.get('/:id', authenticate, getClientById);
router.put('/:id', authenticate, updateClient);
router.delete('/:id', authenticate, deleteClient);

export default router;
