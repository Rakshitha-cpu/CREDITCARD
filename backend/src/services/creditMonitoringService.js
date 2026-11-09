import prisma from '../config/db.js';

export class CreditMonitoringService {
  /**
   * Run automated portfolio scan and update alerts
   */
  static async scanPortfolioAlerts() {
    const customers = await prisma.customer.findMany({
      include: {
        creditProfile: true,
        invoices: {
          where: { status: { in: ['UNPAID', 'OVERDUE'] } },
        },
      },
    });

    const now = new Date();
    const generatedAlerts = [];

    for (const cust of customers) {
      if (!cust.creditProfile) continue;

      const limit = Number(cust.creditProfile.approvedCreditLimit);
      const exposure = cust.invoices.reduce((s, i) => {
        const out = Number(i.outstandingAmount ?? (Number(i.invoiceAmount) - Number(i.paidAmount)));
        return s + Math.max(0, out);
      }, 0);

      const utilPct = limit > 0 ? (exposure / limit) * 100 : (exposure > 0 ? 100 : 0);

      const overdueInvoices = cust.invoices.filter(i => new Date(i.dueDate) < now);
      const overdueAmount = overdueInvoices.reduce((s, i) => {
        const out = Number(i.outstandingAmount ?? (Number(i.invoiceAmount) - Number(i.paidAmount)));
        return s + Math.max(0, out);
      }, 0);

      let maxOverdueDays = 0;
      overdueInvoices.forEach(inv => {
        const diff = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 86400));
        if (diff > maxOverdueDays) maxOverdueDays = diff;
      });

      // 1. Credit Utilization Alerts
      let triggeredType = null;
      let severity = 'LOW';
      let message = '';

      if (utilPct > 100) {
        triggeredType = 'EXCEEDED_OVER_100';
        severity = 'CRITICAL';
        message = `${cust.companyName} has EXCEEDED approved limit (${utilPct.toFixed(1)}% utilization, ₹${exposure.toLocaleString('en-IN')} outstanding). Immediate credit hold recommended.`;
      } else if (utilPct >= 100) {
        triggeredType = 'LIMIT_100';
        severity = 'HIGH';
        message = `${cust.companyName} has reached 100% credit capacity. Further shipments should be halted until payment receipt.`;
      } else if (utilPct >= 85) {
        triggeredType = 'CRITICAL_85';
        severity = 'HIGH';
        message = `${cust.companyName} is at ${utilPct.toFixed(1)}% utilization (Critical threshold: 85%). Exposure: ₹${exposure.toLocaleString('en-IN')}.`;
      } else if (utilPct >= 70) {
        triggeredType = 'WARNING_70';
        severity = 'MEDIUM';
        message = `${cust.companyName} has crossed 70% credit utilization (${utilPct.toFixed(1)}%). Monitor payment track record.`;
      }

      if (triggeredType) {
        await this._recordAlertIfNotActive({
          customerId: cust.id,
          alertType: triggeredType,
          severity,
          message,
          generatedAlerts,
        });
      }

      // 2. Invoices Overdue Alert
      if (maxOverdueDays > 0 && overdueAmount > 0) {
        await this._recordAlertIfNotActive({
          customerId: cust.id,
          alertType: 'OVERDUE_DEFAULT',
          severity: maxOverdueDays > 60 ? 'CRITICAL' : maxOverdueDays > 30 ? 'HIGH' : 'MEDIUM',
          message: `${cust.companyName} has receivables overdue by ${maxOverdueDays} days (Overdue balance: ₹${overdueAmount.toLocaleString('en-IN')}).`,
          generatedAlerts,
        });
      }
    }

    return {
      scannedCustomersCount: customers.length,
      newAlertsCount: generatedAlerts.length,
      alerts: generatedAlerts,
    };
  }

  static async _recordAlertIfNotActive({ customerId, alertType, severity, message, generatedAlerts }) {
    const existing = await prisma.creditAlert.findFirst({
      where: {
        customerId,
        alertType,
        isDismissed: false,
      },
    });

    if (!existing) {
      const alert = await prisma.creditAlert.create({
        data: {
          customerId,
          alertType,
          severity,
          message,
        },
      });
      generatedAlerts.push(alert);
    }
  }

  static async getActiveAlerts() {
    return await prisma.creditAlert.findMany({
      where: { isDismissed: false },
      include: {
        customer: {
          select: { id: true, customerCode: true, companyName: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async dismissAlert(alertId) {
    return await prisma.creditAlert.update({
      where: { id: alertId },
      data: { isDismissed: true, dismissedAt: new Date() },
    });
  }
}
