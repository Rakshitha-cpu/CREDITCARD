import prisma from '../config/db.js';
import { logAuditEvent } from '../services/auditService.js';
import { CreditExposureService } from '../services/creditExposureService.js';
import { RiskScoringService } from '../services/riskScoringService.js';

export const getPendingApprovals = async (req, res, next) => {
  try {
    const pending = await prisma.creditRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        customer: {
          include: {
            creditProfile: true,
            invoices: { where: { status: { in: ['UNPAID', 'OVERDUE'] } } },
          },
        },
        submittedBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { requestDate: 'asc' },
    });

    const formatted = pending.map(r => ({
      id: r.id,
      requestNumber: r.requestNumber,
      customerId: r.customerId,
      customerName: r.customer.companyName,
      customerCode: r.customer.customerCode,
      currentLimit: Number(r.currentLimit),
      requestedLimit: Number(r.requestedLimit),
      additionalAmount: Number(r.additionalAmount),
      currentExposure: Number(r.currentExposure),
      projectedExposure: Number(r.projectedExposure),
      riskScore: r.customer.creditProfile?.riskScore || 0,
      riskCategory: r.customer.creditProfile?.riskCategory || 'LOW',
      businessJustification: r.businessJustification,
      validityPeriod: r.validityPeriod,
      requestDate: r.requestDate,
      submittedBy: r.submittedBy?.name || 'Sales Representative',
      submittedById: r.submittedById,
      status: r.status,
    }));

    return res.json({ success: true, count: formatted.length, approvals: formatted });
  } catch (error) {
    next(error);
  }
};

export const approveCreditRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ success: false, message: 'Approval comment is mandatory.' });
    }

    const request = await prisma.creditRequest.findUnique({
      where: { id },
      include: { customer: { include: { creditProfile: true } } },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Credit request not found.' });
    }

    // Validation rules
    // 1. Prevent self-approval
    if (request.submittedById === req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Self-approval is strictly forbidden. A different authorized manager must approve.',
      });
    }

    // 2. Prevent re-approval or approving non-pending
    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status '${request.status}'. Only PENDING requests can be approved.`,
      });
    }

    // 3. Prevent expired requests
    if (new Date(request.validityPeriod) < new Date()) {
      await prisma.creditRequest.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({
        success: false,
        message: 'Cannot approve an EXPIRED request. The validity date has passed.',
      });
    }

    const previousLimit = Number(request.currentLimit);
    const newApprovedLimit = Number(request.requestedLimit);

    // Database transaction: Update Request status, create ApprovalRecord, update CreditProfile, record History
    const result = await prisma.$transaction(async (tx) => {
      const updatedReq = await tx.creditRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvalComment: comment,
        },
      });

      await tx.approvalRecord.create({
        data: {
          creditRequestId: id,
          approvedById: req.user.id,
          action: 'APPROVED',
          comment,
        },
      });

      // Update customer approved credit limit
      if (request.customer.creditProfile) {
        await tx.creditProfile.update({
          where: { id: request.customer.creditProfile.id },
          data: {
            approvedCreditLimit: newApprovedLimit,
            maxPermissibleExposure: newApprovedLimit * 1.1,
            availableCredit: Math.max(0, newApprovedLimit - Number(request.currentExposure)),
          },
        });
      }

      // Record in CreditLimitHistory
      await tx.creditLimitHistory.create({
        data: {
          customerId: request.customerId,
          previousLimit,
          newLimit: newApprovedLimit,
          reason: `Approved via Credit Request ${request.requestNumber}: ${comment}`,
          updatedBy: req.user.name,
        },
      });

      return updatedReq;
    });

    // Re-verify exposure and trigger risk assessment after limit increase
    await CreditExposureService.calculateExposure(request.customerId);
    await RiskScoringService.evaluateCustomerRisk(request.customerId);

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'APPROVE_CREDIT_REQUEST',
      entityType: 'CreditRequest',
      entityId: id,
      previousValue: `₹${previousLimit.toLocaleString('en-IN')}`,
      newValue: `₹${newApprovedLimit.toLocaleString('en-IN')}`,
      remarks: comment,
    });

    return res.json({
      success: true,
      message: `Credit request ${request.requestNumber} approved successfully. Credit limit updated.`,
      creditRequest: result,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectCreditRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is mandatory.' });
    }

    const request = await prisma.creditRequest.findUnique({ where: { id } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Credit request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with status '${request.status}'.`,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.creditRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
        },
      });

      await tx.approvalRecord.create({
        data: {
          creditRequestId: id,
          approvedById: req.user.id,
          action: 'REJECTED',
          comment: reason,
        },
      });

      return up;
    });

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'REJECT_CREDIT_REQUEST',
      entityType: 'CreditRequest',
      entityId: id,
      previousValue: 'PENDING',
      newValue: 'REJECTED',
      remarks: reason,
    });

    return res.json({
      success: true,
      message: `Credit request ${request.requestNumber} rejected.`,
      creditRequest: updated,
    });
  } catch (error) {
    next(error);
  }
};
