import { Router } from 'express';
import { login, getCurrentUser, register } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.post('/register', authenticate, authorize(['ADMIN']), register);

export default router;
