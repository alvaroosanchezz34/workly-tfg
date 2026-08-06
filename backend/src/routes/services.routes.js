import express from 'express';
import {
  getServices,
  createService,
  updateService,
  deleteService,
} from '../controllers/services.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { checkLimit } from '../middlewares/plan.middleware.js';

const router = express.Router();

router.get('/', authenticate, getServices);
router.post('/', authenticate, checkLimit('services'), createService);
router.put('/:id', authenticate, updateService);
router.delete('/:id', authenticate, deleteService);

export default router;
