import prisma from '../config/db.js';
import { PaymentBehaviorService } from './paymentBehaviorService.js';

export class RiskScoringService {
  /**
   * Map numerical risk score (0-100) to risk category
   * @param {number} score
   */
  static getRiskCategoryFromScore(score) {
    const s = Number(score) || 0;
    if (s > 50) return 'HIGH';
    if (s > 20) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Run comprehensive credit risk assessment on a customer
   * @param {string} customerId
   * @param {boolean} forceRecord - whether to force creating a new historical record
   */
  static async evaluateCustomerRisk(customerId, forceRecord = false) {
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

    const approvedLimit = customer.creditProfile
      ? Number(customer.creditProfile.approvedCreditLimit)
      : 0;

    const currentExposure = customer.invoices.reduce((s, i) => {
      const out = Number(i.outstandingAmount ?? (Number(i.invoiceAmount) - Number(i.paidAmount)));
      return s + Math.max(0, out);
    }, 0);

    // ==========================================
    // Factor A: Credit Utilization (Max 30 pts)
    // ==========================================
    let utilPct = 0;
    if (approvedLimit > 0) {
      utilPct = Number(((currentExposure / approvedLimit) * 100).toFixed(1));
    } else if (currentExposure > 0) {
      utilPct = 100.0;
    }

    let utilizationPoints = 0;
    let utilExplanation = '';
    if (utilPct > 90) {
      utilizationPoints = 30;
      utilExplanation = `High credit utilization at ${utilPct}% (>90%)`;
    } else if (utilPct >= 75) {
      utilizationPoints = 20;
      utilExplanation = `Substantial credit utilization at ${utilPct}% (75-90%)`;
    } else if (utilPct >= 50) {
      utilizationPoints = 10;
      utilExplanation = `Moderate credit utilization at ${utilPct}% (50-75%)`;
    } else {
      utilizationPoints = 0;
      utilExplanation = `Conservative credit utilization at ${utilPct}% (<50%)`;
    }

    // ==========================================
    // Factor B: Overdue Amount (Max 30 pts)
    // Thresholds: low (<=10% limit or <=100k), moderate (10-30% or <=500k), high (>30% or >500k)
    // ==========================================
    const now = new Date();
    const overdueInvoices = customer.invoices.filter(i => new Date(i.dueDate) < now);
    const overdueAmount = overdueInvoices.reduce((s, i) => {
      const out = Number(i.outstandingAmount ?? (Number(i.invoiceAmount) - Number(i.paidAmount)));
      return s + Math.max(0, out);
    }, 0);

    let overduePoints = 0;
    let overdueExplanation = '';
    if (overdueAmount === 0) {
      overduePoints = 0;
      overdueExplanation = 'Clean overdue record with ₹0 past due';
    } else {
      const overdueRatio = approvedLimit > 0 ? (overdueAmount / approvedLimit) : 1;
      if (overdueRatio >= 0.3 || overdueAmount > 500000) {
        overduePoints = 30;
        overdueExplanation = `Severe overdue exposure (₹${overdueAmount.toLocaleString('en-IN')}, ${(overdueRatio * 100).toFixed(1)}% of limit)`;
      } else if (overdueRatio >= 0.1 || overdueAmount > 100000) {
        overduePoints = 20;
        overdueExplanation = `Moderate overdue exposure (₹${overdueAmount.toLocaleString('en-IN')}, ${(overdueRatio * 100).toFixed(1)}% of limit)`;
      } else {
        overduePoints = 10;
        overdueExplanation = `Low overdue exposure (₹${overdueAmount.toLocaleString('en-IN')})`;
      }
    }

    // ==========================================
    // Factor C: Payment History / Behavior (Max 20 pts)
    // Evaluates actual historical payment timeliness via PaymentBehaviorService
    // ==========================================
    const behaviorData = await PaymentBehaviorService.analyzeCustomerPaymentBehavior(customerId);
    const behavior = (behaviorData.paymentBehavior || 'GOOD').toUpperCase();

    let paymentHistoryPoints = 0;
    let behaviorExplanation = '';
    if (behavior === 'POOR') {
      paymentHistoryPoints = 20;
      behaviorExplanation = `Poor payment track record with ${behaviorData.latePaymentPct}% delayed payments (avg delay: ${behaviorData.avgPaymentDelayDays} days)`;
    } else if (behavior === 'MODERATE') {
      paymentHistoryPoints = 10;
      behaviorExplanation = `Moderate payment track record with occasional delays (${behaviorData.latePaymentPct}% late)`;
    } else if (behavior === 'GOOD') {
      paymentHistoryPoints = 5;
      behaviorExplanation = `Good payment track record with ${100 - behaviorData.latePaymentPct}% on-time settlements`;
    } else {
      paymentHistoryPoints = 0;
      behaviorExplanation = 'Excellent payment track record with pristine on-time settlements';
    }

    // ==========================================
    // Factor D: Outstanding Aging (Max 20 pts)
    // Evaluates the chronological age of outstanding receivables
    // ==========================================
    let maxDaysOverdue = 0;
    overdueInvoices.forEach(inv => {
      const diff = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 86400));
      if (diff > maxDaysOverdue) maxDaysOverdue = diff;
    });

    let agingPoints = 0;
    let agingExplanation = '';
    if (maxDaysOverdue > 60) {
      agingPoints = 20;
      agingExplanation = `Critical aging: Receivables aged beyond 60 days (${maxDaysOverdue} days past due)`;
    } else if (maxDaysOverdue > 30) {
      agingPoints = 10;
      agingExplanation = `Aging receivables: 31–60 days bracket (${maxDaysOverdue} days past due)`;
    } else if (maxDaysOverdue > 0) {
      agingPoints = 5;
      agingExplanation = `Recent overdue: 1–30 days bracket (${maxDaysOverdue} days past due)`;
    } else {
      agingPoints = 0;
      agingExplanation = 'No overdue aging: All invoices are within standard commercial credit terms';
    }

    // ==========================================
    // Total Risk Score (0–100 Capped) & Category
    // ==========================================
    const totalRiskScore = Math.min(
      100,
      utilizationPoints + overduePoints + paymentHistoryPoints + agingPoints
    );

    let riskCategory = 'LOW';
    if (totalRiskScore > 50) riskCategory = 'HIGH';
    else if (totalRiskScore > 20) riskCategory = 'MEDIUM';

    const narrativeExplanation = [
      `Overall Risk Score: ${totalRiskScore}/100 (${riskCategory} Risk).`,
      utilExplanation,
      overdueExplanation,
      behaviorExplanation,
      agingExplanation,
    ].join(' | ');

    const calculationDetails = {
      utilizationPoints,
      overduePoints,
      paymentHistoryPoints,
      agingPoints,
      utilizationPct: utilPct,
      overdueAmount,
      paymentBehavior: behavior,
      maxDaysOverdue,
      narrativeExplanation,
    };

    // Check if score changed compared to last assessment to prevent redundant duplicate database records
    const latestAssessment = await prisma.riskAssessment.findFirst({
      where: { customerId },
      orderBy: { assessedAt: 'desc' },
    });

    const isScoreChanged = !latestAssessment ||
      latestAssessment.riskScore !== totalRiskScore ||
      latestAssessment.riskCategory !== riskCategory ||
      latestAssessment.utilizationScore !== utilizationPoints ||
      latestAssessment.overdueScore !== overduePoints ||
      latestAssessment.paymentHistoryScore !== paymentHistoryPoints ||
      latestAssessment.agingScore !== agingPoints;

    let savedAssessmentId = latestAssessment?.id;

    if (isScoreChanged || forceRecord) {
      const created = await prisma.riskAssessment.create({
        data: {
          customerId,
          riskScore: totalRiskScore,
          riskCategory,
          utilizationScore: utilizationPoints,
          overdueScore: overduePoints,
          paymentHistoryScore: paymentHistoryPoints,
          agingScore: agingPoints,
          calculationDetails: JSON.stringify(calculationDetails),
        },
      });
      savedAssessmentId = created.id;
    }

    // Update customer credit profile in PostgreSQL
    if (customer.creditProfile) {
      await prisma.creditProfile.update({
        where: { id: customer.creditProfile.id },
        data: {
          riskScore: totalRiskScore,
          riskCategory,
          lastAssessmentDate: now,
          paymentBehavior: behavior,
        },
      });
    }

    return {
      customerId,
      customerName: customer.companyName,
      riskScore: totalRiskScore,
      riskCategory,
      assessmentId: savedAssessmentId,
      scores: {
        utilizationScore: utilizationPoints,
        overdueScore: overduePoints,
        paymentHistoryScore: paymentHistoryPoints,
        agingScore: agingPoints,
      },
      calculationDetails,
      assessedAt: now.toISOString(),
    };
  }

  /**
   * Batch scheduled risk reassessment for all customers with overdue invoices or modified profiles
   */
  static async reassessAllOverdue() {
    const customers = await prisma.customer.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, companyName: true },
    });

    const results = [];
    for (const cust of customers) {
      try {
        const res = await this.evaluateCustomerRisk(cust.id);
        results.push({ customerId: cust.id, success: true, score: res.riskScore, category: res.riskCategory });
      } catch (err) {
        results.push({ customerId: cust.id, success: false, error: err.message });
      }
    }

    return {
      totalCustomers: customers.length,
      evaluated: results.length,
      results,
    };
  }
}
