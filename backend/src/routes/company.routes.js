// backend/src/routes/company.routes.js
import { Router } from 'express';
import {
    createCompany, getMyCompany, updateCompany,
    getTeamMembers, inviteMember, acceptInvite,
    updateMemberRole, updateMemberStatus, removeMember,
    getTeamDashboard, assignClient, assignProject,
} from '../controllers/company.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { resolveCompany, requireCompanyAdmin } from '../middlewares/company.middleware.js';

const router = Router();

// Empresa propia
router.post('/',    authenticate, resolveCompany, createCompany);
router.get('/',     authenticate, resolveCompany, getMyCompany);
router.put('/',     authenticate, resolveCompany, requireCompanyAdmin, updateCompany);

// Equipo
router.get('/team',                    authenticate, resolveCompany, requireCompanyAdmin, getTeamMembers);
router.post('/team/invite',            authenticate, resolveCompany, requireCompanyAdmin, inviteMember);
router.patch('/team/:userId/role',     authenticate, resolveCompany, requireCompanyAdmin, updateMemberRole);
router.patch('/team/:userId/status',   authenticate, resolveCompany, requireCompanyAdmin, updateMemberStatus);
router.delete('/team/:userId',         authenticate, resolveCompany, requireCompanyAdmin, removeMember);

// Dashboard consolidado
router.get('/dashboard', authenticate, resolveCompany, requireCompanyAdmin, getTeamDashboard);

// Asignaciones
router.patch('/clients/:clientId/assign',   authenticate, resolveCompany, requireCompanyAdmin, assignClient);
router.patch('/projects/:projectId/assign', authenticate, resolveCompany, requireCompanyAdmin, assignProject);

// Aceptar invitación (pública, no requiere auth)
router.post('/invite/:token/accept', acceptInvite);

export default router;