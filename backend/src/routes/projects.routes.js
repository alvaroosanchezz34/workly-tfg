import { Router } from 'express';
import {
    createProject, getProjects, getProjectById,
    updateProject, deleteProject,
} from '../controllers/projects.controller.js';
import { authenticate }  from '../middlewares/auth.middleware.js';
import { checkLimit }    from '../middlewares/plan.middleware.js';

const router = Router();

router.get('/',    authenticate, getProjects);
router.post('/',   authenticate, checkLimit('projects'), createProject);  // Free: máx 3
router.get('/:id', authenticate, getProjectById);
router.put('/:id', authenticate, updateProject);
router.delete('/:id', authenticate, deleteProject);

export default router;