import prisma from '../config/db.js';
import { CreditExposureService } from './creditExposureService.js';
import { RiskScoringService } from './riskScoringService.js';
import { PaymentBehaviorService } from './paymentBehaviorService.js';

export class CreditDecisionService {
  /**
   * Evaluate a customer credit request or simulated order against risk & credit limits
   * @param {Object} params
   * @param {string} params.customerId
   * @param {number} params.requestedAmount - new order amount or credit limit increase
   * @param {boolean} [params.isTemporary=false]
   * @param {string} [params.validityPeriod]
   */
  static async evaluateCreditDecision({ customerId, requestedAmount = 0, isTemporary = false, validityPeriod = null }) {
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
      return {
        decision: 'REJECTED',
        reason: `Customer with ID '${customerId}' does not exist in the database.`,
        recommendation: 'Reject request. Verify customer registration.',
      };
    }

    const orderAmount = Number(requestedAmount) || 0;
    if (orderAmount < 0) {
      return {
        decision: 'REJECTED',
        reason: 'Requested amount must be greater than or equal to zero.',
        recommendation: 'Reject request. Correct invalid requested amount.',
      };
    }

    // Check validity period if provided
    if (validityPeriod && new Date(validityPeriod) < new Date()) {
      return {
        decision: 'REJECTED',
        reason: 'The proposed validity period date has already expired.',
        recommendation: 'Reject request. Provide a valid future validity date.',
      };
    }

    // 1. Customer Account Status Check
    if (customer.status !== 'ACTIVE') {
      return {
        decision: 'CREDIT_BLOCKED',
        reason: `Customer account is ${customer.status}. Credit extensions and shipments are strictly halted for inactive entities.`,
        recommendation: 'Account blocked. Contact legal / compliance department to reactivate customer account.',
        customerStatus: customer.status,
      };
    }

    // 2. Credit Profile Hold / Block Check
    if (customer.creditProfile?.isBlocked) {
      return {
        decision: 'CREDIT_BLOCKED',
        reason: 'Customer credit line is currently under operational or managerial HOLD. No shipments or limit enhancements permitted.',
        recommendation: 'Account blocked. Management authorization required to remove credit hold.',
        isBlocked: true,
      };
    }

    // 3. Compute Real-Time Exposure and Risk Metrics
    const exposure = await CreditExposureService.calculateExposure(customerId);
    const risk = await RiskScoringService.evaluateCustomerRisk(customerId);
    const behavior = await PaymentBehaviorService.analyzeCustomerPaymentBehavior(customerId);

    const approvedLimit = exposure.approvedLimit;
    const currentOutstanding = exposure.totalOutstanding;
    const metrics = CreditExposureService.computeExposureMetrics({
      approvedLimit,
      currentOutstanding,
      newOrderAmount: orderAmount,
    });

    // Check for severe overdue receivables (>60 days past due)
    const now = new Date();
    const severelyOverdueInvoices = customer.invoices.filter(
      inv => inv.status !== 'PAID' && new Date(inv.dueDate) < new Date(now.getTime() - 60 * 86400 * 1000)
    );

    let decision = 'ELIGIBLE';
    let reason = '';
    let recommendation = '';

    // ==========================================
    // Decision Tree Evaluation
    // ==========================================

    // Case A: Severely overdue invoices (>60 days overdue)
    if (severelyOverdueInvoices.length > 0) {
      decision = 'CREDIT_BLOCKED';
      reason = `Customer has ${severelyOverdueInvoices.length} invoices overdue beyond 60 days. Default recovery policy blocks all further credit.`;
      recommendation = 'Hold all dispatches. Demand immediate clearance of overdue receivables before considering credit.';
    }
    // Case B: Projected exposure exceeds approved limit
    else if (metrics.isExceeded) {
      decision = 'APPROVAL_REQUIRED';
      reason = `Projected exposure of ₹${metrics.projectedExposure.toLocaleString('en-IN')} exceeds approved credit limit of ₹${approvedLimit.toLocaleString('en-IN')} by ₹${metrics.excessExposure.toLocaleString('en-IN')} (${metrics.projectedUtilizationPct}% projected utilization).`;
      recommendation = 'Finance Manager or Director approval required to elevate credit limit or grant temporary line extension.';
    }
    // Case C: High Risk Classification (Risk Score > 50)
    else if (risk.riskCategory === 'HIGH' || risk.riskScore > 50) {
      decision = 'APPROVAL_REQUIRED';
      reason = `Customer is classified as HIGH RISK (Risk Score: ${risk.riskScore}/100) due to elevated overdue or unfavorable payment track record.`;
      recommendation = 'Mandate Finance Manager risk review. Require partial advance payment or collateral before fulfillment.';
    }
    // Case D: Approaching Limit (Projected utilization >= 85%)
    else if (metrics.projectedUtilizationPct >= 85) {
      decision = 'WARNING';
      reason = `Projected credit utilization reaches ${metrics.projectedUtilizationPct}% (Critical monitoring boundary ≥85%). Exposure: ₹${metrics.projectedExposure.toLocaleString('en-IN')} of ₹${approvedLimit.toLocaleString('en-IN')}.`;
      recommendation = 'Eligible for dispatch under heightened surveillance. Advise sales to notify customer of impending limit exhaustion.';
    }
    // Case E: Approaching Limit (Projected utilization >= 70%)
    else if (metrics.projectedUtilizationPct >= 70) {
      decision = 'WARNING';
      reason = `Projected credit utilization reaches ${metrics.projectedUtilizationPct}% (Warning boundary ≥70%). Customer has ₹${metrics.availableCredit.toLocaleString('en-IN')} available.`;
      recommendation = 'Eligible for dispatch. Routine monitoring recommended.';
    }
    // Case F: Normal exposure, low/medium risk
    else {
      decision = 'ELIGIBLE';
      reason = `Projected exposure (₹${metrics.projectedExposure.toLocaleString('en-IN')}) is safely within approved credit limit (₹${approvedLimit.toLocaleString('en-IN')}) at ${metrics.projectedUtilizationPct}% utilization. Risk Score: ${risk.riskScore}/100 (${risk.riskCategory}).`;
      recommendation = 'Auto-approved for credit dispatch. Standard commercial credit terms apply.';
    }

    return {
      decision,
      reason,
      recommendation,
      customerId,
      customerName: customer.companyName,
      approvedCreditLimit: approvedLimit,
      existingOutstanding: currentOutstanding,
      newOrderAmount: orderAmount,
      projectedExposure: metrics.projectedExposure,
      excessExposure: metrics.excessExposure,
      availableCredit: metrics.availableCredit,
      projectedUtilization: metrics.projectedUtilizationPct,
      currentUtilization: metrics.creditUtilizationPct,
      riskScore: risk.riskScore,
      riskCategory: risk.riskCategory,
      paymentBehavior: behavior.paymentBehavior,
      isTemporary,
      evaluatedAt: now.toISOString(),
    };
  }

  /**
   * Pure simulation function without database modifications (useful for interactive what-if calculators)
   */
  static simulateExposureScenario({ approvedCreditLimit = 100000, existingOutstanding = 60000, newOrderAmount = 50000, riskScore = 20 }) {
    const limit = Number(approvedCreditLimit) || 0;
    const outstanding = Number(existingOutstanding) || 0;
    const order = Number(newOrderAmount) || 0;
    const score = Number(riskScore) || 0;

    const metrics = CreditExposureService.computeExposureMetrics({
      approvedLimit: limit,
      currentOutstanding: outstanding,
      newOrderAmount: order,
    });

    let decision = 'ELIGIBLE';
    let explanation = '';

    if (metrics.isExceeded) {
      decision = 'APPROVAL_REQUIRED';
      explanation = `Credit limit exceeded by ₹${metrics.excessExposure.toLocaleString('en-IN')}. Approval is required according to commercial credit policy.`;
    } else if (score > 50) {
      decision = 'APPROVAL_REQUIRED';
      explanation = `Customer risk score is ${score}/100 (HIGH). Managerial review required.`;
    } else if (metrics.projectedUtilizationPct >= 85) {
      decision = 'WARNING';
      explanation = `High exposure warning: Projected utilization is ${metrics.projectedUtilizationPct}%.`;
    } else {
      decision = 'ELIGIBLE';
      explanation = `Exposure of ₹${metrics.projectedExposure.toLocaleString('en-IN')} is within approved credit limit.`;
    }

    return {
      approvedCreditLimit: limit,
      existingOutstanding: outstanding,
      newOrderAmount: order,
      projectedExposure: metrics.projectedExposure,
      excessExposure: metrics.excessExposure,
      availableCredit: metrics.availableCredit,
      projectedUtilization: metrics.projectedUtilizationPct,
      currentUtilization: metrics.creditUtilizationPct,
      riskScore: score,
      decision,
      explanation,
    };
  }
}
