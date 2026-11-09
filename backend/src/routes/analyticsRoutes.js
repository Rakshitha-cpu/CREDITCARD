import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.get('/dashboard', getDashboardAnalytics);

export default router;
