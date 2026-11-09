import { Router } from 'express';
import {
  getCreditRequests,
  getCreditRequestById,
  createCreditRequest,
  simulateCreditDecision,
} from '../controllers/creditRequestController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getCreditRequests);
router.post('/simulate', simulateCreditDecision);
router.get('/:id', getCreditRequestById);
router.post('/', authorize(['ADMIN', 'SALES', 'FINANCE', 'FINANCE_MANAGER']), createCreditRequest);

export default router;
