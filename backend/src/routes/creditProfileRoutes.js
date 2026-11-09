import { Router } from 'express';
import {
  getCreditProfiles,
  getCustomerProfile,
  updateCreditProfile,
  getCreditLimitHistory,
} from '../controllers/creditProfileController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getCreditProfiles);
router.get('/:customerId', getCustomerProfile);
router.put('/:customerId', authorize(['ADMIN', 'FINANCE_MANAGER']), updateCreditProfile);
router.get('/:customerId/history', getCreditLimitHistory);

export default router;
