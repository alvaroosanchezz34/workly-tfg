// backend/src/routes/tasks.routes.js
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { getTasks, createTask, updateTask, deleteTask, moveTask } from '../controllers/tasks.controller.js';

// Rutas anidadas bajo /api/projects/:projectId/tasks
const router = Router({ mergeParams: true });

router.get('/',              authenticate, getTasks);
router.post('/',             authenticate, createTask);
router.put('/:taskId',       authenticate, updateTask);
router.delete('/:taskId',    authenticate, deleteTask);
router.patch('/:taskId/move', authenticate, moveTask);

export default router;
