import prisma from '../config/db.js';
import { CreditExposureService } from '../services/creditExposureService.js';
import { CreditDecisionService } from '../services/creditDecisionService.js';
import { logAuditEvent } from '../services/auditService.js';

export const getCreditRequests = async (req, res, next) => {
  try {
    const { status, customerId } = req.query;

    const where = {};
    if (status && status !== 'All') {
      where.status = status.toUpperCase();
    }
    if (customerId) {
      where.customerId = customerId;
    }

    const requests = await prisma.creditRequest.findMany({
      where,
      include: {
        customer: {
          select: { id: true, customerCode: true, companyName: true, status: true },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
        approvalRecords: {
          include: { approvedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { requestDate: 'desc' },
    });

    const formatted = requests.map(r => ({
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
      businessJustification: r.businessJustification,
      validityPeriod: r.validityPeriod,
      requestDate: r.requestDate,
      status: r.status === 'APPROVED' ? 'Approved' : r.status === 'REJECTED' ? 'Rejected' : r.status === 'UNDER_REVIEW' ? 'Under Review' : 'Pending',
      submittedBy: r.submittedBy?.name || 'Sales Representative',
      rejectionReason: r.rejectionReason,
      approvalComment: r.approvalComment,
      approvalHistory: r.approvalRecords,
      createdAt: r.createdAt,
    }));

    const stats = {
      total: formatted.length,
      pending: formatted.filter(r => r.status === 'Pending').length,
      approved: formatted.filter(r => r.status === 'Approved').length,
      rejected: formatted.filter(r => r.status === 'Rejected').length,
    };

    return res.json({ success: true, stats, requests: formatted, creditRequests: formatted });
  } catch (error) {
    next(error);
  }
};

export const getCreditRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.creditRequest.findFirst({
      where: {
        OR: [{ id }, { requestNumber: id }],
      },
      include: {
        customer: {
          include: { creditProfile: true },
        },
        submittedBy: { select: { id: true, name: true, email: true } },
        approvalRecords: {
          include: { approvedBy: { select: { id: true, name: true } } },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Credit request not found.' });
    }

    return res.json({ success: true, request });
  } catch (error) {
    next(error);
  }
};

export const createCreditRequest = async (req, res, next) => {
  try {
    const {
      customerId,
      additionalAmount,
      businessJustification,
      validityPeriod,
    } = req.body;

    const addNum = Number(additionalAmount);
    if (!customerId || !addNum || addNum <= 0 || !businessJustification || !validityPeriod) {
      return res.status(400).json({
        success: false,
        message: 'Customer, positive additional amount, justification and validity date are mandatory.',
      });
    }

    const customer = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { customerCode: customerId }] },
      include: { creditProfile: true },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (customer.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create credit request for an INACTIVE customer.',
      });
    }

    // Run Credit Decision Evaluation
    const decisionEval = await CreditDecisionService.evaluateCreditDecision({
      customerId: customer.id,
      requestedAmount: addNum,
      validityPeriod,
    });

    // Generate guaranteed unique request number
    let requestNumber;
    let seq = (await prisma.creditRequest.count()) + 1;
    while (!requestNumber) {
      const candidate = `CR-2026-${String(seq).padStart(3, '0')}`;
      const exists = await prisma.creditRequest.findUnique({ where: { requestNumber: candidate } });
      if (!exists) {
        requestNumber = candidate;
      } else {
        seq += 1;
      }
    }

    const currentLimit = customer.creditProfile ? Number(customer.creditProfile.approvedCreditLimit) : 0;
    const requestedLimit = currentLimit + addNum;

    // Determine submitter: default to authenticated user, or allow explicit sales rep submission
    let submitterId = req.user.id;
    if (req.body.submittedById) {
      submitterId = req.body.submittedById;
    } else if (req.user.role === 'FINANCE_MANAGER') {
      // In demo mode, if manager submits, associate with sales rep by default so manager can test approval
      const salesUser = await prisma.user.findFirst({ where: { role: 'SALES' } });
      if (salesUser) submitterId = salesUser.id;
    }

    const creditRequest = await prisma.creditRequest.create({
      data: {
        requestNumber,
        customerId: customer.id,
        currentLimit,
        requestedLimit,
        additionalAmount: addNum,
        currentExposure: decisionEval.existingOutstanding,
        projectedExposure: decisionEval.projectedExposure,
        businessJustification,
        validityPeriod: new Date(validityPeriod),
        status: 'PENDING',
        submittedById: submitterId,
      },
    });

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'SUBMIT_CREDIT_REQUEST',
      entityType: 'CreditRequest',
      entityId: creditRequest.id,
      newValue: JSON.stringify({
        number: requestNumber,
        customer: customer.companyName,
        additional: addNum,
        projectedLimit: requestedLimit,
        decision: decisionEval.decision,
      }),
    });

    return res.status(201).json({
      success: true,
      message: 'Credit request submitted for finance manager review.',
      creditRequest,
      decisionEvaluation: decisionEval,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Interactive Exposure & Credit Decision Simulator
 */
export const simulateCreditDecision = async (req, res, next) => {
  try {
    const { customerId, approvedCreditLimit, existingOutstanding, newOrderAmount } = req.body;

    if (customerId) {
      const evaluation = await CreditDecisionService.evaluateCreditDecision({
        customerId,
        requestedAmount: newOrderAmount || 0,
      });
      return res.json({ success: true, simulation: evaluation });
    }

    // Pure mathematical simulation
    const simulation = CreditDecisionService.simulateExposureScenario({
      approvedCreditLimit,
      existingOutstanding,
      newOrderAmount,
    });

    return res.json({ success: true, simulation });
  } catch (error) {
    next(error);
  }
};
