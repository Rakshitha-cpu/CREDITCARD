import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  cancelInvoice,
} from '../controllers/invoiceController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.post('/', authorize(['ADMIN', 'FINANCE', 'FINANCE_MANAGER']), createInvoice);
router.put('/:id', authorize(['ADMIN', 'FINANCE', 'FINANCE_MANAGER']), updateInvoice);
router.patch('/:id/cancel', authorize(['ADMIN', 'FINANCE_MANAGER']), cancelInvoice);

export default router;
