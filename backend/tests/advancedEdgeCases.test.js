import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import jwt from 'jsonwebtoken';
import { CreditExposureService } from '../src/services/creditExposureService.js';
import { AgingService } from '../src/services/agingService.js';
import { RiskScoringService } from '../src/services/riskScoringService.js';

test('PROMPT 5: CREDITGUARD Advanced Edge-Case & Stress Validation Suite', async (t) => {
  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  let adminToken;
  let managerToken;
  let salesToken;
  let financeToken;

  await t.test('SETUP: Acquire JWT tokens for all roles', async () => {
    const roles = [
      { email: 'admin@creditguard.com', role: 'ADMIN' },
      { email: 'manager@creditguard.com', role: 'FINANCE_MANAGER' },
      { email: 'finance@creditguard.com', role: 'FINANCE' },
      { email: 'sales@creditguard.com', role: 'SALES' },
    ];

    for (const r of roles) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: r.email, password: 'demo1234' }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      if (r.role === 'ADMIN') adminToken = data.token;
      if (r.role === 'FINANCE_MANAGER') managerToken = data.token;
      if (r.role === 'FINANCE') financeToken = data.token;
      if (r.role === 'SALES') salesToken = data.token;
    }
  });

  // =========================================================================
  // 1. CUSTOMER MANAGEMENT EDGE CASES
  // =========================================================================
  await t.test('1. Customer Management Edge Cases', async (suite) => {
    let testCustId;

    await suite.test('1.1 Missing mandatory fields -> 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ companyName: 'Only Company' }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /mandatory/i);
    });

    await suite.test('1.2 Invalid email format -> 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          companyName: 'Invalid Email Corp',
          contactPerson: 'Tester',
          email: 'not-an-email-format',
          phone: '+91 98765 43210',
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /invalid email/i);
    });

    await suite.test('1.3 Invalid phone number format -> 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          companyName: 'Invalid Phone Corp',
          contactPerson: 'Tester',
          email: 'phone@testcorp.com',
          phone: '123', // Too short
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /invalid phone/i);
    });

    await suite.test('1.4 Create valid baseline customer for duplicates and constraints', async () => {
      const res = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          companyName: 'Edge Case Testing Technologies Ltd',
          contactPerson: 'Deepak Rao',
          email: 'deepak.rao@edgetest.com',
          phone: '+91 91234 56789',
          creditLimit: 3000000,
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      testCustId = data.customer.id;
    });

    await suite.test('1.5 Duplicate customer email -> 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          companyName: 'Different Name Corp',
          contactPerson: 'Another Person',
          email: 'deepak.rao@edgetest.com', // Duplicate email
          phone: '+91 91111 22222',
        }),
      });
      assert.equal(res.status, 409);
      const data = await res.json();
      assert.match(data.message, /email address already exists/i);
    });

    await suite.test('1.6 Duplicate company name / records -> 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          companyName: 'Edge Case Testing Technologies Ltd', // Duplicate company name
          contactPerson: 'New Contact',
          email: 'newemail@different.com',
          phone: '+91 92222 33333',
        }),
      });
      assert.equal(res.status, 409);
      const data = await res.json();
      assert.match(data.message, /company name already exists/i);
    });

    await suite.test('1.7 Deleting customer with existing invoices is rejected -> 400 Bad Request', async () => {
      // Create an invoice for this customer
      const invRes = await fetch(`${baseUrl}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: testCustId,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          amount: 500000,
        }),
      });
      assert.equal(invRes.status, 201);

      // Attempt to delete customer
      const delRes = await fetch(`${baseUrl}/api/customers/${testCustId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      assert.equal(delRes.status, 400);
      const delData = await delRes.json();
      assert.match(delData.message, /cannot delete customer/i);
    });

    await suite.test('1.8 Accessing inactive customers -> Invoicing inactive customer blocked', async () => {
      // Toggle customer status to INACTIVE
      await fetch(`${baseUrl}/api/customers/${testCustId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${managerToken}` },
      });

      // Try creating new invoice for inactive customer
      const res = await fetch(`${baseUrl}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: testCustId,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          amount: 100000,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /inactive customer/i);

      // Restore active status for subsequent tests
      await fetch(`${baseUrl}/api/customers/${testCustId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${managerToken}` },
      });
    });

    // Cleanup customer after suite
    suite.after(async () => {
      if (testCustId) {
        await prisma.invoice.deleteMany({ where: { customerId: testCustId } });
        await prisma.creditProfile.deleteMany({ where: { customerId: testCustId } });
        await prisma.customer.delete({ where: { id: testCustId } }).catch(() => {});
      }
    });
  });

  // =========================================================================
  // 2. INVOICE MANAGEMENT EDGE CASES
  // =========================================================================
  await t.test('2. Invoice Management Edge Cases', async (suite) => {
    const cust = await prisma.customer.findFirst({ where: { status: 'ACTIVE' } });
    let invId;
    let invNum = `INV-EDGE-${Date.now().toString().slice(-6)}`;

    await suite.test('2.1 Zero or negative invoice amount -> 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          amount: 0,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /must be positive/i);

      const negRes = await fetch(`${baseUrl}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          amount: -50000,
        }),
      });
      assert.equal(negRes.status, 400);
    });

    await suite.test('2.2 Missing customer -> 404 Not Found', async () => {
      const res = await fetch(`${baseUrl}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: '00000000-0000-0000-0000-000000000000',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          amount: 50000,
        }),
      });
      assert.equal(res.status, 404);
    });

    await suite.test('2.3 Invalid due date (due date earlier than invoice date) -> 400 Bad Request', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 10 * 86400 * 1000);

      const res = await fetch(`${baseUrl}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          invoiceDate: now.toISOString(),
          dueDate: past.toISOString(), // Earlier than invoice date
          amount: 50000,
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /earlier than invoice date/i);
    });

    await suite.test('2.4 Create invoice with specific number and test duplicate -> 409 Conflict', async () => {
      const res1 = await fetch(`${baseUrl}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          invoiceNumber: invNum,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          amount: 250000,
        }),
      });
      assert.equal(res1.status, 201);
      const data1 = await res1.json();
      invId = data1.invoice.id;

      // Duplicate invoice number attempt
      const res2 = await fetch(`${baseUrl}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          invoiceNumber: invNum, // Duplicate number
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          amount: 100000,
        }),
      });
      assert.equal(res2.status, 409);
      const data2 = await res2.json();
      assert.match(data2.message, /already exists/i);
    });

    await suite.test('2.5 Editing an invoice after partial payment is rejected -> 400 Bad Request', async () => {
      // Allocate partial payment to invoice
      const payRes = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          paymentAmount: 100000,
          paymentDate: new Date().toISOString(),
          paymentMethod: 'NEFT',
          transactionReference: `REF-EDIT-TEST-${Date.now()}`,
          invoiceAllocations: [{ invoiceId: invId, amount: 100000 }],
        }),
      });
      assert.equal(payRes.status, 201);

      // Attempt to edit invoice after payment
      const editRes = await fetch(`${baseUrl}/api/invoices/${invId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ amount: 300000 }),
      });
      assert.equal(editRes.status, 400);
      const editData = await editRes.json();
      assert.match(editData.message, /existing payment allocations/i);
    });

    await suite.test('2.6 Cancelling an invoice with allocated payment is rejected -> 400 Bad Request', async () => {
      const cancelRes = await fetch(`${baseUrl}/api/invoices/${invId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      assert.equal(cancelRes.status, 400);
      const cancelData = await cancelRes.json();
      assert.match(cancelData.message, /allocated payments/i);
    });

    // Cleanup
    suite.after(async () => {
      if (invId) {
        await prisma.paymentAllocation.deleteMany({ where: { invoiceId: invId } });
        await prisma.invoice.delete({ where: { id: invId } }).catch(() => {});
      }
    });
  });

  // =========================================================================
  // 3. PAYMENT MANAGEMENT EDGE CASES
  // =========================================================================
  await t.test('3. Payment Management Edge Cases', async (suite) => {
    const cust = await prisma.customer.findFirst({ where: { status: 'ACTIVE' } });
    let inv1, inv2;

    // Create 2 test invoices
    suite.before(async () => {
      inv1 = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-PMT1-${Date.now()}`,
          customerId: cust.id,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 86400 * 1000),
          invoiceAmount: 200000,
          outstandingAmount: 200000,
          status: 'UNPAID',
        },
      });
      inv2 = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-PMT2-${Date.now()}`,
          customerId: cust.id,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 86400 * 1000),
          invoiceAmount: 300000,
          outstandingAmount: 300000,
          status: 'UNPAID',
        },
      });
    });

    await suite.test('3.1 Zero or negative payment -> 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          paymentAmount: 0,
          paymentDate: new Date().toISOString(),
          transactionReference: `REF-ZERO-${Date.now()}`,
        }),
      });
      assert.equal(res.status, 400);
    });

    await suite.test('3.2 Payment allocation greater than invoice balance -> 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          paymentAmount: 500000,
          paymentDate: new Date().toISOString(),
          transactionReference: `REF-EXCESS-${Date.now()}`,
          invoiceAllocations: [{ invoiceId: inv1.id, amount: 250000 }], // invoice balance is only 200,000!
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /exceeds outstanding balance/i);
    });

    await suite.test('3.3 One payment allocated across multiple invoices atomically', async () => {
      const res = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          paymentAmount: 350000,
          paymentDate: new Date().toISOString(),
          paymentMethod: 'RTGS',
          transactionReference: `REF-MULTI-${Date.now()}`,
          invoiceAllocations: [
            { invoiceId: inv1.id, amount: 150000 }, // Partial on inv1 (leaving 50,000)
            { invoiceId: inv2.id, amount: 200000 }, // Partial on inv2 (leaving 100,000)
          ],
        }),
      });
      assert.equal(res.status, 201);

      const check1 = await prisma.invoice.findUnique({ where: { id: inv1.id } });
      const check2 = await prisma.invoice.findUnique({ where: { id: inv2.id } });
      assert.equal(Number(check1.outstandingAmount), 50000);
      assert.equal(Number(check2.outstandingAmount), 100000);
    });

    await suite.test('3.4 Multiple payments against one invoice settling to full payment', async () => {
      // Second payment against inv1 for the remaining ₹50,000
      const res = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          paymentAmount: 50000,
          paymentDate: new Date().toISOString(),
          paymentMethod: 'IMPS',
          transactionReference: `REF-FULL-${Date.now()}`,
          invoiceAllocations: [{ invoiceId: inv1.id, amount: 50000 }],
        }),
      });
      assert.equal(res.status, 201);

      const check1 = await prisma.invoice.findUnique({ where: { id: inv1.id } });
      assert.equal(Number(check1.outstandingAmount), 0);
      assert.equal(Number(check1.paidAmount), 200000);
      assert.equal(check1.status, 'PAID');
    });

    await suite.test('3.5 Unallocated payments recording', async () => {
      const res = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({
          customerId: cust.id,
          paymentAmount: 1000000, // ₹10,00,000 advance payment
          paymentDate: new Date().toISOString(),
          paymentMethod: 'NEFT',
          transactionReference: `REF-UNALLOC-${Date.now()}`,
          invoiceAllocations: [], // No allocations
        }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.payment.status, 'UNALLOCATED');
      assert.equal(Number(data.payment.unallocatedAmount), 1000000);
    });

    // Cleanup
    suite.after(async () => {
      await prisma.paymentAllocation.deleteMany({ where: { invoiceId: { in: [inv1.id, inv2.id] } } });
      await prisma.invoice.deleteMany({ where: { id: { in: [inv1.id, inv2.id] } } });
    });
  });

  // =========================================================================
  // 4. CREDIT CALCULATION & UTILIZATION EDGE CASES
  // =========================================================================
  await t.test('4. Credit Calculation & Edge Cases', () => {
    // 4.1 Exactly 100% utilization
    const util100 = CreditExposureService.computeExposureMetrics({
      approvedLimit: 5000000,
      currentOutstanding: 5000000,
      newOrderAmount: 0,
    });
    assert.equal(util100.creditUtilizationPct, 100.0);
    assert.equal(util100.availableCredit, 0);
    assert.equal(util100.isExceeded, false);

    // 4.2 Greater than 100% utilization (Exceeded)
    const utilOver100 = CreditExposureService.computeExposureMetrics({
      approvedLimit: 5000000,
      currentOutstanding: 5500000,
      newOrderAmount: 500000,
    });
    assert.equal(utilOver100.creditUtilizationPct, 110.0);
    assert.equal(utilOver100.projectedExposure, 6000000);
    assert.equal(utilOver100.excessExposure, 1000000);
    assert.equal(utilOver100.isExceeded, true);

    // 4.3 Aging buckets categorization
    const now = new Date();
    const curInv = { dueDate: new Date(now.getTime() + 5 * 86400 * 1000), outstandingAmount: 100000 };
    const bucket1 = { dueDate: new Date(now.getTime() - 15 * 86400 * 1000), outstandingAmount: 200000 };
    const bucket2 = { dueDate: new Date(now.getTime() - 45 * 86400 * 1000), outstandingAmount: 300000 };
    const bucket3 = { dueDate: new Date(now.getTime() - 90 * 86400 * 1000), outstandingAmount: 400000 };

    const buckets = AgingService.categorizeInvoicesIntoBuckets([curInv, bucket1, bucket2, bucket3]);
    assert.equal(buckets.current, 100000, 'Current bucket must be 100,000');
    assert.equal(buckets.bucket1to30, 200000, '1-30d bucket must be 200,000');
    assert.equal(buckets.bucket31to60, 300000, '31-60d bucket must be 300,000');
    assert.equal(buckets.bucket60plus, 400000, '60+d bucket must be 400,000');
    assert.equal(buckets.totalOutstanding, 1000000, 'Total outstanding must be 1,000,000');
  });

  // =========================================================================
  // 5. APPROVAL MANAGEMENT EDGE CASES
  // =========================================================================
  await t.test('5. Approval Management Edge Cases', async (suite) => {
    const cust = await prisma.customer.findFirst({ where: { status: 'ACTIVE' } });
    let reqId;

    suite.before(async () => {
      const r = await prisma.creditRequest.create({
        data: {
          requestNumber: `CR-EDGE-${Date.now()}`,
          customerId: cust.id,
          currentLimit: 1000000,
          requestedLimit: 2000000,
          additionalAmount: 1000000,
          currentExposure: 200000,
          projectedExposure: 1200000,
          businessJustification: 'Test justification',
          validityPeriod: new Date(Date.now() + 30 * 86400 * 1000),
          status: 'PENDING',
        },
      });
      reqId = r.id;
    });

    await suite.test('5.1 Sales user attempting approval is FORBIDDEN -> 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/approvals/${reqId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${salesToken}` },
        body: JSON.stringify({ comment: 'Sales trying to approve' }),
      });
      assert.equal(res.status, 403);
    });

    await suite.test('5.2 Manager approves request successfully', async () => {
      const res = await fetch(`${baseUrl}/api/approvals/${reqId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ comment: 'Legitimate manager approval' }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.creditRequest.status, 'APPROVED');
    });

    await suite.test('5.3 Duplicate approval attempt on already approved request -> 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/approvals/${reqId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ comment: 'Second approval attempt' }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /Cannot approve request with status/i);
    });

    await suite.test('5.4 Expired credit limit request approval attempt -> 400 Bad Request', async () => {
      const expiredReq = await prisma.creditRequest.create({
        data: {
          requestNumber: `CR-EXP-${Date.now()}`,
          customerId: cust.id,
          currentLimit: 1000000,
          requestedLimit: 2000000,
          additionalAmount: 1000000,
          currentExposure: 200000,
          projectedExposure: 1200000,
          businessJustification: 'Expired test',
          validityPeriod: new Date(Date.now() - 5 * 86400 * 1000), // 5 days ago!
          status: 'PENDING',
        },
      });

      const res = await fetch(`${baseUrl}/api/approvals/${expiredReq.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ comment: 'Trying to approve expired request' }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /EXPIRED/i);

      await prisma.creditRequest.delete({ where: { id: expiredReq.id } });
    });

    suite.after(async () => {
      await prisma.approvalRecord.deleteMany({ where: { creditRequestId: reqId } });
      await prisma.creditRequest.delete({ where: { id: reqId } }).catch(() => {});
    });
  });

  // =========================================================================
  // 6. RISK SCORING CONFIGURATION & EVALUATION
  // =========================================================================
  await t.test('6. Risk Scoring Engine Test', async () => {
    // Test risk categorizations: Low <= 20, Medium 21-50, High > 50
    assert.equal(RiskScoringService.getRiskCategoryFromScore(15), 'LOW');
    assert.equal(RiskScoringService.getRiskCategoryFromScore(35), 'MEDIUM');
    assert.equal(RiskScoringService.getRiskCategoryFromScore(75), 'HIGH');
  });

  // =========================================================================
  // 7. SECURITY & JWT TOKEN DEFENSE
  // =========================================================================
  await t.test('7. Security & Token Verification', async (suite) => {
    await suite.test('7.1 Expired JWT returns 401 Unauthorized', async () => {
      // Craft an expired JWT token
      const expiredToken = jwt.sign(
        { id: 'some-user-id', role: 'ADMIN' },
        process.env.JWT_SECRET || 'creditguard_super_secure_jwt_secret_key_2026_enterprise_finance',
        { expiresIn: '-1s' }
      );

      const res = await fetch(`${baseUrl}/api/customers`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.message, /expired/i);
    });

    await suite.test('7.2 Sensitive fields (passwordHash) never returned in API responses', async () => {
      const res = await fetch(`${baseUrl}/api/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      for (const u of data.users) {
        assert.equal(u.passwordHash, undefined, 'passwordHash must NEVER be exposed');
      }
    });
  });

});
