import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { logAuditEvent } from '../services/auditService.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'creditguard_super_secure_jwt_secret_key_2026_enterprise_finance',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      remarks: `User ${user.email} logged in successfully`,
    });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    return res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { email, password, name, role = 'FINANCE' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Please provide email, password, and name.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        status: 'ACTIVE',
      },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    });

    await logAuditEvent({
      userId: req.user?.id || user.id,
      userName: req.user?.name || user.name,
      userRole: req.user?.role || user.role,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      newValue: JSON.stringify({ email: user.email, role: user.role }),
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};
