import { Router } from 'express';
import { getAgingReport } from '../controllers/agingController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/', getAgingReport);

export default router;
