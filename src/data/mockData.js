// ============================================================
// CREDITGUARD – Central Mock Data Store
// All pages derive their data from this single source of truth
// ============================================================

export const CUSTOMERS = [
  {
    id: 'CUS001', companyName: 'Bharat Steel Industries', contactPerson: 'Rajesh Kumar',
    email: 'rajesh.kumar@bharatsteel.in', phone: '+91 98765 43210',
    category: 'Manufacturing', creditLimit: 5000000, outstanding: 4200000,
    overdue: 850000, riskScore: 72, riskCategory: 'High', status: 'Active',
    paymentTerms: 'Net 30', city: 'Mumbai', gstNo: '27AABCB1234L1Z5',
    address: '45, MIDC Industrial Area, Andheri East, Mumbai - 400093',
    createdAt: '2024-01-15', lastAssessment: '2026-10-20',
    paymentBehavior: 'Poor', availableCredit: 800000,
  },
  {
    id: 'CUS002', companyName: 'Sunrise Pharma Ltd', contactPerson: 'Priya Sharma',
    email: 'priya.sharma@sunrisepharma.com', phone: '+91 87654 32109',
    category: 'Pharma', creditLimit: 8000000, outstanding: 2100000,
    overdue: 0, riskScore: 18, riskCategory: 'Low', status: 'Active',
    paymentTerms: 'Net 45', city: 'Ahmedabad', gstNo: '24AABCS5678M1Z3',
    address: '12, Sindhu Bhavan Road, Bodakdev, Ahmedabad - 380054',
    createdAt: '2023-06-10', lastAssessment: '2026-10-18',
    paymentBehavior: 'Excellent', availableCredit: 5900000,
  },
  {
    id: 'CUS003', companyName: 'Delhi Auto Components', contactPerson: 'Amit Verma',
    email: 'amit.verma@delhiauto.in', phone: '+91 76543 21098',
    category: 'Automotive', creditLimit: 3500000, outstanding: 2800000,
    overdue: 420000, riskScore: 45, riskCategory: 'Medium', status: 'Active',
    paymentTerms: 'Net 30', city: 'Delhi', gstNo: '07AABCD9012N1Z1',
    address: 'Plot 23, Okhla Industrial Estate, Phase III, New Delhi - 110020',
    createdAt: '2023-11-20', lastAssessment: '2026-10-15',
    paymentBehavior: 'Fair', availableCredit: 700000,
  },
  {
    id: 'CUS004', companyName: 'TechNova Solutions', contactPerson: 'Sneha Patel',
    email: 'sneha.patel@technova.io', phone: '+91 65432 10987',
    category: 'Technology', creditLimit: 2000000, outstanding: 400000,
    overdue: 0, riskScore: 12, riskCategory: 'Low', status: 'Active',
    paymentTerms: 'Net 15', city: 'Bangalore', gstNo: '29AABCT3456O1Z9',
    address: '7th Floor, Prestige Tech Park, Outer Ring Road, Bangalore - 560103',
    createdAt: '2024-03-05', lastAssessment: '2026-10-22',
    paymentBehavior: 'Excellent', availableCredit: 1600000,
  },
  {
    id: 'CUS005', companyName: 'Global Textiles Corp', contactPerson: 'Ramesh Joshi',
    email: 'ramesh.joshi@globaltextiles.com', phone: '+91 54321 09876',
    category: 'Textiles', creditLimit: 6000000, outstanding: 5800000,
    overdue: 1200000, riskScore: 88, riskCategory: 'High', status: 'Active',
    paymentTerms: 'Net 60', city: 'Surat', gstNo: '24AABCG7890P1Z7',
    address: 'Ring Road, Surat Textile Market, Surat - 395002',
    createdAt: '2023-04-12', lastAssessment: '2026-10-10',
    paymentBehavior: 'Poor', availableCredit: 200000,
  },
  {
    id: 'CUS006', companyName: 'Coastal Foods Pvt Ltd', contactPerson: 'Meena Nair',
    email: 'meena.nair@coastalfoods.in', phone: '+91 43210 98765',
    category: 'FMCG', creditLimit: 1500000, outstanding: 600000,
    overdue: 0, riskScore: 22, riskCategory: 'Medium', status: 'Active',
    paymentTerms: 'Net 30', city: 'Kochi', gstNo: '32AABCC1234Q1Z3',
    address: 'NH-66, Ernakulam Industrial Area, Kochi - 682024',
    createdAt: '2024-02-18', lastAssessment: '2026-10-19',
    paymentBehavior: 'Good', availableCredit: 900000,
  },
  {
    id: 'CUS007', companyName: 'Pioneer Chemicals', contactPerson: 'Suresh Reddy',
    email: 'suresh.reddy@pioneerchemicals.com', phone: '+91 32109 87654',
    category: 'Chemicals', creditLimit: 4000000, outstanding: 3600000,
    overdue: 980000, riskScore: 65, riskCategory: 'High', status: 'Active',
    paymentTerms: 'Net 45', city: 'Hyderabad', gstNo: '36AABCP5678R1Z1',
    address: 'IDA Jeedimetla, Hyderabad - 500055',
    createdAt: '2023-08-30', lastAssessment: '2026-10-12',
    paymentBehavior: 'Poor', availableCredit: 400000,
  },
  {
    id: 'CUS008', companyName: 'Eastern Logistics Ltd', contactPerson: 'Pooja Das',
    email: 'pooja.das@easternlogistics.in', phone: '+91 21098 76543',
    category: 'Logistics', creditLimit: 2500000, outstanding: 1100000,
    overdue: 0, riskScore: 30, riskCategory: 'Medium', status: 'Active',
    paymentTerms: 'Net 30', city: 'Kolkata', gstNo: '19AABCE9012S1Z9',
    address: '14, Dalhousie Square, Kolkata - 700001',
    createdAt: '2024-01-08', lastAssessment: '2026-10-17',
    paymentBehavior: 'Good', availableCredit: 1400000,
  },
  {
    id: 'CUS009', companyName: 'Maharashtra Cement Co', contactPerson: 'Vijay Kulkarni',
    email: 'vijay.kulkarni@mhcement.com', phone: '+91 10987 65432',
    category: 'Construction', creditLimit: 10000000, outstanding: 7200000,
    overdue: 1800000, riskScore: 78, riskCategory: 'High', status: 'Active',
    paymentTerms: 'Net 60', city: 'Pune', gstNo: '27AABCM3456T1Z7',
    address: 'Pimpri Industrial Area, Pune - 411018',
    createdAt: '2022-12-01', lastAssessment: '2026-10-08',
    paymentBehavior: 'Poor', availableCredit: 2800000,
  },
  {
    id: 'CUS010', companyName: 'Skyline Electronics', contactPerson: 'Anita Gupta',
    email: 'anita.gupta@skylineelec.in', phone: '+91 09876 54321',
    category: 'Electronics', creditLimit: 3000000, outstanding: 900000,
    overdue: 0, riskScore: 20, riskCategory: 'Low', status: 'Active',
    paymentTerms: 'Net 30', city: 'Chennai', gstNo: '33AABCS7890U1Z5',
    address: '2nd Floor, Ambattur Industrial Estate, Chennai - 600058',
    createdAt: '2024-04-20', lastAssessment: '2026-10-21',
    paymentBehavior: 'Good', availableCredit: 2100000,
  },
  {
    id: 'CUS011', companyName: 'North India Traders', contactPerson: 'Ravi Singh',
    email: 'ravi.singh@northtraders.com', phone: '+91 98001 23456',
    category: 'Trading', creditLimit: 1200000, outstanding: 500000,
    overdue: 80000, riskScore: 38, riskCategory: 'Medium', status: 'Inactive',
    paymentTerms: 'Net 15', city: 'Chandigarh', gstNo: '04AABCN1234V1Z1',
    address: 'SCO 45, Industrial Area Phase I, Chandigarh - 160002',
    createdAt: '2023-09-15', lastAssessment: '2026-09-30',
    paymentBehavior: 'Fair', availableCredit: 700000,
  },
  {
    id: 'CUS012', companyName: 'Apex Agro Products', contactPerson: 'Kavitha Moorthy',
    email: 'kavitha.m@apexagro.in', phone: '+91 87001 34567',
    category: 'Agriculture', creditLimit: 2000000, outstanding: 1800000,
    overdue: 350000, riskScore: 55, riskCategory: 'High', status: 'Active',
    paymentTerms: 'Net 30', city: 'Coimbatore', gstNo: '33AABCA5678W1Z9',
    address: 'SIDCO Industrial Estate, Coimbatore - 641021',
    createdAt: '2023-07-22', lastAssessment: '2026-10-14',
    paymentBehavior: 'Fair', availableCredit: 200000,
  },
];

export const INVOICES = [
  { id: 'INV001', customerId: 'CUS001', invoiceDate: '2026-09-01', dueDate: '2026-10-01', amount: 850000, paidAmount: 0, status: 'Overdue' },
  { id: 'INV002', customerId: 'CUS001', invoiceDate: '2026-09-15', dueDate: '2026-10-15', amount: 1200000, paidAmount: 0, status: 'Overdue' },
  { id: 'INV003', customerId: 'CUS001', invoiceDate: '2026-10-01', dueDate: '2026-11-01', amount: 950000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV004', customerId: 'CUS001', invoiceDate: '2026-10-15', dueDate: '2026-11-15', amount: 1200000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV005', customerId: 'CUS002', invoiceDate: '2026-09-10', dueDate: '2026-10-25', amount: 2100000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV006', customerId: 'CUS002', invoiceDate: '2026-08-20', dueDate: '2026-10-04', amount: 1800000, paidAmount: 1800000, status: 'Paid' },
  { id: 'INV007', customerId: 'CUS003', invoiceDate: '2026-09-05', dueDate: '2026-10-05', amount: 420000, paidAmount: 0, status: 'Overdue' },
  { id: 'INV008', customerId: 'CUS003', invoiceDate: '2026-10-01', dueDate: '2026-10-31', amount: 2380000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV009', customerId: 'CUS004', invoiceDate: '2026-10-10', dueDate: '2026-10-25', amount: 400000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV010', customerId: 'CUS005', invoiceDate: '2026-08-01', dueDate: '2026-09-30', amount: 1200000, paidAmount: 0, status: 'Overdue' },
  { id: 'INV011', customerId: 'CUS005', invoiceDate: '2026-09-01', dueDate: '2026-10-31', amount: 2600000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV012', customerId: 'CUS005', invoiceDate: '2026-09-20', dueDate: '2026-11-19', amount: 2000000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV013', customerId: 'CUS006', invoiceDate: '2026-10-05', dueDate: '2026-11-04', amount: 600000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV014', customerId: 'CUS007', invoiceDate: '2026-09-10', dueDate: '2026-10-25', amount: 980000, paidAmount: 0, status: 'Overdue' },
  { id: 'INV015', customerId: 'CUS007', invoiceDate: '2026-10-01', dueDate: '2026-11-15', amount: 2620000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV016', customerId: 'CUS008', invoiceDate: '2026-10-10', dueDate: '2026-11-09', amount: 1100000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV017', customerId: 'CUS009', invoiceDate: '2026-08-15', dueDate: '2026-10-14', amount: 1800000, paidAmount: 0, status: 'Overdue' },
  { id: 'INV018', customerId: 'CUS009', invoiceDate: '2026-09-20', dueDate: '2026-11-19', amount: 5400000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV019', customerId: 'CUS010', invoiceDate: '2026-10-10', dueDate: '2026-11-09', amount: 900000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV020', customerId: 'CUS011', invoiceDate: '2026-09-20', dueDate: '2026-10-05', amount: 80000, paidAmount: 0, status: 'Overdue' },
  { id: 'INV021', customerId: 'CUS011', invoiceDate: '2026-10-01', dueDate: '2026-10-16', amount: 420000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV022', customerId: 'CUS012', invoiceDate: '2026-09-15', dueDate: '2026-10-15', amount: 350000, paidAmount: 0, status: 'Overdue' },
  { id: 'INV023', customerId: 'CUS012', invoiceDate: '2026-10-01', dueDate: '2026-10-31', amount: 1450000, paidAmount: 0, status: 'Unpaid' },
  { id: 'INV024', customerId: 'CUS002', invoiceDate: '2026-07-15', dueDate: '2026-08-29', amount: 2200000, paidAmount: 2200000, status: 'Paid' },
  { id: 'INV025', customerId: 'CUS004', invoiceDate: '2026-09-01', dueDate: '2026-09-16', amount: 550000, paidAmount: 550000, status: 'Paid' },
];

export const PAYMENTS = [
  { id: 'PAY001', customerId: 'CUS002', paymentDate: '2026-10-04', method: 'NEFT', reference: 'NEFT26278001234', amount: 1800000, allocationStatus: 'Allocated', invoiceIds: ['INV006'] },
  { id: 'PAY002', customerId: 'CUS004', paymentDate: '2026-09-16', method: 'RTGS', reference: 'RTGS26259005678', amount: 550000, allocationStatus: 'Allocated', invoiceIds: ['INV025'] },
  { id: 'PAY003', customerId: 'CUS002', paymentDate: '2026-08-29', method: 'Cheque', reference: 'CHQ-442891', amount: 2200000, allocationStatus: 'Allocated', invoiceIds: ['INV024'] },
  { id: 'PAY004', customerId: 'CUS010', paymentDate: '2026-09-30', method: 'NEFT', reference: 'NEFT26273009012', amount: 500000, allocationStatus: 'Unallocated', invoiceIds: [] },
  { id: 'PAY005', customerId: 'CUS006', paymentDate: '2026-10-20', method: 'IMPS', reference: 'IMPS26293003456', amount: 300000, allocationStatus: 'Partial', invoiceIds: ['INV013'] },
  { id: 'PAY006', customerId: 'CUS008', paymentDate: '2026-10-25', method: 'NEFT', reference: 'NEFT26298007890', amount: 600000, allocationStatus: 'Partial', invoiceIds: ['INV016'] },
];

export const CREDIT_REQUESTS = [
  {
    id: 'CR001', customerId: 'CUS001', currentLimit: 5000000, requestedAmount: 7000000,
    additionalRequested: 2000000, businessJustification: 'Expansion of manufacturing capacity, new government order worth ₹15Cr',
    validityDate: '2027-03-31', requestDate: '2026-10-15', status: 'Pending',
    submittedBy: 'Sarah Johnson', riskScore: 72, currentExposure: 4200000,
  },
  {
    id: 'CR002', customerId: 'CUS003', currentLimit: 3500000, requestedAmount: 5000000,
    additionalRequested: 1500000, businessJustification: 'New OEM contract with Maruti Suzuki requiring higher working capital',
    validityDate: '2026-12-31', requestDate: '2026-10-10', status: 'Pending',
    submittedBy: 'Mike Chen', riskScore: 45, currentExposure: 2800000,
  },
  {
    id: 'CR003', customerId: 'CUS005', currentLimit: 6000000, requestedAmount: 8000000,
    additionalRequested: 2000000, businessJustification: 'Festival season bulk order requirements',
    validityDate: '2026-12-31', requestDate: '2026-10-05', status: 'Rejected',
    submittedBy: 'Sarah Johnson', riskScore: 88, currentExposure: 5800000,
    rejectionReason: 'High risk score and existing overdue amount of ₹12L. Cannot approve additional credit until overdue is cleared.',
  },
  {
    id: 'CR004', customerId: 'CUS002', currentLimit: 8000000, requestedAmount: 10000000,
    additionalRequested: 2000000, businessJustification: 'New product line launch requires increased procurement',
    validityDate: '2027-06-30', requestDate: '2026-09-20', status: 'Approved',
    submittedBy: 'Mike Chen', riskScore: 18, currentExposure: 2100000,
    approvalComment: 'Excellent payment history. Low risk. Approved.',
  },
  {
    id: 'CR005', customerId: 'CUS007', currentLimit: 4000000, requestedAmount: 5500000,
    additionalRequested: 1500000, businessJustification: 'New chemical plant setup requires enhanced working capital',
    validityDate: '2026-11-30', requestDate: '2026-10-20', status: 'Pending',
    submittedBy: 'Sarah Johnson', riskScore: 65, currentExposure: 3600000,
  },
  {
    id: 'CR006', customerId: 'CUS009', currentLimit: 10000000, requestedAmount: 12000000,
    additionalRequested: 2000000, businessJustification: 'Large government infrastructure contract secured',
    validityDate: '2027-03-31', requestDate: '2026-10-22', status: 'Pending',
    submittedBy: 'Mike Chen', riskScore: 78, currentExposure: 7200000,
  },
];

export const USERS = [
  { id: 'USR001', name: 'Sarah Johnson', email: 'sarah.johnson@creditguard.in', role: 'Finance Manager', status: 'Active', lastLogin: '2026-11-09', permissions: ['approve_credit', 'view_reports', 'manage_customers'] },
  { id: 'USR002', name: 'Mike Chen', email: 'mike.chen@creditguard.in', role: 'Credit Analyst', status: 'Active', lastLogin: '2026-11-09', permissions: ['view_reports', 'manage_customers', 'submit_credit_requests'] },
  { id: 'USR003', name: 'Priya Mehta', email: 'priya.mehta@creditguard.in', role: 'Finance Executive', status: 'Active', lastLogin: '2026-11-08', permissions: ['view_reports', 'manage_invoices', 'manage_payments'] },
  { id: 'USR004', name: 'Admin User', email: 'admin@creditguard.in', role: 'Super Admin', status: 'Active', lastLogin: '2026-11-09', permissions: ['all'] },
  { id: 'USR005', name: 'Rahul Verma', email: 'rahul.verma@creditguard.in', role: 'Auditor', status: 'Inactive', lastLogin: '2026-10-15', permissions: ['view_reports', 'view_audit_logs'] },
];

export const AUDIT_LOGS = [
  { id: 'AUD001', user: 'Sarah Johnson', role: 'Finance Manager', action: 'APPROVED', entity: 'Credit Request', entityId: 'CR004', previousValue: 'Pending', newValue: 'Approved', timestamp: '2026-10-25 14:32:11' },
  { id: 'AUD002', user: 'Sarah Johnson', role: 'Finance Manager', action: 'REJECTED', entity: 'Credit Request', entityId: 'CR003', previousValue: 'Pending', newValue: 'Rejected', timestamp: '2026-10-20 11:15:44' },
  { id: 'AUD003', user: 'Mike Chen', role: 'Credit Analyst', action: 'CREATED', entity: 'Credit Request', entityId: 'CR002', previousValue: '-', newValue: '₹35,00,000', timestamp: '2026-10-10 09:45:22' },
  { id: 'AUD004', user: 'Priya Mehta', role: 'Finance Executive', action: 'UPDATED', entity: 'Invoice', entityId: 'INV006', previousValue: 'Unpaid', newValue: 'Paid', timestamp: '2026-10-04 16:20:33' },
  { id: 'AUD005', user: 'Admin User', role: 'Super Admin', action: 'CREATED', entity: 'Customer', entityId: 'CUS012', previousValue: '-', newValue: 'Apex Agro Products', timestamp: '2023-07-22 10:00:00' },
  { id: 'AUD006', user: 'Mike Chen', role: 'Credit Analyst', action: 'UPDATED', entity: 'Credit Profile', entityId: 'CUS009', previousValue: '₹80,00,000', newValue: '₹1,00,00,000', timestamp: '2026-09-15 14:10:05' },
  { id: 'AUD007', user: 'Priya Mehta', role: 'Finance Executive', action: 'CREATED', entity: 'Payment', entityId: 'PAY001', previousValue: '-', newValue: '₹18,00,000', timestamp: '2026-10-04 17:00:00' },
  { id: 'AUD008', user: 'Sarah Johnson', role: 'Finance Manager', action: 'UPDATED', entity: 'Customer', entityId: 'CUS011', previousValue: 'Active', newValue: 'Inactive', timestamp: '2026-10-30 11:30:00' },
];

export const MONTHLY_TRENDS = [
  { month: 'May', outstanding: 18500000, collections: 12000000, payments: 11500000 },
  { month: 'Jun', outstanding: 20000000, collections: 14500000, payments: 13800000 },
  { month: 'Jul', outstanding: 22000000, collections: 15200000, payments: 14600000 },
  { month: 'Aug', outstanding: 24500000, collections: 16800000, payments: 16000000 },
  { month: 'Sep', outstanding: 26000000, collections: 18500000, payments: 17800000 },
  { month: 'Oct', outstanding: 29400000, collections: 14550000, payments: 13900000 },
];

export const CREDIT_LIMIT_HISTORY = [
  { customerId: 'CUS001', previousValue: 3000000, newValue: 5000000, updatedBy: 'Sarah Johnson', updatedDate: '2025-06-15', reason: 'Increased order volume' },
  { customerId: 'CUS002', previousValue: 5000000, newValue: 8000000, updatedBy: 'Sarah Johnson', updatedDate: '2024-09-20', reason: 'Excellent payment history, business growth' },
  { customerId: 'CUS009', previousValue: 8000000, newValue: 10000000, updatedBy: 'Mike Chen', updatedDate: '2026-09-15', reason: 'New government contract' },
];

// ---- Derived / Computed ----
export function getDashboardMetrics() {
  const totalCustomers = CUSTOMERS.length;
  const activeCustomers = CUSTOMERS.filter(c => c.status === 'Active').length;
  const totalCreditLimit = CUSTOMERS.reduce((s, c) => s + c.creditLimit, 0);
  const totalOutstanding = CUSTOMERS.reduce((s, c) => s + c.outstanding, 0);
  const totalOverdue = CUSTOMERS.reduce((s, c) => s + c.overdue, 0);
  const availableCredit = totalCreditLimit - totalOutstanding;
  const highRiskCustomers = CUSTOMERS.filter(c => c.riskCategory === 'High').length;
  const pendingCreditRequests = CREDIT_REQUESTS.filter(r => r.status === 'Pending').length;
  return { totalCustomers, activeCustomers, totalCreditLimit, totalOutstanding, totalOverdue, availableCredit, highRiskCustomers, pendingCreditRequests };
}

export function getCustomerById(id) {
  return CUSTOMERS.find(c => c.id === id);
}

export function getInvoicesByCustomer(customerId) {
  return INVOICES.filter(i => i.customerId === customerId);
}

export function getPaymentsByCustomer(customerId) {
  return PAYMENTS.filter(p => p.customerId === customerId);
}

export function getCreditRequestsByCustomer(customerId) {
  return CREDIT_REQUESTS.filter(r => r.customerId === customerId);
}

export function getCustomerName(customerId) {
  const c = CUSTOMERS.find(c => c.id === customerId);
  return c ? c.companyName : customerId;
}

export function getAgingBuckets() {
  const now = new Date('2026-11-09');
  let current = 0, bucket1to30 = 0, bucket31to60 = 0, bucket60plus = 0;
  INVOICES.filter(i => i.status !== 'Paid').forEach(inv => {
    const due = new Date(inv.dueDate);
    const diff = Math.floor((now - due) / 86400000);
    if (diff <= 0) current += inv.amount - inv.paidAmount;
    else if (diff <= 30) bucket1to30 += inv.amount - inv.paidAmount;
    else if (diff <= 60) bucket31to60 += inv.amount - inv.paidAmount;
    else bucket60plus += inv.amount - inv.paidAmount;
  });
  return { current, bucket1to30, bucket31to60, bucket60plus };
}
