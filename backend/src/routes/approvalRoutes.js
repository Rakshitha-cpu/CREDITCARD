import { Router } from 'express';
import {
  getPendingApprovals,
  approveCreditRequest,
  rejectCreditRequest,
} from '../controllers/approvalController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize(['ADMIN', 'FINANCE_MANAGER', 'FINANCE']), getPendingApprovals);
router.post('/:id/approve', authorize(['ADMIN', 'FINANCE_MANAGER']), approveCreditRequest);
router.post('/:id/reject', authorize(['ADMIN', 'FINANCE_MANAGER']), rejectCreditRequest);

export default router;
