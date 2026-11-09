import { Router } from 'express';
import { getAlerts, dismissAlert } from '../controllers/monitoringController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getAlerts);
router.patch('/:id/dismiss', dismissAlert);

export default router;
