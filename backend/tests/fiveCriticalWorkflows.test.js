import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

test('CREDITGUARD 5 Critical Business Workflows E2E Verification', async (t) => {
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

  // Tokens for roles
  let adminToken;
  let managerToken;
  let salesToken;

  await t.test('PREP: Login users for testing', async () => {
    // Admin login
    const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@creditguard.com', password: 'demo1234' }),
    });
    const adminData = await adminRes.json();
    adminToken = adminData.token;

    // Finance Manager login
    const mgrRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@creditguard.com', password: 'demo1234' }),
    });
    const mgrData = await mgrRes.json();
    managerToken = mgrData.token;

    // Sales login
    const salesRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sales@creditguard.com', password: 'demo1234' }),
    });
    const salesData = await salesRes.json();
    salesToken = salesData.token;

    assert.ok(adminToken && managerToken && salesToken, 'All auth tokens acquired');
  });

  let testCustomerId;
  let testInvoiceId;

  // ========================================================
  // WORKFLOW 1: CUSTOMER MANAGEMENT (ADD, EDIT, DELETE)
  // ========================================================
  await t.test('WORKFLOW 1: Customer Management (Add, Edit, Delete)', async (w1) => {
    // 1A. ADD Customer
    await w1.test('1A: Add Customer', async () => {
      const uniqueCode = `CUS-TEST-${Date.now().toString().slice(-4)}`;
      const res = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          companyName: 'Apex Innovations Pvt Ltd',
          contactPerson: 'Arun Nair',
          email: `arun.${Date.now()}@apexinnovations.in`,
          phone: '+91 98888 77777',
          businessCategory: 'Technology',
          creditLimit: 2000000,
          paymentTerms: 'Net 30',
          city: 'Hyderabad',
          address: 'HITEC City, Hyderabad',
          gstNo: '36AAAAA1234A1Z5',
        }),
      });

      assert.equal(res.status, 201, 'Adding customer must return 201 Created');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.customer.id, 'Customer must have ID');
      testCustomerId = data.customer.id;
    });

    // 1B. EDIT Customer
    await w1.test('1B: Edit Customer', async () => {
      const res = await fetch(`${baseUrl}/api/customers/${testCustomerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          companyName: 'Apex Global Innovations Pvt Ltd',
          contactPerson: 'Arun K. Nair',
          email: 'arun.nair@apexglobal.in',
          phone: '+91 98888 77777',
          businessCategory: 'Technology',
          city: 'Hyderabad',
          address: 'Mindspace IT Park, Hyderabad',
          gstNo: '36AAAAA1234A1Z5',
        }),
      });

      assert.equal(res.status, 200, 'Editing customer must return 200 OK');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.customer.companyName, 'Apex Global Innovations Pvt Ltd');
      assert.equal(data.customer.contactPerson, 'Arun K. Nair');
    });

    // 1C. DELETE Customer (Add temporary customer and delete them)
    await w1.test('1C: Delete Customer', async () => {
      // Create a temporary customer to test clean deletion
      const tempRes = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          companyName: 'Temporary Delete Test Ltd',
          contactPerson: 'Temp Person',
          email: `temp.${Date.now()}@temp.in`,
          phone: '+91 99999 11111',
          businessCategory: 'Trading',
          creditLimit: 500000,
          paymentTerms: 'Net 15',
          city: 'Pune',
        }),
      });
      const tempData = await tempRes.json();
      const tempId = tempData.customer.id;

      // Delete the customer
      const delRes = await fetch(`${baseUrl}/api/customers/${tempId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${managerToken}` },
      });

      assert.equal(delRes.status, 200, 'Deleting customer must return 200 OK');
      const delData = await delRes.json();
      assert.equal(delData.success, true);

      // Verify deletion from database
      const verify = await prisma.customer.findUnique({ where: { id: tempId } });
      assert.equal(verify, null, 'Customer should no longer exist in database');
    });
  });

  // ========================================================
  // WORKFLOW 2: INVOICE MANAGEMENT (CREATE INVOICE)
  // ========================================================
  await t.test('WORKFLOW 2: Invoice Management (Create Invoice for Customer)', async () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const res = await fetch(`${baseUrl}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        invoiceDate: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
        amount: 800000, // ₹8,00,000
      }),
    });

    assert.equal(res.status, 201, 'Creating invoice must return 201 Created');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(Number(data.invoice.invoiceAmount), 800000);
    assert.equal(Number(data.invoice.outstandingAmount), 800000);
    assert.equal(Number(data.invoice.paidAmount), 0);
    testInvoiceId = data.invoice.id;
  });

  // ========================================================
  // WORKFLOW 3: PAYMENT MANAGEMENT (RECORD PARTIAL PAYMENT)
  // ========================================================
  await t.test('WORKFLOW 3: Payment Management (Record Partial Payment of ₹300,000)', async () => {
    const txRef = `NEFT-TEST-${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        customerId: testCustomerId,
        paymentAmount: 300000, // ₹3,00,000 partial payment
        paymentDate: new Date().toISOString(),
        paymentMethod: 'NEFT',
        transactionReference: txRef,
        invoiceAllocations: [
          { invoiceId: testInvoiceId, amount: 300000 },
        ],
      }),
    });

    assert.equal(res.status, 201, 'Recording payment must return 201 Created');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(Number(data.payment.paymentAmount), 300000);
    assert.equal(Number(data.payment.allocatedAmount), 300000);
    assert.equal(data.payment.status, 'ALLOCATED');

    // Verify invoice was updated
    const updatedInv = await prisma.invoice.findUnique({ where: { id: testInvoiceId } });
    assert.equal(Number(updatedInv.paidAmount), 300000, 'Paid amount must be ₹300,000');
    assert.equal(Number(updatedInv.outstandingAmount), 500000, 'Remaining outstanding must be ₹500,000');
  });

  // ========================================================
  // WORKFLOW 4: CREDIT CALCULATION (AUTOMATIC EXPOSURE UPDATE)
  // ========================================================
  await t.test('WORKFLOW 4: Credit Calculation (Auto-Update Outstanding and Available Credit)', async () => {
    const res = await fetch(`${baseUrl}/api/credit-profiles/${testCustomerId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);

    const profile = data.profile || data.creditProfile;
    // Approved limit was ₹2,000,000. Invoice was ₹800,000. Paid was ₹300,000.
    // Remaining Outstanding = ₹500,000. Available Credit = ₹2,000,000 - ₹500,000 = ₹1,500,000.
    assert.equal(Number(profile.approvedCreditLimit), 2000000);
    assert.equal(Number(profile.currentExposure), 500000, 'Outstanding exposure must auto-update to ₹500,000');
    assert.equal(Number(profile.availableCredit), 1500000, 'Available credit must auto-update to ₹1,500,000');
  });

  // ========================================================
  // WORKFLOW 5: APPROVAL MANAGEMENT (SUBMIT & APPROVE/REJECT)
  // ========================================================
  await t.test('WORKFLOW 5: Approval Management (Submit Credit Request & Approve using Manager)', async (w5) => {
    let requestId;

    // 5A: Submit Credit Request
    await w5.test('5A: Submit Credit Limit Increase Request', async () => {
      const validityDate = new Date();
      validityDate.setDate(validityDate.getDate() + 45);

      const res = await fetch(`${baseUrl}/api/credit-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${salesToken}`, // Submitted by Sales
        },
        body: JSON.stringify({
          customerId: testCustomerId,
          additionalAmount: 1000000, // Request additional ₹10,00,000
          businessJustification: 'Customer order volume surged by 50% for Q4 shipments.',
          validityPeriod: validityDate.toISOString(),
        }),
      });

      assert.equal(res.status, 201, 'Credit request submission must return 201 Created');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.creditRequest.id);
      requestId = data.creditRequest.id;
    });

    // 5B: Manager Approves the Request
    await w5.test('5B: Finance Manager Approves Request', async () => {
      const res = await fetch(`${baseUrl}/api/approvals/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`, // Approved by Finance Manager
        },
        body: JSON.stringify({
          comment: 'Approved based on solid financials and 25% current utilization.',
        }),
      });

      assert.equal(res.status, 200, 'Approval must return 200 OK');
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.creditRequest.status, 'APPROVED');

      // Verify credit limit increased from ₹2,000,000 to ₹3,000,000
      const updatedProfile = await prisma.creditProfile.findUnique({
        where: { customerId: testCustomerId },
      });
      assert.equal(Number(updatedProfile.approvedCreditLimit), 3000000, 'New limit must be ₹3,000,000');
      // Available credit is now ₹3,000,000 - ₹500,000 = ₹2,500,000
      assert.equal(Number(updatedProfile.availableCredit), 2500000, 'Available credit must be ₹2,500,000');
    });

    // 5C: Submit another request and Reject it
    await w5.test('5C: Submit and Reject second request', async () => {
      const validityDate = new Date();
      validityDate.setDate(validityDate.getDate() + 30);

      const submitRes = await fetch(`${baseUrl}/api/credit-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${salesToken}`,
        },
        body: JSON.stringify({
          customerId: testCustomerId,
          additionalAmount: 5000000,
          businessJustification: 'Excessive expansion request',
          validityPeriod: validityDate.toISOString(),
        }),
      });
      const submitData = await submitRes.json();
      const secondReqId = submitData.creditRequest.id;

      // Manager Rejects Request
      const rejectRes = await fetch(`${baseUrl}/api/approvals/${secondReqId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          reason: 'Additional ₹50L exceeds company risk tolerance threshold.',
        }),
      });

      assert.equal(rejectRes.status, 200, 'Rejecting request must return 200 OK');
      const rejectData = await rejectRes.json();
      assert.equal(rejectData.success, true);
      assert.equal(rejectData.creditRequest.status, 'REJECTED');
    });
  });

  // Cleanup test customer and financial data
  t.after(async () => {
    if (testCustomerId) {
      await prisma.paymentAllocation.deleteMany({ where: { invoice: { customerId: testCustomerId } } });
      await prisma.approvalRecord.deleteMany({ where: { creditRequest: { customerId: testCustomerId } } });
      await prisma.creditRequest.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.invoice.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.payment.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.creditAlert.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.creditLimitHistory.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.riskAssessment.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.creditProfile.deleteMany({ where: { customerId: testCustomerId } });
      await prisma.customer.delete({ where: { id: testCustomerId } }).catch(() => {});
    }
  });
});
