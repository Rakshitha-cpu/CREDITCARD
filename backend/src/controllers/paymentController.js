import prisma from '../config/db.js';
import { logAuditEvent } from '../services/auditService.js';
import { CreditExposureService } from '../services/creditExposureService.js';
import { RiskScoringService } from '../services/riskScoringService.js';

export const getPayments = async (req, res, next) => {
  try {
    const { search, customerId } = req.query;

    const where = {};
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { paymentNumber: { contains: search, mode: 'insensitive' } },
        { transactionReference: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        customer: {
          select: { id: true, customerCode: true, companyName: true },
        },
        allocations: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const formatted = payments.map(p => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      customerId: p.customerId,
      customerName: p.customer.companyName,
      customerCode: p.customer.customerCode,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      transactionReference: p.transactionReference,
      amount: Number(p.paymentAmount),
      allocatedAmount: Number(p.allocatedAmount),
      unallocatedAmount: Number(p.unallocatedAmount),
      status: p.status === 'ALLOCATED' ? 'Allocated' : p.status === 'PARTIAL' ? 'Partial' : 'Unallocated',
      allocationsCount: p.allocations.length,
      createdAt: p.createdAt,
    }));

    const stats = {
      total: formatted.length,
      totalAmount: formatted.reduce((s, p) => s + p.amount, 0),
      allocated: formatted.filter(p => p.status === 'Allocated').length,
      unallocated: formatted.filter(p => p.status === 'Unallocated').length,
    };

    return res.json({ success: true, stats, payments: formatted });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        allocations: {
          include: {
            invoice: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }

    return res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req, res, next) => {
  try {
    const {
      customerId,
      paymentAmount,
      paymentDate,
      paymentMethod = 'NEFT',
      transactionReference,
      invoiceAllocations = [], // [{ invoiceId, amount }]
    } = req.body;

    const amountNum = Number(paymentAmount);
    if (!customerId || !amountNum || amountNum <= 0 || !paymentDate || !transactionReference) {
      return res.status(400).json({
        success: false,
        message: 'Customer, positive payment amount, date and transaction reference are required.',
      });
    }

    // Check duplicate reference
    const existingRef = await prisma.payment.findUnique({
      where: { transactionReference },
    });
    if (existingRef) {
      return res.status(409).json({
        success: false,
        message: `Transaction reference '${transactionReference}' already exists in the system.`,
      });
    }

    const customer = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { customerCode: customerId }] },
    });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Validate allocations total against payment amount
    let totalAllocated = 0;
    if (invoiceAllocations.length > 0) {
      totalAllocated = invoiceAllocations.reduce((sum, item) => sum + Number(item.amount), 0);
      if (totalAllocated > amountNum) {
        return res.status(400).json({
          success: false,
          message: `Total invoice allocations (₹${totalAllocated}) cannot exceed payment amount (₹${amountNum}).`,
        });
      }
    }

    const unallocated = amountNum - totalAllocated;
    let paymentStatus = 'UNALLOCATED';
    if (totalAllocated >= amountNum) paymentStatus = 'ALLOCATED';
    else if (totalAllocated > 0) paymentStatus = 'PARTIAL';

    // Generate guaranteed unique payment number
    let paymentNumber;
    let seq = (await prisma.payment.count()) + 1;
    while (!paymentNumber) {
      const candidate = `PAY-2026-${String(seq).padStart(3, '0')}`;
      const exists = await prisma.payment.findUnique({ where: { paymentNumber: candidate } });
      if (!exists) {
        paymentNumber = candidate;
      } else {
        seq += 1;
      }
    }

    // Execute atomic transaction for payment and invoice balancing
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          customerId: customer.id,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          transactionReference,
          paymentAmount: amountNum,
          allocatedAmount: totalAllocated,
          unallocatedAmount: unallocated,
          status: paymentStatus,
        },
      });

      // Process allocations
      for (const item of invoiceAllocations) {
        const itemAmount = Number(item.amount);
        if (itemAmount <= 0) continue;

        const inv = await tx.invoice.findUnique({ where: { id: item.invoiceId } });
        if (!inv) {
          const err = new Error(`Invoice with ID ${item.invoiceId} not found.`);
          err.statusCode = 404;
          throw err;
        }

        const currentOut = Number(inv.outstandingAmount);
        if (itemAmount > currentOut) {
          const err = new Error(`Allocation of ₹${itemAmount} exceeds outstanding balance of ₹${currentOut} on invoice ${inv.invoiceNumber}.`);
          err.statusCode = 400;
          throw err;
        }

        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: inv.id,
            amount: itemAmount,
            allocatedBy: req.user.name,
          },
        });

        const newPaid = Number(inv.paidAmount) + itemAmount;
        const newOutstanding = currentOut - itemAmount;
        const newStatus = newOutstanding <= 0 ? 'PAID' : inv.status;

        await tx.invoice.update({
          where: { id: inv.id },
          data: {
            paidAmount: newPaid,
            outstandingAmount: newOutstanding,
            status: newStatus,
          },
        });
      }

      return payment;
    });

    // Recalculate credit exposure, available credit and utilization after successful commit
    await CreditExposureService.calculateExposure(customer.id);
    // Trigger automated risk reassessment based on updated balance
    await RiskScoringService.evaluateCustomerRisk(customer.id);

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'RECORD_PAYMENT',
      entityType: 'Payment',
      entityId: result.id,
      newValue: JSON.stringify({
        number: paymentNumber,
        amount: amountNum,
        allocated: totalAllocated,
        ref: transactionReference,
      }),
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded and allocated successfully.',
      payment: result,
    });
  } catch (error) {
    next(error);
  }
};
