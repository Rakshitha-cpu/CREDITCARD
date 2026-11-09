import { Router } from 'express';
import {
  getRiskAssessment,
  getPortfolioRisk,
  runBatchReassessment,
} from '../controllers/riskController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/portfolio', getPortfolioRisk);
router.post('/batch-reassess', runBatchReassessment);
router.get('/customer/:customerId', getRiskAssessment);

export default router;
