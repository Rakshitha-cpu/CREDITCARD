import { CreditMonitoringService } from '../services/creditMonitoringService.js';
import prisma from '../config/db.js';

export const getAlerts = async (req, res, next) => {
  try {
    // Run real-time scan
    await CreditMonitoringService.scanPortfolioAlerts();
    const alerts = await CreditMonitoringService.getActiveAlerts();

    // Get monitored portfolio status
    const customers = await prisma.customer.findMany({
      include: {
        creditProfile: true,
        invoices: { where: { status: { in: ['UNPAID', 'OVERDUE'] } } },
      },
      orderBy: { companyName: 'asc' },
    });

    const now = new Date();
    const monitored = customers.map(c => {
      const limit = c.creditProfile ? Number(c.creditProfile.approvedCreditLimit) : 0;
      const outstanding = c.invoices.reduce((s, i) => s + Number(i.outstandingAmount), 0);
      const overdue = c.invoices
        .filter(i => new Date(i.dueDate) < now)
        .reduce((s, i) => s + Number(i.outstandingAmount), 0);

      const util = limit > 0 ? Number(((outstanding / limit) * 100).toFixed(1)) : 0;

      let level = 'Normal';
      if (util > 100) level = 'Limit Exceeded';
      else if (util >= 100) level = 'Limit Reached';
      else if (util >= 85) level = 'Critical Warning';
      else if (util >= 70) level = 'Warning';

      return {
        id: c.id,
        customerCode: c.customerCode,
        companyName: c.companyName,
        businessCategory: c.businessCategory,
        creditLimit: limit,
        outstanding,
        overdue,
        utilizationPct: util,
        level,
        hasOverdue: overdue > 0,
        riskCategory: c.creditProfile?.riskCategory === 'HIGH' ? 'High' : c.creditProfile?.riskCategory === 'MEDIUM' ? 'Medium' : 'Low',
      };
    });

    const stats = {
      approaching: monitored.filter(c => c.level === 'Warning').length,
      critical: monitored.filter(c => c.level === 'Critical Warning').length,
      reachedOrExceeded: monitored.filter(c => c.level === 'Limit Reached' || c.level === 'Limit Exceeded').length,
      overdueCount: monitored.filter(c => c.hasOverdue).length,
    };

    return res.json({ success: true, stats, alerts, monitored });
  } catch (error) {
    next(error);
  }
};

export const dismissAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await CreditMonitoringService.dismissAlert(id);
    return res.json({ success: true, message: 'Alert dismissed.', alert });
  } catch (error) {
    next(error);
  }
};
