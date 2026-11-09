import prisma from '../config/db.js';

export const getAuditLogs = async (req, res, next) => {
  try {
    const { user, action, entity, search } = req.query;

    const where = {};
    if (user && user !== 'All') where.userName = user;
    if (action && action !== 'All') where.action = action;
    if (entity && entity !== 'All') where.entityType = entity;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { remarks: { contains: search, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 200,
    });

    const formatted = logs.map(l => ({
      id: l.id,
      user: l.userName,
      role: l.userRole,
      action: l.action,
      entity: l.entityType,
      entityId: l.entityId,
      previousValue: l.previousValue || '—',
      newValue: l.newValue || '—',
      remarks: l.remarks,
      timestamp: l.timestamp.toISOString().replace('T', ' ').substring(0, 19),
    }));

    return res.json({ success: true, count: formatted.length, logs: formatted });
  } catch (error) {
    next(error);
  }
};
