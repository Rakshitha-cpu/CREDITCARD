import prisma from '../config/db.js';

export class PaymentBehaviorService {
  /**
   * Analyze customer payment history from actual invoices and allocations
   * @param {string} customerId
   */
  static async analyzeCustomerPaymentBehavior(customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        creditProfile: true,
        invoices: {
          include: {
            allocations: {
              include: {
                payment: true,
              },
              orderBy: { allocatedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found.`);
    }

    const invoices = customer.invoices || [];
    const paidInvoices = invoices.filter(inv => inv.status === 'PAID');

    let onTimeCount = 0;
    let lateCount = 0;
    let totalDelayDays = 0;

    for (const inv of paidInvoices) {
      const dueDate = new Date(inv.dueDate);
      
      // Determine final payment date from allocations
      let finalPaymentDate = inv.updatedAt;
      if (inv.allocations && inv.allocations.length > 0) {
        // Take the latest payment allocation date
        const latestAllocation = inv.allocations.reduce((latest, current) => {
          const currDate = current.payment?.paymentDate || current.allocatedAt;
          return new Date(currDate) > new Date(latest) ? currDate : latest;
        }, inv.allocations[0].payment?.paymentDate || inv.allocations[0].allocatedAt);

        finalPaymentDate = new Date(latestAllocation);
      }

      const diffTime = finalPaymentDate.getTime() - dueDate.getTime();
      const delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (delayDays <= 0) {
        onTimeCount++;
      } else {
        lateCount++;
        totalDelayDays += delayDays;
      }
    }

    const totalEvaluated = paidInvoices.length;
    const latePaymentPct = totalEvaluated > 0
      ? Number(((lateCount / totalEvaluated) * 100).toFixed(1))
      : 0;

    const avgPaymentDelay = lateCount > 0
      ? Math.round(totalDelayDays / lateCount)
      : 0;

    // Check currently overdue invoices
    const now = new Date();
    const currentlyOverdueInvoices = invoices.filter(
      inv => inv.status !== 'PAID' && new Date(inv.dueDate) < now
    );

    let maxCurrentOverdueDays = 0;
    currentlyOverdueInvoices.forEach(inv => {
      const diff = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 86400));
      if (diff > maxCurrentOverdueDays) maxCurrentOverdueDays = diff;
    });

    // Classification Rule:
    // EXCELLENT: >= 90% on-time, avg delay <= 2 days, no severely overdue invoices
    // GOOD: >= 75% on-time, avg delay <= 10 days
    // MODERATE: >= 50% on-time, avg delay <= 25 days
    // POOR: < 50% on-time, or avg delay > 25 days, or currently overdue > 60 days
    let classification = 'GOOD';

    if (maxCurrentOverdueDays > 60 || (totalEvaluated >= 3 && latePaymentPct > 60) || avgPaymentDelay > 30) {
      classification = 'POOR';
    } else if (totalEvaluated === 0) {
      classification = currentlyOverdueInvoices.length > 0 ? 'MODERATE' : 'GOOD';
    } else if (latePaymentPct <= 10 && avgPaymentDelay <= 2 && maxCurrentOverdueDays === 0) {
      classification = 'EXCELLENT';
    } else if (latePaymentPct <= 30 && avgPaymentDelay <= 10 && maxCurrentOverdueDays <= 15) {
      classification = 'GOOD';
    } else if (latePaymentPct <= 55 && avgPaymentDelay <= 25) {
      classification = 'MODERATE';
    } else {
      classification = 'POOR';
    }

    // Persist payment behavior in credit profile if changed
    if (customer.creditProfile && customer.creditProfile.paymentBehavior !== classification) {
      await prisma.creditProfile.update({
        where: { id: customer.creditProfile.id },
        data: { paymentBehavior: classification },
      });
    }

    return {
      customerId,
      customerName: customer.companyName,
      totalInvoices: invoices.length,
      paidInvoicesCount: totalEvaluated,
      onTimePaymentsCount: onTimeCount,
      latePaymentsCount: lateCount,
      latePaymentPct,
      avgPaymentDelayDays: avgPaymentDelay,
      currentlyOverdueCount: currentlyOverdueInvoices.length,
      maxCurrentOverdueDays,
      paymentBehavior: classification,
    };
  }
}
