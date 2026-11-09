import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter, authLimiter } from './middleware/rateLimiter.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import creditProfileRoutes from './routes/creditProfileRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import agingRoutes from './routes/agingRoutes.js';
import creditRequestRoutes from './routes/creditRequestRoutes.js';
import riskRoutes from './routes/riskRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import monitoringRoutes from './routes/monitoringRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import userRoutes from './routes/userRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../dist');

// Security & Logging Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'CREDITGUARD Core Backend Engine',
    timestamp: new Date().toISOString(),
  });
});

// Mount Modular API Routes with targeted auth rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/credit-profiles', creditProfileRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/aging', agingRoutes);
app.use('/api/credit-requests', creditRequestRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/credit-monitoring', monitoringRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// Serve built static frontend files if available (in production)
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API route ${req.originalUrl} not found.` });
});

// Single Page Application client-side routing fallback
app.get('*', (req, res, next) => {
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
