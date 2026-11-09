import prisma from '../config/db.js';
import { RiskScoringService } from '../services/riskScoringService.js';
import { logAuditEvent } from '../services/auditService.js';

export const getRiskAssessment = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const assessment = await RiskScoringService.evaluateCustomerRisk(customerId);

    return res.json({ success: true, assessment });
  } catch (error) {
    next(error);
  }
};

export const getPortfolioRisk = async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        creditProfile: true,
        invoices: { where: { status: { in: ['UNPAID', 'OVERDUE'] } } },
      },
    });

    const now = new Date();

    const evaluated = customers.map(c => {
      const unpaidInvoices = c.invoices.filter(i => i.status === 'UNPAID' || i.status === 'OVERDUE');
      const outstanding = unpaidInvoices.reduce((s, i) => s + Number(i.outstandingAmount), 0);
      const overdue = unpaidInvoices
        .filter(i => new Date(i.dueDate) < now)
        .reduce((s, i) => s + Number(i.outstandingAmount), 0);

      const limit = c.creditProfile ? Number(c.creditProfile.approvedCreditLimit) : 0;
      const util = limit > 0 ? Number(((outstanding / limit) * 100).toFixed(1)) : (outstanding > 0 ? 100 : 0);

      return {
        id: c.id,
        customerCode: c.customerCode,
        companyName: c.companyName,
        businessCategory: c.businessCategory,
        riskScore: c.creditProfile?.riskScore || 0,
        riskCategory: c.creditProfile?.riskCategory === 'HIGH' ? 'High' : c.creditProfile?.riskCategory === 'MEDIUM' ? 'Medium' : 'Low',
        creditLimit: limit,
        outstanding,
        overdue,
        creditUtilization: util,
        paymentBehavior: c.creditProfile?.paymentBehavior || 'Good',
        lastAssessment: c.creditProfile?.lastAssessmentDate || c.updatedAt,
      };
    });

    const stats = {
      low: evaluated.filter(c => c.riskCategory === 'Low').length,
      medium: evaluated.filter(c => c.riskCategory === 'Medium').length,
      high: evaluated.filter(c => c.riskCategory === 'High').length,
      avgScore: evaluated.length > 0
        ? Math.round(evaluated.reduce((s, c) => s + c.riskScore, 0) / evaluated.length)
        : 0,
    };

    return res.json({ success: true, stats, customers: evaluated });
  } catch (error) {
    next(error);
  }
};

export const runBatchReassessment = async (req, res, next) => {
  try {
    const results = await RiskScoringService.reassessAllOverdue();

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BATCH_RISK_REASSESSMENT',
      entityType: 'RiskAssessment',
      entityId: 'ALL',
      remarks: `Evaluated ${results.evaluated} active customer portfolios`,
    });

    return res.json({
      success: true,
      message: 'Portfolio batch risk reassessment completed successfully.',
      results,
    });
  } catch (error) {
    next(error);
  }
};
