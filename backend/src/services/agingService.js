import prisma from '../config/db.js';

export class AgingService {
  /**
   * Pure aging categorization helper for list of invoices
   */
  static categorizeInvoicesIntoBuckets(invoices = [], now = new Date()) {
    let current = 0;
    let bucket1to30 = 0;
    let bucket31to60 = 0;
    let bucket60plus = 0;
    let totalOutstanding = 0;

    invoices.forEach(inv => {
      const outstanding = Number(inv.outstandingAmount ?? (Number(inv.invoiceAmount) - Number(inv.paidAmount)));
      if (outstanding <= 0) return;

      totalOutstanding += outstanding;
      const dueDate = new Date(inv.dueDate);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        current += outstanding;
      } else if (diffDays <= 30) {
        bucket1to30 += outstanding;
      } else if (diffDays <= 60) {
        bucket31to60 += outstanding;
      } else {
        bucket60plus += outstanding;
      }
    });

    return {
      current,
      bucket1to30,
      bucket31to60,
      bucket60plus,
      totalOutstanding,
    };
  }

  /**
   * Calculate invoice aging dynamically based on current date
   * @param {string|null} customerId
   */
  static async getAgingSummary(customerId = null) {
    const now = new Date();

    const whereClause = {
      status: { in: ['UNPAID', 'OVERDUE'] },
    };
    if (customerId) {
      whereClause.customerId = customerId;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, customerCode: true, companyName: true, status: true },
        },
      },
    });

    let current = 0;
    let days1To30 = 0;
    let days31To60 = 0;
    let days60Plus = 0;
    let totalOverdue = 0;
    let totalOutstanding = 0;

    const categorizedInvoices = invoices.map(inv => {
      // Outstanding = Invoice Amount - Paid Amount
      const outstanding = Number(inv.outstandingAmount ?? (Number(inv.invoiceAmount) - Number(inv.paidAmount)));
      if (outstanding <= 0) return null;

      totalOutstanding += outstanding;

      const dueDate = new Date(inv.dueDate);
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let bucket = 'Current';
      if (diffDays <= 0) {
        current += outstanding;
      } else if (diffDays <= 30) {
        days1To30 += outstanding;
        totalOverdue += outstanding;
        bucket = '1-30 Days';
      } else if (diffDays <= 60) {
        days31To60 += outstanding;
        totalOverdue += outstanding;
        bucket = '31-60 Days';
      } else {
        days60Plus += outstanding;
        totalOverdue += outstanding;
        bucket = '60+ Days';
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customer?.companyName || 'Unknown',
        customerCode: inv.customer?.customerCode || 'N/A',
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        invoiceAmount: Number(inv.invoiceAmount),
        paidAmount: Number(inv.paidAmount),
        outstandingAmount: outstanding,
        status: inv.status,
        daysOverdue: Math.max(0, diffDays),
        bucket,
      };
    }).filter(Boolean);

    return {
      asOfDate: now.toISOString(),
      buckets: {
        current: Math.round(current),
        days1To30: Math.round(days1To30),
        days31To60: Math.round(days31To60),
        days60Plus: Math.round(days60Plus),
      },
      totalOutstanding: Math.round(totalOutstanding),
      totalOverdue: Math.round(totalOverdue),
      totalCurrent: Math.round(current),
      overdueInvoicesCount: categorizedInvoices.filter(i => i.daysOverdue > 0).length,
      totalUnpaidInvoicesCount: categorizedInvoices.length,
      invoices: categorizedInvoices,
    };
  }

  /**
   * Group aging by customer for customer-wise aging report
   */
  static async getCustomerWiseAging() {
    const summary = await this.getAgingSummary();
    const grouped = {};

    summary.invoices.forEach(inv => {
      if (!grouped[inv.customerId]) {
        grouped[inv.customerId] = {
          customerId: inv.customerId,
          customerName: inv.customerName,
          customerCode: inv.customerCode,
          current: 0,
          days1To30: 0,
          days31To60: 0,
          days60Plus: 0,
          totalOutstanding: 0,
          totalOverdue: 0,
          overdueInvoiceCount: 0,
        };
      }

      const c = grouped[inv.customerId];
      c.totalOutstanding += inv.outstandingAmount;

      if (inv.bucket === 'Current') {
        c.current += inv.outstandingAmount;
      } else if (inv.bucket === '1-30 Days') {
        c.days1To30 += inv.outstandingAmount;
        c.totalOverdue += inv.outstandingAmount;
        c.overdueInvoiceCount++;
      } else if (inv.bucket === '31-60 Days') {
        c.days31To60 += inv.outstandingAmount;
        c.totalOverdue += inv.outstandingAmount;
        c.overdueInvoiceCount++;
      } else {
        c.days60Plus += inv.outstandingAmount;
        c.totalOverdue += inv.outstandingAmount;
        c.overdueInvoiceCount++;
      }
    });

    return Object.values(grouped).sort((a, b) => b.totalOverdue - a.totalOverdue);
  }
}
