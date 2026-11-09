import prisma from '../config/db.js';
import { CreditExposureService } from '../services/creditExposureService.js';
import { logAuditEvent } from '../services/auditService.js';

export const getCustomers = async (req, res, next) => {
  try {
    const { search, riskCategory, status } = req.query;

    const where = {};
    if (status && status !== 'All') {
      where.status = status.toUpperCase();
    }
    if (riskCategory && riskCategory !== 'All') {
      where.creditProfile = {
        riskCategory: riskCategory.toUpperCase(),
      };
    }
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { customerCode: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        creditProfile: true,
        invoices: {
          select: { id: true, outstandingAmount: true, status: true, dueDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const formatted = customers.map(c => {
      const unpaidInvoices = c.invoices.filter(i => i.status === 'UNPAID' || i.status === 'OVERDUE');
      const outstanding = unpaidInvoices.reduce((s, i) => s + Number(i.outstandingAmount), 0);
      const overdue = unpaidInvoices
        .filter(i => new Date(i.dueDate) < now)
        .reduce((s, i) => s + Number(i.outstandingAmount), 0);

      const limit = c.creditProfile ? Number(c.creditProfile.approvedCreditLimit) : 0;
      const util = limit > 0 ? Number(((outstanding / limit) * 100).toFixed(1)) : 0;
      const available = Math.max(0, limit - outstanding);

      return {
        id: c.id,
        customerCode: c.customerCode,
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        email: c.email,
        phone: c.phone,
        businessCategory: c.businessCategory,
        city: c.city,
        address: c.address,
        gstNo: c.gstNo,
        status: c.status === 'ACTIVE' ? 'Active' : 'Inactive',
        creditLimit: limit,
        outstanding,
        overdue,
        availableCredit: available,
        creditUtilization: util,
        paymentTerms: c.creditProfile?.paymentTerms || 'Net 30',
        paymentBehavior: c.creditProfile?.paymentBehavior || 'Good',
        riskScore: c.creditProfile?.riskScore || 0,
        riskCategory: c.creditProfile?.riskCategory === 'HIGH' ? 'High' : c.creditProfile?.riskCategory === 'MEDIUM' ? 'Medium' : 'Low',
        createdAt: c.createdAt,
      };
    });

    return res.json({ success: true, count: formatted.length, customers: formatted });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ id }, { customerCode: id }],
      },
      include: {
        creditProfile: true,
        creditLimitHist: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { invoiceDate: 'desc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
        creditRequests: { orderBy: { requestDate: 'desc' } },
        riskAssessments: { orderBy: { assessedAt: 'desc' }, take: 5 },
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const exposure = await CreditExposureService.calculateExposure(customer.id);

    return res.json({
      success: true,
      customer: {
        ...customer,
        exposure,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const {
      companyName,
      contactPerson,
      email,
      phone,
      businessCategory = 'Manufacturing',
      city = 'Mumbai',
      address,
      gstNo,
      creditLimit = 1000000,
      paymentTerms = 'Net 30',
    } = req.body;

    if (!companyName || !contactPerson || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Company name, contact person, email, and phone are mandatory.' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address format.' });
    }

    // Phone format validation
    const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
    }

    // Check duplicate customer email
    const existingEmail = await prisma.customer.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'A customer with this email address already exists.' });
    }

    // Check duplicate company name
    const existingCompany = await prisma.customer.findFirst({
      where: { companyName: { equals: companyName, mode: 'insensitive' } },
    });
    if (existingCompany) {
      return res.status(409).json({ success: false, message: 'A customer with this company name already exists.' });
    }

    let customerCode;
    let seq = (await prisma.customer.count()) + 1;
    while (!customerCode) {
      const candidate = `CUS${String(seq).padStart(3, '0')}`;
      const exists = await prisma.customer.findUnique({ where: { customerCode: candidate } });
      if (!exists) {
        customerCode = candidate;
      } else {
        seq += 1;
      }
    }

    const limitNum = Number(creditLimit);

    const customer = await prisma.$transaction(async (tx) => {
      const newCust = await tx.customer.create({
        data: {
          customerCode,
          companyName,
          contactPerson,
          email,
          phone,
          businessCategory,
          city,
          address,
          gstNo,
          status: 'ACTIVE',
        },
      });

      await tx.creditProfile.create({
        data: {
          customerId: newCust.id,
          approvedCreditLimit: limitNum,
          maxPermissibleExposure: limitNum * 1.1,
          paymentTerms,
          riskScore: 15,
          riskCategory: 'LOW',
          currentExposure: 0,
          availableCredit: limitNum,
          paymentBehavior: 'Good',
        },
      });

      return newCust;
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'CREATE_CUSTOMER',
      entityType: 'Customer',
      entityId: customer.id,
      newValue: JSON.stringify({ code: customerCode, name: companyName, limit: limitNum }),
    });

    return res.status(201).json({
      success: true,
      message: 'Customer and baseline credit profile created successfully.',
      customer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyName, contactPerson, email, phone, businessCategory, city, address, gstNo } = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        companyName,
        contactPerson,
        email,
        phone,
        businessCategory,
        city,
        address,
        gstNo,
      },
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: 'UPDATE_CUSTOMER',
      entityType: 'Customer',
      entityId: id,
      previousValue: JSON.stringify({ name: existing.companyName, email: existing.email }),
      newValue: JSON.stringify({ name: updated.companyName, email: updated.email }),
    });

    return res.json({ success: true, message: 'Customer updated successfully.', customer: updated });
  } catch (error) {
    next(error);
  }
};

export const toggleCustomerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.customer.update({
      where: { id },
      data: { status: newStatus },
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: req.user?.name,
      userRole: req.user?.role,
      action: newStatus === 'ACTIVE' ? 'ACTIVATE_CUSTOMER' : 'DEACTIVATE_CUSTOMER',
      entityType: 'Customer',
      entityId: id,
      previousValue: customer.status,
      newValue: newStatus,
    });

    return res.json({
      success: true,
      message: `Customer ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`,
      status: updated.status,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: { select: { id: true } },
        payments: { select: { id: true } },
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    if (customer.invoices.length > 0 || customer.payments.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer '${customer.companyName}' because they have ${customer.invoices.length} invoices and ${customer.payments.length} payment records. Please deactivate the customer instead.`,
      });
    }

    // Delete related entities and customer
    await prisma.$transaction(async (tx) => {
      await tx.creditAlert.deleteMany({ where: { customerId: id } });
      await tx.creditLimitHistory.deleteMany({ where: { customerId: id } });
      await tx.riskAssessment.deleteMany({ where: { customerId: id } });
      await tx.creditRequest.deleteMany({ where: { customerId: id } });
      await tx.creditProfile.deleteMany({ where: { customerId: id } });
      await tx.customer.delete({ where: { id } });
    });

    await logAuditEvent({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DELETE_CUSTOMER',
      entityType: 'Customer',
      entityId: id,
      previousValue: JSON.stringify({ code: customer.customerCode, name: customer.companyName }),
    });

    return res.json({ success: true, message: `Customer '${customer.companyName}' deleted successfully.` });
  } catch (error) {
    next(error);
  }
};
