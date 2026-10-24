import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
    deleteCertificate, getDeclaracionResponsable, getVerifactuRecord, getVerifactuSettings,
    listVerifactuRecords, resubmitVerifactuRecord, saveVerifactuSettings, uploadCertificate,
} from '../controllers/verifactu.controller.js';

const router = Router();

router.get('/settings', authenticate, getVerifactuSettings);
router.put('/settings', authenticate, saveVerifactuSettings);
router.post('/certificate', authenticate, uploadCertificate);
router.delete('/certificate', authenticate, deleteCertificate);
router.get('/declaracion', authenticate, getDeclaracionResponsable);
router.get('/records', authenticate, listVerifactuRecords);
router.get('/records/:id', authenticate, getVerifactuRecord);
router.post('/records/:id/resubmit', authenticate, resubmitVerifactuRecord);

export default router;
