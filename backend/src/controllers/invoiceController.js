import prisma from '../config/db.js';
import { logAuditEvent } from '../services/auditService.js';
import { CreditExposureService } from '../services/creditExposureService.js';
import { RiskScoringService } from '../services/riskScoringService.js';

export const getInvoices = async (req, res, next) => {
  try {
    const { search, status, customerId } = req.query;

    const where = {};
    if (status && status !== 'All') {
      where.status = status.toUpperCase();
    }
    if (customerId) {
      where.customerId = customerId;
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: { id: true, customerCode: true, companyName: true },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const now = new Date();

    const formatted = invoices.map(inv => {
      const isOverdue = inv.status !== 'PAID' && new Date(inv.dueDate) < now;
      let displayStatus = 'Unpaid';
      if (inv.status === 'PAID') displayStatus = 'Paid';
      else if (isOverdue || inv.status === 'OVERDUE') displayStatus = 'Overdue';

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customer.companyName,
        customerCode: inv.customer.customerCode,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        amount: Number(inv.invoiceAmount),
        paidAmount: Number(inv.paidAmount),
        outstanding: Number(inv.outstandingAmount),
        status: displayStatus,
        createdAt: inv.createdAt,
      };
    });

    const stats = {
      total: formatted.length,
      paid: formatted.filter(i => i.status === 'Paid').length,
      unpaid: formatted.filter(i => i.status === 'Unpaid').length,
      overdue: formatted.filter(i => i.status === 'Overdue').length,
      totalAmount: formatted.reduce((s, i) => s + i.amount, 0),
      totalOutstanding: formatted.reduce((s, i) => s + i.outstanding, 0),
    };

    return res.json({ success: true, stats, invoices: formatted });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [{ id }, { invoiceNumber: id }],
      },
      include: {
        customer: true,
        allocations: {
          include: { payment: true },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    return res.json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const { customerId, invoiceDate, dueDate, amount, invoiceNumber } = req.body;

    if (!customerId || !invoiceDate || !dueDate || amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ success: false, message: 'Customer, dates and amount are required.' });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'Invoice amount must be positive.' });
    }

    const customer = await prisma.customer.findFirst({
      where: { OR: [{ id: customerId }, { customerCode: customerId }] },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (customer.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Cannot create invoice for an INACTIVE customer.' });
    }

    const invDateObj = new Date(invoiceDate);
    const dueDateObj = new Date(dueDate);

    if (isNaN(invDateObj.getTime()) || isNaN(dueDateObj.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid invoice or due date format.' });
    }

    if (dueDateObj < invDateObj) {
      return res.status(400).json({ success: false, message: 'Due date cannot be earlier than invoice date.' });
    }

    // Check duplicate invoice number if provided
    let finalInvNum = invoiceNumber;
    if (finalInvNum) {
      const existingInv = await prisma.invoice.findUnique({ where: { invoiceNumber: finalInvNum } });
      if (existingInv) {
        return res.status(409).json({ success: false, message: `Invoice number '${finalInvNum}' already exists.` });
      }
    } else {
      let seq = (await prisma.invoice.count()) + 1;
      while (!finalInvNum) {
        const candidate = `INV-2026-${String(seq).padStart(3, '0')}`;
        const exists = await prisma.invoice.findUnique({ where: { invoiceNumber: candidate } });
        if (!exists) {
          finalInvNum = candidate;
        } else {
          seq += 1;
        }
      }
    }

    const now = new Date();
    const status = dueDateObj < now ? 'OVERDUE' : 'UNPAID';

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: finalInvNum,
          customerId: customer.id,
          invoiceDate: invDateObj,
          dueDate: dueDateObj,
          invoiceAmount: amountNum,
          paidAmount: 0,
          outstandingAmount: amountNum,
          status,
        },
      });

      return created;
    });

    // Recalculate exposure and trigger risk assessment after creating invoice
    await CreditExposureService.calculateExposure(customer.id);
    await RiskScoringService.evaluateCustomerRisk(customer.id);

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CREATE_INVOICE',
      entityType: 'Invoice',
      entityId: invoice.id,
      newValue: JSON.stringify({ number: finalInvNum, amount: amountNum, customer: customer.companyName }),
    });

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully.',
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, dueDate } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { allocations: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // Reject editing an invoice after partial payment
    if (Number(invoice.paidAmount) > 0 || invoice.allocations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit invoice with existing payment allocations. Only unpaid invoices with zero allocations can be modified.',
      });
    }

    const newAmount = amount !== undefined ? Number(amount) : Number(invoice.invoiceAmount);
    if (newAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invoice amount must be positive.' });
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        invoiceAmount: newAmount,
        outstandingAmount: newAmount,
        dueDate: dueDate ? new Date(dueDate) : invoice.dueDate,
      },
    });

    await CreditExposureService.calculateExposure(invoice.customerId);

    return res.json({ success: true, message: 'Invoice updated successfully.', invoice: updated });
  } catch (error) {
    next(error);
  }
};

export const cancelInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { allocations: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // Reject cancelling an invoice with allocated payments
    if (Number(invoice.paidAmount) > 0 || invoice.allocations.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel invoice with allocated payments. Reallocate or refund associated payments first.',
      });
    }

    const cancelled = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        outstandingAmount: 0,
      },
    });

    await CreditExposureService.calculateExposure(invoice.customerId);

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CANCEL_INVOICE',
      entityType: 'Invoice',
      entityId: id,
      previousValue: invoice.status,
      newValue: 'CANCELLED',
    });

    return res.json({ success: true, message: 'Invoice cancelled successfully.', invoice: cancelled });
  } catch (error) {
    next(error);
  }
};
