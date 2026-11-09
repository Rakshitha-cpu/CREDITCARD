import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CREDITGUARD database seeding...');

  // 1. Clear existing records in correct referential order
  await prisma.paymentAllocation.deleteMany();
  await prisma.approvalRecord.deleteMany();
  await prisma.creditAlert.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.creditRequest.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.creditLimitHistory.deleteMany();
  await prisma.riskAssessment.deleteMany();
  await prisma.creditProfile.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.riskScoreConfiguration.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const usersData = [
    { email: 'admin@creditguard.com', name: 'System Administrator', role: 'ADMIN' },
    { email: 'manager@creditguard.com', name: 'Sarah Johnson (Finance Mgr)', role: 'FINANCE_MANAGER' },
    { email: 'finance@creditguard.com', name: 'Priya Mehta (Finance Exec)', role: 'FINANCE' },
    { email: 'sales@creditguard.com', name: 'Mike Chen (Credit Analyst)', role: 'SALES' },
  ];

  const createdUsers = {};
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        status: 'ACTIVE',
      },
    });
    createdUsers[u.role] = user;
  }
  console.log(`✅ Seeded ${Object.keys(createdUsers).length} demo users.`);

  // 3. Risk Configuration
  await prisma.riskScoreConfiguration.create({
    data: {
      utilizationWeight: 35,
      overdueWeight: 35,
      paymentHistoryWeight: 20,
      agingWeight: 10,
      lowThreshold: 20,
      mediumThreshold: 50,
    },
  });

  // 4. System Settings
  const settings = [
    { key: 'COMPANY_NAME', value: 'CreditGuard Financial Technologies Pvt Ltd', description: 'Registered Legal Entity Name' },
    { key: 'WARNING_THRESHOLD', value: '70', description: 'Warning utilization percent' },
    { key: 'CRITICAL_THRESHOLD', value: '85', description: 'Critical warning utilization percent' },
    { key: 'LIMIT_REACHED_THRESHOLD', value: '100', description: 'Limit reached boundary' },
    { key: 'DEFAULT_PAYMENT_TERMS', value: 'Net 30', description: 'Commercial maturity terms' },
    { key: 'AUTO_HOLD_OVERDUE_DAYS', value: '15', description: 'Hold dispatch when overdue days exceed' },
  ];
  for (const s of settings) {
    await prisma.systemSetting.create({ data: s });
  }

  // 5. Seed 15 Customers and Credit Profiles
  const customersRaw = [
    { code: 'CUS001', name: 'Bharat Steel Industries', person: 'Rajesh Kumar', email: 'rajesh.kumar@bharatsteel.in', phone: '+91 98765 43210', cat: 'Manufacturing', city: 'Mumbai', gst: '27AABCB1234L1Z5', limit: 5000000, terms: 'Net 30', behavior: 'Poor', riskScore: 72, riskCat: 'HIGH' },
    { code: 'CUS002', name: 'Sunrise Pharma Ltd', person: 'Priya Sharma', email: 'priya.sharma@sunrisepharma.com', phone: '+91 87654 32109', cat: 'Pharma', city: 'Ahmedabad', gst: '24AABCS5678M1Z3', limit: 8000000, terms: 'Net 45', behavior: 'Excellent', riskScore: 18, riskCat: 'LOW' },
    { code: 'CUS003', name: 'Delhi Auto Components', person: 'Amit Verma', email: 'amit.verma@delhiauto.in', phone: '+91 76543 21098', cat: 'Automotive', city: 'Delhi', gst: '07AABCD9012N1Z1', limit: 3500000, terms: 'Net 30', behavior: 'Fair', riskScore: 45, riskCat: 'MEDIUM' },
    { code: 'CUS004', name: 'TechNova Solutions', person: 'Sneha Patel', email: 'sneha.patel@technova.io', phone: '+91 65432 10987', cat: 'Technology', city: 'Bangalore', gst: '29AABCT3456O1Z9', limit: 2000000, terms: 'Net 15', behavior: 'Excellent', riskScore: 12, riskCat: 'LOW' },
    { code: 'CUS005', name: 'Global Textiles Corp', person: 'Ramesh Joshi', email: 'ramesh.joshi@globaltextiles.com', phone: '+91 54321 09876', cat: 'Textiles', city: 'Surat', gst: '24AABCG7890P1Z7', limit: 6000000, terms: 'Net 60', behavior: 'Poor', riskScore: 88, riskCat: 'HIGH' },
    { code: 'CUS006', name: 'Coastal Foods Pvt Ltd', person: 'Meena Nair', email: 'meena.nair@coastalfoods.in', phone: '+91 43210 98765', cat: 'FMCG', city: 'Kochi', gst: '32AABCC1234Q1Z3', limit: 1500000, terms: 'Net 30', behavior: 'Good', riskScore: 22, riskCat: 'MEDIUM' },
    { code: 'CUS007', name: 'Pioneer Chemicals', person: 'Suresh Reddy', email: 'suresh.reddy@pioneerchemicals.com', phone: '+91 32109 87654', cat: 'Chemicals', city: 'Hyderabad', gst: '36AABCP5678R1Z1', limit: 4000000, terms: 'Net 45', behavior: 'Poor', riskScore: 65, riskCat: 'HIGH' },
    { code: 'CUS008', name: 'Eastern Logistics Ltd', person: 'Pooja Das', email: 'pooja.das@easternlogistics.in', phone: '+91 21098 76543', cat: 'Logistics', city: 'Kolkata', gst: '19AABCE9012S1Z9', limit: 2500000, terms: 'Net 30', behavior: 'Good', riskScore: 30, riskCat: 'MEDIUM' },
    { code: 'CUS009', name: 'Maharashtra Cement Co', person: 'Vijay Kulkarni', email: 'vijay.kulkarni@mhcement.com', phone: '+91 10987 65432', cat: 'Construction', city: 'Pune', gst: '27AABCM3456T1Z7', limit: 10000000, terms: 'Net 60', behavior: 'Poor', riskScore: 78, riskCat: 'HIGH' },
    { code: 'CUS010', name: 'Skyline Electronics', person: 'Anita Gupta', email: 'anita.gupta@skylineelec.in', phone: '+91 09876 54321', cat: 'Electronics', city: 'Chennai', gst: '33AABCS7890U1Z5', limit: 3000000, terms: 'Net 30', behavior: 'Good', riskScore: 20, riskCat: 'LOW' },
    { code: 'CUS011', name: 'North India Traders', person: 'Ravi Singh', email: 'ravi.singh@northtraders.com', phone: '+91 98001 23456', cat: 'Trading', city: 'Chandigarh', gst: '04AABCN1234V1Z1', limit: 1200000, terms: 'Net 15', behavior: 'Fair', riskScore: 38, riskCat: 'MEDIUM' },
    { code: 'CUS012', name: 'Apex Agro Products', person: 'Kavitha Moorthy', email: 'kavitha.m@apexagro.in', phone: '+91 87001 34567', cat: 'Agriculture', city: 'Coimbatore', gst: '33AABCA5678W1Z9', limit: 2000000, terms: 'Net 30', behavior: 'Fair', riskScore: 55, riskCat: 'HIGH' },
    { code: 'CUS013', name: 'Kaveri Polymers', person: 'Manoj Pillai', email: 'manoj.p@kaveripoly.com', phone: '+91 76001 45678', cat: 'Chemicals', city: 'Madurai', gst: '33AABCK9012X1Z3', limit: 1800000, terms: 'Net 30', behavior: 'Good', riskScore: 24, riskCat: 'MEDIUM' },
    { code: 'CUS014', name: 'Sterling Engineering Works', person: 'Deepak Chopra', email: 'deepak@sterlingeng.in', phone: '+91 65001 56789', cat: 'Manufacturing', city: 'Vadodara', gst: '24AABCS3456Y1Z8', limit: 4500000, terms: 'Net 45', behavior: 'Good', riskScore: 28, riskCat: 'MEDIUM' },
    { code: 'CUS015', name: 'Nexus Renewable Energy', person: 'Ananya Roy', email: 'ananya@nexusre.in', phone: '+91 54001 67890', cat: 'Technology', city: 'Jaipur', gst: '08AABCN7890Z1Z4', limit: 5000000, terms: 'Net 30', behavior: 'Excellent', riskScore: 16, riskCat: 'LOW' },
  ];

  const createdCustomers = {};
  for (const c of customersRaw) {
    const cust = await prisma.customer.create({
      data: {
        customerCode: c.code,
        companyName: c.name,
        contactPerson: c.person,
        email: c.email,
        phone: c.phone,
        businessCategory: c.cat,
        city: c.city,
        address: `${c.city} Industrial Area`,
        gstNo: c.gst,
        status: c.code === 'CUS011' ? 'INACTIVE' : 'ACTIVE',
      },
    });

    createdCustomers[c.code] = cust;

    // Create credit profile
    const maxExp = c.limit * 1.1;
    await prisma.creditProfile.create({
      data: {
        customerId: cust.id,
        approvedCreditLimit: c.limit,
        maxPermissibleExposure: maxExp,
        paymentTerms: c.terms,
        paymentBehavior: c.behavior,
        riskScore: c.riskScore,
        riskCategory: c.riskCat,
        currentExposure: 0,
        availableCredit: c.limit,
      },
    });

    // Seed risk assessment
    await prisma.riskAssessment.create({
      data: {
        customerId: cust.id,
        riskScore: c.riskScore,
        riskCategory: c.riskCat,
        utilizationScore: Math.round(c.riskScore * 0.4),
        overdueScore: Math.round(c.riskScore * 0.3),
        paymentHistoryScore: Math.round(c.riskScore * 0.2),
        agingScore: Math.round(c.riskScore * 0.1),
        calculationDetails: `Automated baseline assessment for ${c.name}`,
      },
    });
  }
  console.log(`✅ Seeded ${Object.keys(createdCustomers).length} customers and credit profiles.`);

  // 6. Seed 30 Invoices across customers
  const invoiceData = [
    { num: 'INV-2026-001', cust: 'CUS001', date: '2026-09-01', due: '2026-10-01', amount: 850000, paid: 0 },
    { num: 'INV-2026-002', cust: 'CUS001', date: '2026-09-15', due: '2026-10-15', amount: 1200000, paid: 0 },
    { num: 'INV-2026-003', cust: 'CUS001', date: '2026-10-01', due: '2026-11-01', amount: 950000, paid: 0 },
    { num: 'INV-2026-004', cust: 'CUS001', date: '2026-10-15', due: '2026-11-15', amount: 1200000, paid: 0 },
    { num: 'INV-2026-005', cust: 'CUS002', date: '2026-09-10', due: '2026-10-25', amount: 2100000, paid: 0 },
    { num: 'INV-2026-006', cust: 'CUS002', date: '2026-08-20', due: '2026-10-04', amount: 1800000, paid: 1800000 },
    { num: 'INV-2026-007', cust: 'CUS003', date: '2026-09-05', due: '2026-10-05', amount: 420000, paid: 0 },
    { num: 'INV-2026-008', cust: 'CUS003', date: '2026-10-01', due: '2026-10-31', amount: 2380000, paid: 0 },
    { num: 'INV-2026-009', cust: 'CUS004', date: '2026-10-10', due: '2026-10-25', amount: 400000, paid: 0 },
    { num: 'INV-2026-010', cust: 'CUS005', date: '2026-08-01', due: '2026-09-30', amount: 1200000, paid: 0 },
    { num: 'INV-2026-011', cust: 'CUS005', date: '2026-09-01', due: '2026-10-31', amount: 2600000, paid: 0 },
    { num: 'INV-2026-012', cust: 'CUS005', date: '2026-09-20', due: '2026-11-19', amount: 2000000, paid: 0 },
    { num: 'INV-2026-013', cust: 'CUS006', date: '2026-10-05', due: '2026-11-04', amount: 600000, paid: 0 },
    { num: 'INV-2026-014', cust: 'CUS007', date: '2026-09-10', due: '2026-10-25', amount: 980000, paid: 0 },
    { num: 'INV-2026-015', cust: 'CUS007', date: '2026-10-01', due: '2026-11-15', amount: 2620000, paid: 0 },
    { num: 'INV-2026-016', cust: 'CUS008', date: '2026-10-10', due: '2026-11-09', amount: 1100000, paid: 0 },
    { num: 'INV-2026-017', cust: 'CUS009', date: '2026-08-15', due: '2026-10-14', amount: 1800000, paid: 0 },
    { num: 'INV-2026-018', cust: 'CUS009', date: '2026-09-20', due: '2026-11-19', amount: 5400000, paid: 0 },
    { num: 'INV-2026-019', cust: 'CUS010', date: '2026-10-10', due: '2026-11-09', amount: 900000, paid: 0 },
    { num: 'INV-2026-020', cust: 'CUS011', date: '2026-09-20', due: '2026-10-05', amount: 80000, paid: 0 },
    { num: 'INV-2026-021', cust: 'CUS011', date: '2026-10-01', due: '2026-10-16', amount: 420000, paid: 0 },
    { num: 'INV-2026-022', cust: 'CUS012', date: '2026-09-15', due: '2026-10-15', amount: 350000, paid: 0 },
    { num: 'INV-2026-023', cust: 'CUS012', date: '2026-10-01', due: '2026-10-31', amount: 1450000, paid: 0 },
    { num: 'INV-2026-024', cust: 'CUS002', date: '2026-07-15', due: '2026-08-29', amount: 2200000, paid: 2200000 },
    { num: 'INV-2026-025', cust: 'CUS004', date: '2026-09-01', due: '2026-09-16', amount: 550000, paid: 550000 },
    { num: 'INV-2026-026', cust: 'CUS013', date: '2026-10-02', due: '2026-11-01', amount: 450000, paid: 0 },
    { num: 'INV-2026-027', cust: 'CUS013', date: '2026-10-12', due: '2026-11-11', amount: 300000, paid: 0 },
    { num: 'INV-2026-028', cust: 'CUS014', date: '2026-09-25', due: '2026-11-09', amount: 1500000, paid: 0 },
    { num: 'INV-2026-029', cust: 'CUS015', date: '2026-10-08', due: '2026-11-07', amount: 1200000, paid: 0 },
    { num: 'INV-2026-030', cust: 'CUS015', date: '2026-10-20', due: '2026-11-19', amount: 800000, paid: 0 },
  ];

  const createdInvoices = {};
  const today = new Date('2026-11-09');

  for (const inv of invoiceData) {
    const cust = createdCustomers[inv.cust];
    const dueDate = new Date(inv.due);
    const outstanding = inv.amount - inv.paid;
    let status = 'UNPAID';
    if (inv.paid >= inv.amount) status = 'PAID';
    else if (dueDate < today) status = 'OVERDUE';

    const created = await prisma.invoice.create({
      data: {
        invoiceNumber: inv.num,
        customerId: cust.id,
        invoiceDate: new Date(inv.date),
        dueDate,
        invoiceAmount: inv.amount,
        paidAmount: inv.paid,
        outstandingAmount: outstanding,
        status,
      },
    });
    createdInvoices[inv.num] = created;
  }
  console.log(`✅ Seeded ${Object.keys(createdInvoices).length} invoices.`);

  // 7. Seed 20 Payments & Allocations
  const paymentRaw = [
    { num: 'PAY-2026-001', cust: 'CUS002', date: '2026-10-04', method: 'NEFT', ref: 'NEFT26278001234', amount: 1800000, inv: 'INV-2026-006' },
    { num: 'PAY-2026-002', cust: 'CUS004', date: '2026-09-16', method: 'RTGS', ref: 'RTGS26259005678', amount: 550000, inv: 'INV-2026-025' },
    { num: 'PAY-2026-003', cust: 'CUS002', date: '2026-08-29', method: 'CHEQUE', ref: 'CHQ-442891', amount: 2200000, inv: 'INV-2026-024' },
    { num: 'PAY-2026-004', cust: 'CUS010', date: '2026-09-30', method: 'NEFT', ref: 'NEFT26273009012', amount: 500000, inv: null },
    { num: 'PAY-2026-005', cust: 'CUS006', date: '2026-10-20', method: 'IMPS', ref: 'IMPS26293003456', amount: 300000, inv: null },
    { num: 'PAY-2026-006', cust: 'CUS008', date: '2026-10-25', method: 'NEFT', ref: 'NEFT26298007890', amount: 600000, inv: null },
    { num: 'PAY-2026-007', cust: 'CUS001', date: '2026-08-10', method: 'RTGS', ref: 'RTGS26222001122', amount: 1000000, inv: null },
    { num: 'PAY-2026-008', cust: 'CUS003', date: '2026-08-15', method: 'NEFT', ref: 'NEFT26227003344', amount: 800000, inv: null },
    { num: 'PAY-2026-009', cust: 'CUS005', date: '2026-07-20', method: 'RTGS', ref: 'RTGS26201005566', amount: 1500000, inv: null },
    { num: 'PAY-2026-010', cust: 'CUS007', date: '2026-08-05', method: 'NEFT', ref: 'NEFT26217007788', amount: 1200000, inv: null },
    { num: 'PAY-2026-011', cust: 'CUS009', date: '2026-07-30', method: 'RTGS', ref: 'RTGS26211009900', amount: 2500000, inv: null },
    { num: 'PAY-2026-012', cust: 'CUS012', date: '2026-08-25', method: 'IMPS', ref: 'IMPS26237001212', amount: 400000, inv: null },
    { num: 'PAY-2026-013', cust: 'CUS013', date: '2026-09-10', method: 'NEFT', ref: 'NEFT26253003434', amount: 600000, inv: null },
    { num: 'PAY-2026-014', cust: 'CUS014', date: '2026-08-18', method: 'RTGS', ref: 'RTGS26230005656', amount: 1000000, inv: null },
    { num: 'PAY-2026-015', cust: 'CUS015', date: '2026-09-05', method: 'NEFT', ref: 'NEFT26248007878', amount: 1500000, inv: null },
    { num: 'PAY-2026-016', cust: 'CUS002', date: '2026-10-15', method: 'RTGS', ref: 'RTGS26288009090', amount: 900000, inv: null },
    { num: 'PAY-2026-017', cust: 'CUS004', date: '2026-10-18', method: 'UPI', ref: 'UPI26291001313', amount: 250000, inv: null },
    { num: 'PAY-2026-018', cust: 'CUS006', date: '2026-10-22', method: 'NEFT', ref: 'NEFT26295003535', amount: 300000, inv: null },
    { num: 'PAY-2026-019', cust: 'CUS008', date: '2026-10-28', method: 'IMPS', ref: 'IMPS26301005757', amount: 500000, inv: null },
    { num: 'PAY-2026-020', cust: 'CUS010', date: '2026-10-30', method: 'NEFT', ref: 'NEFT26303007979', amount: 400000, inv: null },
  ];

  for (const p of paymentRaw) {
    const cust = createdCustomers[p.cust];
    const isAllocated = !!p.inv;

    const payment = await prisma.payment.create({
      data: {
        paymentNumber: p.num,
        customerId: cust.id,
        paymentDate: new Date(p.date),
        paymentMethod: p.method,
        transactionReference: p.ref,
        paymentAmount: p.amount,
        allocatedAmount: isAllocated ? p.amount : 0,
        unallocatedAmount: isAllocated ? 0 : p.amount,
        status: isAllocated ? 'ALLOCATED' : 'UNALLOCATED',
      },
    });

    if (p.inv && createdInvoices[p.inv]) {
      await prisma.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: createdInvoices[p.inv].id,
          amount: p.amount,
          allocatedBy: createdUsers.FINANCE.name,
        },
      });
    }
  }
  console.log(`✅ Seeded ${paymentRaw.length} payments and allocations.`);

  // 8. Recompute customer current exposure & available credit from open invoices
  for (const cust of Object.values(createdCustomers)) {
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { customerId: cust.id, status: { in: ['UNPAID', 'OVERDUE'] } },
    });
    const currentExposure = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.outstandingAmount), 0);

    const profile = await prisma.creditProfile.findUnique({ where: { customerId: cust.id } });
    if (profile) {
      const avail = Math.max(0, Number(profile.approvedCreditLimit) - currentExposure);
      await prisma.creditProfile.update({
        where: { id: profile.id },
        data: {
          currentExposure,
          availableCredit: avail,
        },
      });
    }
  }

  // 9. Seed 10 Credit Requests
  const creditRequestsRaw = [
    { num: 'CR-2026-001', cust: 'CUS001', add: 2000000, reason: 'Expansion of manufacturing capacity, new government order worth ₹15Cr', status: 'PENDING', validDays: 120 },
    { num: 'CR-2026-002', cust: 'CUS003', add: 1500000, reason: 'New OEM contract with Maruti Suzuki requiring higher working capital', status: 'PENDING', validDays: 90 },
    { num: 'CR-2026-003', cust: 'CUS005', add: 2000000, reason: 'Festival season bulk order requirements in Surat textile hub', status: 'REJECTED', validDays: 60, rej: 'High risk score (88) and existing overdue amount of ₹12L. Overdue balance must be cleared first.' },
    { num: 'CR-2026-004', cust: 'CUS002', add: 2000000, reason: 'New oncology product line launch requires increased procurement', status: 'APPROVED', validDays: 180, comm: 'Excellent payment history, AAA rated customer with low risk score (18). Approved.' },
    { num: 'CR-2026-005', cust: 'CUS007', add: 1500000, reason: 'New chemical specialty plant setup requires enhanced working capital', status: 'PENDING', validDays: 90 },
    { num: 'CR-2026-006', cust: 'CUS009', add: 2000000, reason: 'Large government infrastructure road contract in Maharashtra', status: 'PENDING', validDays: 150 },
    { num: 'CR-2026-007', cust: 'CUS010', add: 1000000, reason: 'Component procurement for electronics export consignment', status: 'PENDING', validDays: 60 },
    { num: 'CR-2026-008', cust: 'CUS014', add: 1000000, reason: 'Export machinery tooling consignment fulfillment', status: 'APPROVED', validDays: 120, comm: 'Consistent payment track record. Approved limit enhancement.' },
    { num: 'CR-2026-009', cust: 'CUS015', add: 1500000, reason: 'Solar plant phase-2 equipment procurement', status: 'PENDING', validDays: 90 },
    { num: 'CR-2026-010', cust: 'CUS008', add: 500000, reason: 'Fleet warehouse expansion across Eastern corridor', status: 'APPROVED', validDays: 90, comm: 'Low exposure and steady logistics cash flow. Approved.' },
  ];

  for (const cr of creditRequestsRaw) {
    const cust = createdCustomers[cr.cust];
    const profile = await prisma.creditProfile.findUnique({ where: { customerId: cust.id } });
    const currentLimit = Number(profile.approvedCreditLimit);
    const requestedLimit = currentLimit + cr.add;
    const currentExposure = Number(profile.currentExposure);
    const projectedExposure = currentExposure + cr.add;

    const requestDate = new Date('2026-10-15');
    const validityPeriod = new Date(requestDate.getTime() + cr.validDays * 86400000);

    const createdReq = await prisma.creditRequest.create({
      data: {
        requestNumber: cr.num,
        customerId: cust.id,
        currentLimit,
        requestedLimit,
        additionalAmount: cr.add,
        currentExposure,
        projectedExposure,
        businessJustification: cr.reason,
        validityPeriod,
        status: cr.status,
        submittedById: createdUsers.SALES.id,
        requestDate,
        rejectionReason: cr.rej || null,
        approvalComment: cr.comm || null,
      },
    });

    if (cr.status === 'APPROVED' || cr.status === 'REJECTED') {
      await prisma.approvalRecord.create({
        data: {
          creditRequestId: createdReq.id,
          approvedById: createdUsers.FINANCE_MANAGER.id,
          action: cr.status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          comment: cr.comm || cr.rej,
        },
      });

      // If approved, update credit profile & history
      if (cr.status === 'APPROVED') {
        await prisma.creditProfile.update({
          where: { id: profile.id },
          data: {
            approvedCreditLimit: requestedLimit,
            maxPermissibleExposure: requestedLimit * 1.1,
            availableCredit: Math.max(0, requestedLimit - currentExposure),
          },
        });

        await prisma.creditLimitHistory.create({
          data: {
            customerId: cust.id,
            previousLimit: currentLimit,
            newLimit: requestedLimit,
            reason: cr.reason,
            updatedBy: createdUsers.FINANCE_MANAGER.name,
          },
        });
      }
    }
  }
  console.log(`✅ Seeded ${creditRequestsRaw.length} credit requests and approval history.`);

  // 10. Seed Credit Monitoring Alerts
  const alertCustomers = [
    { cust: 'CUS005', type: 'CRITICAL_85', sev: 'HIGH', msg: 'Global Textiles Corp has reached 96.7% credit limit utilization with ₹12L overdue.' },
    { cust: 'CUS001', type: 'CRITICAL_85', sev: 'HIGH', msg: 'Bharat Steel Industries has reached 84% utilization with ₹8.5L overdue.' },
    { cust: 'CUS007', type: 'CRITICAL_85', sev: 'HIGH', msg: 'Pioneer Chemicals utilization is at 90% with ₹9.8L overdue.' },
    { cust: 'CUS009', type: 'WARNING_70', sev: 'MEDIUM', msg: 'Maharashtra Cement Co has ₹18L overdue approaching critical boundary.' },
  ];

  for (const a of alertCustomers) {
    const cust = createdCustomers[a.cust];
    await prisma.creditAlert.create({
      data: {
        customerId: cust.id,
        alertType: a.type,
        severity: a.sev,
        message: a.msg,
      },
    });
  }

  // 11. Seed Audit Logs
  const auditEntries = [
    { user: createdUsers.FINANCE_MANAGER, act: 'APPROVED', ent: 'Credit Request', entId: 'CR-2026-004', prev: 'PENDING', next: 'APPROVED', rem: 'Approved ₹20L limit increase for Sunrise Pharma Ltd' },
    { user: createdUsers.FINANCE_MANAGER, act: 'REJECTED', ent: 'Credit Request', entId: 'CR-2026-003', prev: 'PENDING', next: 'REJECTED', rem: 'Rejected due to excessive overdue balance' },
    { user: createdUsers.SALES, act: 'CREATED', ent: 'Credit Request', entId: 'CR-2026-001', prev: '—', next: '₹20,00,000', rem: 'Submitted by Mike Chen' },
    { user: createdUsers.FINANCE, act: 'ALLOCATED', ent: 'Payment', entId: 'PAY-2026-001', prev: 'UNALLOCATED', next: 'ALLOCATED', rem: 'Allocated ₹18L to INV-2026-006' },
  ];

  for (const log of auditEntries) {
    await prisma.auditLog.create({
      data: {
        userId: log.user.id,
        userName: log.user.name,
        userRole: log.user.role,
        action: log.act,
        entityType: log.ent,
        entityId: log.entId,
        previousValue: log.prev,
        newValue: log.next,
        remarks: log.rem,
      },
    });
  }

  console.log('🎉 CREDITGUARD database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
