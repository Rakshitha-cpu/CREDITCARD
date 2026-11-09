import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { logAuditEvent } from '../services/auditService.js';

export const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role === 'FINANCE_MANAGER' ? 'Finance Manager' : u.role === 'FINANCE' ? 'Finance Executive' : u.role === 'SALES' ? 'Credit Analyst' : 'Super Admin',
      rawRole: u.role,
      status: u.status === 'ACTIVE' ? 'Active' : 'Inactive',
      lastLogin: u.lastLogin ? u.lastLogin.toISOString().split('T')[0] : 'Never',
      permissions: u.role === 'ADMIN' ? ['all'] : u.role === 'FINANCE_MANAGER' ? ['approve_credit', 'view_reports', 'manage_customers'] : ['view_reports'],
    }));

    return res.json({ success: true, count: formatted.length, users: formatted });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, role = 'FINANCE', password = 'Password123!' } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: role.toUpperCase().replace(/\s+/g, '_'),
        passwordHash,
        status: 'ACTIVE',
      },
    });

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      newValue: JSON.stringify({ email: user.email, role: user.role }),
    });

    return res.status(201).json({ success: true, message: 'User created successfully.', user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, status } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name || user.name,
        email: email || user.email,
        role: role ? role.toUpperCase().replace(/\s+/g, '_') : user.role,
        status: status ? status.toUpperCase() : user.status,
      },
    });

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      previousValue: JSON.stringify({ email: user.email, role: user.role }),
      newValue: JSON.stringify({ email: updated.email, role: updated.role }),
    });

    return res.json({ success: true, message: 'User updated successfully.', user: updated });
  } catch (error) {
    next(error);
  }
};
