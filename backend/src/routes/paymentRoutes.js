import { Router } from 'express';
import { getPayments, getPaymentById, createPayment } from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getPayments);
router.get('/:id', getPaymentById);
router.post('/', authorize(['ADMIN', 'FINANCE', 'FINANCE_MANAGER']), createPayment);

export default router;
