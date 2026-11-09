import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  toggleCustomerStatus,
  deleteCustomer,
} from '../controllers/customerController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', authorize(['ADMIN', 'SALES', 'FINANCE', 'FINANCE_MANAGER']), createCustomer);
router.put('/:id', authorize(['ADMIN', 'FINANCE', 'FINANCE_MANAGER']), updateCustomer);
router.patch('/:id/status', authorize(['ADMIN', 'FINANCE_MANAGER']), toggleCustomerStatus);
router.delete('/:id', authorize(['ADMIN', 'FINANCE_MANAGER']), deleteCustomer);

export default router;
