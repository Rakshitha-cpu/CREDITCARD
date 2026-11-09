import prisma from '../config/db.js';
import { logAuditEvent } from '../services/auditService.js';
import { CreditExposureService } from '../services/creditExposureService.js';
import { RiskScoringService } from '../services/riskScoringService.js';

export const getCreditProfiles = async (req, res, next) => {
  try {
    const profiles = await prisma.creditProfile.findMany({
      include: {
        customer: {
          select: { id: true, customerCode: true, companyName: true, businessCategory: true, status: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = profiles.map(p => ({
      id: p.id,
      customerId: p.customerId,
      customerCode: p.customer.customerCode,
      companyName: p.customer.companyName,
      category: p.customer.businessCategory,
      status: p.customer.status === 'ACTIVE' ? 'Active' : 'Inactive',
      approvedCreditLimit: Number(p.approvedCreditLimit),
      maxPermissibleExposure: Number(p.maxPermissibleExposure),
      paymentTerms: p.paymentTerms,
      riskScore: p.riskScore,
      riskCategory: p.riskCategory === 'HIGH' ? 'High' : p.riskCategory === 'MEDIUM' ? 'Medium' : 'Low',
      currentExposure: Number(p.currentExposure),
      availableCredit: Number(p.availableCredit),
      isBlocked: p.isBlocked,
      paymentBehavior: p.paymentBehavior,
      lastAssessmentDate: p.lastAssessmentDate,
      updatedAt: p.updatedAt,
    }));

    return res.json({ success: true, count: formatted.length, profiles: formatted });
  } catch (error) {
    next(error);
  }
};

export const getCustomerProfile = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    const profile = await prisma.creditProfile.findFirst({
      where: {
        OR: [{ customerId }, { customer: { customerCode: customerId } }],
      },
      include: {
        customer: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Credit profile not found.' });
    }

    const exposure = await CreditExposureService.calculateExposure(profile.customerId);

    return res.json({
      success: true,
      profile: {
        ...profile,
        exposure,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCreditProfile = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { creditLimit, paymentTerms, reason } = req.body;

    if (!creditLimit || !reason) {
      return res.status(400).json({ success: false, message: 'Credit limit and justification reason are required.' });
    }

    const profile = await prisma.creditProfile.findFirst({
      where: {
        OR: [{ customerId }, { customer: { customerCode: customerId } }],
      },
      include: { customer: true },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Credit profile not found.' });
    }

    const prevLimit = Number(profile.approvedCreditLimit);
    const newLimit = Number(creditLimit);
    const maxExp = newLimit * 1.1;

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.creditProfile.update({
        where: { id: profile.id },
        data: {
          approvedCreditLimit: newLimit,
          maxPermissibleExposure: maxExp,
          paymentTerms: paymentTerms || profile.paymentTerms,
          availableCredit: Math.max(0, newLimit - Number(profile.currentExposure)),
        },
      });

      if (prevLimit !== newLimit) {
        await tx.creditLimitHistory.create({
          data: {
            customerId: profile.customerId,
            previousLimit: prevLimit,
            newLimit,
            reason,
            updatedBy: req.user.name,
          },
        });
      }

      return up;
    });

    // Recalculate exposure and risk assessment on credit limit change
    await CreditExposureService.calculateExposure(profile.customerId);
    await RiskScoringService.evaluateCustomerRisk(profile.customerId);

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'UPDATE_CREDIT_PROFILE',
      entityType: 'CreditProfile',
      entityId: profile.customerId,
      previousValue: `₹${prevLimit.toLocaleString('en-IN')}`,
      newValue: `₹${newLimit.toLocaleString('en-IN')}`,
      remarks: reason,
    });

    return res.json({
      success: true,
      message: 'Credit profile updated successfully.',
      profile: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const getCreditLimitHistory = async (req, res, next) => {
  try {
    const { customerId } = req.params;

    const history = await prisma.creditLimitHistory.findMany({
      where: {
        OR: [{ customerId }, { customer: { customerCode: customerId } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, count: history.length, history });
  } catch (error) {
    next(error);
  }
};
