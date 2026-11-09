import prisma from '../config/db.js';
import { logAuditEvent } from '../services/auditService.js';

export const getSettings = async (req, res, next) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const riskConfig = await prisma.riskScoreConfiguration.findFirst();

    return res.json({
      success: true,
      settings: settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}),
      riskConfig,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { settings, riskConfig } = req.body;

    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    if (riskConfig) {
      const existing = await prisma.riskScoreConfiguration.findFirst();
      if (existing) {
        await prisma.riskScoreConfiguration.update({
          where: { id: existing.id },
          data: riskConfig,
        });
      }
    }

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_SETTINGS',
      entityType: 'SystemSetting',
      entityId: 'CONFIG',
      newValue: 'Platform parameters updated',
    });

    return res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (error) {
    next(error);
  }
};
