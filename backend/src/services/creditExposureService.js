import prisma from '../config/db.js';

export class CreditExposureService {
  /**
   * Pure calculation helper for exposure, projection and utilization
   * Avoids floating point issues and guards against zero division
   */
  static computeExposureMetrics({ approvedLimit = 0, currentOutstanding = 0, newOrderAmount = 0 }) {
    const limit = Number(approvedLimit) || 0;
    const outstanding = Number(currentOutstanding) || 0;
    const order = Number(newOrderAmount) || 0;

    // Available credit (constrained to >= 0 for commercial display, but unconstrained kept for calculations)
    const rawAvailableCredit = limit - outstanding;
    const availableCredit = Math.max(0, rawAvailableCredit);

    // Credit Utilization %: (Outstanding / Limit) * 100
    let creditUtilizationPct = 0;
    if (limit > 0) {
      creditUtilizationPct = Number(((outstanding / limit) * 100).toFixed(2));
    } else if (outstanding > 0) {
      creditUtilizationPct = 100.0;
    }

    // Projected Exposure = Outstanding + New Order
    const projectedExposure = outstanding + order;

    // Excess Exposure = Max(0, Projected Exposure - Approved Limit)
    const excessExposure = Math.max(0, projectedExposure - limit);

    // Projected Utilization %: (Projected Exposure / Limit) * 100
    let projectedUtilizationPct = 0;
    if (limit > 0) {
      projectedUtilizationPct = Number(((projectedExposure / limit) * 100).toFixed(2));
    } else if (projectedExposure > 0) {
      projectedUtilizationPct = 100.0;
    }

    const isExceeded = projectedExposure > limit;

    return {
      approvedLimit: limit,
      currentOutstanding: outstanding,
      newOrderAmount: order,
      availableCredit,
      rawAvailableCredit,
      creditUtilizationPct,
      projectedExposure,
      excessExposure,
      projectedUtilizationPct,
      isExceeded,
    };
  }

  /**
   * Calculate current exposure, available credit and utilization for a customer from PostgreSQL
   */
  static async calculateExposure(customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        creditProfile: true,
        invoices: {
          where: { status: { in: ['UNPAID', 'OVERDUE'] } },
        },
      },
    });

    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found.`);
    }

    // Total Outstanding = Sum of all unpaid invoice balances (Invoice Amount - Paid Amount)
    const totalOutstanding = customer.invoices.reduce((sum, inv) => {
      const out = Number(inv.outstandingAmount ?? (Number(inv.invoiceAmount) - Number(inv.paidAmount)));
      return sum + Math.max(0, out);
    }, 0);

    const approvedLimit = customer.creditProfile
      ? Number(customer.creditProfile.approvedCreditLimit)
      : 0;

    const metrics = this.computeExposureMetrics({
      approvedLimit,
      currentOutstanding: totalOutstanding,
      newOrderAmount: 0,
    });

    // Persist current exposure back to profile in PostgreSQL
    if (customer.creditProfile) {
      await prisma.creditProfile.update({
        where: { id: customer.creditProfile.id },
        data: {
          currentExposure: totalOutstanding,
          availableCredit: metrics.availableCredit,
        },
      });
    }

    return {
      customerId,
      customerName: customer.companyName,
      customerCode: customer.customerCode,
      customerStatus: customer.status,
      isBlocked: customer.creditProfile?.isBlocked || false,
      riskCategory: customer.creditProfile?.riskCategory || 'LOW',
      riskScore: customer.creditProfile?.riskScore || 0,
      approvedLimit,
      currentExposure: totalOutstanding,
      totalOutstanding,
      availableCredit: metrics.availableCredit,
      rawAvailableCredit: metrics.rawAvailableCredit,
      creditUtilizationPct: metrics.creditUtilizationPct,
      unpaidInvoicesCount: customer.invoices.length,
    };
  }

  /**
   * Validate new credit exposure / order against commercial policies
   */
  static async validateProjectedExposure(customerId, newOrderAmount = 0) {
    const exposure = await this.calculateExposure(customerId);
    const metrics = this.computeExposureMetrics({
      approvedLimit: exposure.approvedLimit,
      currentOutstanding: exposure.totalOutstanding,
      newOrderAmount,
    });

    const flags = [];
    let isAllowed = true;

    // Rule 1: Inactive customer
    if (exposure.customerStatus !== 'ACTIVE') {
      isAllowed = false;
      flags.push('Customer account is INACTIVE. New credit allocation is forbidden.');
    }

    // Rule 2: Credit blocked
    if (exposure.isBlocked) {
      isAllowed = false;
      flags.push('Customer credit is BLOCKED by management. Requires executive unlock.');
    }

    // Rule 3: Exceeds approved credit limit
    if (metrics.isExceeded) {
      flags.push(
        `Projected exposure (₹${metrics.projectedExposure.toLocaleString('en-IN')}) exceeds approved limit (₹${exposure.approvedLimit.toLocaleString('en-IN')}) by ₹${metrics.excessExposure.toLocaleString('en-IN')}. Requires Finance Manager elevation.`
      );
    }

    // Rule 4: High risk customer
    if (exposure.riskCategory === 'HIGH' || exposure.riskScore > 50) {
      flags.push('Customer is classified as HIGH RISK. Additional risk assessment review mandated.');
    }

    return {
      ...exposure,
      ...metrics,
      isAllowed,
      flags,
    };
  }
}
