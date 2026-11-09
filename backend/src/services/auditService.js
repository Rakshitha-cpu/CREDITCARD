import prisma from '../config/db.js';

export const logAuditEvent = async ({
  userId = null,
  userName = 'System',
  userRole = 'SYSTEM',
  action,
  entityType,
  entityId,
  previousValue = null,
  newValue = null,
  remarks = null,
}) => {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        userName,
        userRole,
        action,
        entityType,
        entityId: String(entityId),
        previousValue: previousValue !== null ? String(previousValue) : null,
        newValue: newValue !== null ? String(newValue) : null,
        remarks,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log event:', error);
  }
};
