import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import jwt from 'jsonwebtoken';

test('CREDITGUARD Phase 4 - Security, RBAC & Integration Test Suite', async (t) => {
  let server;
  let baseUrl;

  // Spin up an ephemeral HTTP server on port 0 for clean test requests
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
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

  // ----------------------------------------------------
  // SECTION 1: AUTHENTICATION & TOKEN VERIFICATION
  // ----------------------------------------------------
  await t.test('AUTH 1: Successful login with valid credentials returns JWT and user payload', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@creditguard.com', password: 'demo1234' }),
    });

    assert.equal(res.status, 200, 'Admin login must return 200 OK');
    const data = await res.json();
    assert.equal(data.success, true, 'Success flag must be true');
    assert.ok(data.token, 'Must return a valid JWT token');
    assert.equal(data.user.email, 'admin@creditguard.com', 'User email must match');
    assert.equal(data.user.role, 'ADMIN', 'User role must be ADMIN');
    assert.equal(data.user.passwordHash, undefined, 'passwordHash must NEVER be exposed');

    adminToken = data.token;
  });

  await t.test('AUTH 2: Login with incorrect password returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@creditguard.com', password: 'wrongPassword123' }),
    });

    assert.equal(res.status, 401, 'Invalid password must return 401');
    const data = await res.json();
    assert.equal(data.success, false);
  });

  await t.test('AUTH 3: Login with non-existent email returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@creditguard.com', password: 'demo1234' }),
    });

    assert.equal(res.status, 401, 'Non-existent account must return 401');
    const data = await res.json();
    assert.equal(data.success, false);
  });

  await t.test('AUTH 4: Protected endpoint /api/auth/me rejects missing or invalid Bearer token', async () => {
    const noTokenRes = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(noTokenRes.status, 401, 'Missing token must return 401');

    const badTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert.equal(badTokenRes.status, 401, 'Invalid token must return 401');
  });

  await t.test('AUTH 5: Acquire session tokens for all standard business roles', async () => {
    const roles = [
      { email: 'manager@creditguard.com', role: 'FINANCE_MANAGER' },
      { email: 'sales@creditguard.com', role: 'SALES' },
      { email: 'finance@creditguard.com', role: 'FINANCE' },
    ];

    for (const r of roles) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: r.email, password: 'demo1234' }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      if (r.role === 'FINANCE_MANAGER') managerToken = data.token;
      if (r.role === 'SALES') salesToken = data.token;
      if (r.role === 'FINANCE') financeToken = data.token;
    }

    assert.ok(managerToken && salesToken && financeToken, 'All role tokens acquired');
  });

  // ----------------------------------------------------
  // SECTION 2: RBAC ENFORCEMENT & ACCESS RESTRICTIONS
  // ----------------------------------------------------
  await t.test('RBAC 1: SALES role is FORBIDDEN (403) from approving or rejecting credit requests', async () => {
    const res = await fetch(`${baseUrl}/api/approvals/some-dummy-id/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesToken}`,
      },
      body: JSON.stringify({ comment: 'Unauthorized approval attempt' }),
    });

    assert.equal(res.status, 403, 'SALES role must receive 403 Forbidden for approvals');
  });

  await t.test('RBAC 2: FINANCE role is FORBIDDEN (403) from creating administrative users', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${financeToken}`,
      },
      body: JSON.stringify({
        email: 'hacker@test.com',
        name: 'Hacker',
        role: 'ADMIN',
        password: 'password123',
      }),
    });

    assert.equal(res.status, 403, 'FINANCE role must receive 403 Forbidden for user management');
  });

  await t.test('RBAC 3: Self-approval prevention - Manager cannot approve their own credit request', async () => {
    // Look up manager's user record
    const managerUser = await prisma.user.findUnique({
      where: { email: 'manager@creditguard.com' },
    });
    const customer = await prisma.customer.findFirst();

    // Create a credit request submitted by manager
    const selfRequest = await prisma.creditRequest.create({
      data: {
        requestNumber: `REQ-SELF-${Date.now()}`,
        customerId: customer.id,
        currentLimit: 1000000,
        requestedLimit: 2000000,
        additionalAmount: 1000000,
        currentExposure: 500000,
        projectedExposure: 1500000,
        businessJustification: 'Self request test',
        validityPeriod: new Date(Date.now() + 30 * 86400 * 1000),
        status: 'PENDING',
        submittedById: managerUser.id,
      },
    });

    try {
      const res = await fetch(`${baseUrl}/api/approvals/${selfRequest.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({ comment: 'Self approving should fail' }),
      });

      // Must be rejected (either 400 or 403)
      assert.ok(
        res.status === 400 || res.status === 403,
        `Self-approval must be rejected with 400 or 403, got ${res.status}`
      );
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /Self-approval is strictly forbidden/i);
    } finally {
      await prisma.creditRequest.delete({ where: { id: selfRequest.id } });
    }
  });

  // ----------------------------------------------------
  // SECTION 3: SECURITY HEADERS & DEFENSE
  // ----------------------------------------------------
  await t.test('SEC 1: Helmet security headers present on responses', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    const headers = res.headers;
    assert.ok(headers.get('x-dns-prefetch-control') !== null, 'X-DNS-Prefetch-Control header should be set');
    assert.ok(headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options must be nosniff');
    assert.ok(headers.get('x-frame-options') !== null, 'X-Frame-Options should be set');
  });

  // ----------------------------------------------------
  // SECTION 4: FINANCIAL INTEGRITY & AUDIT TRAIL
  // ----------------------------------------------------
  await t.test('FIN 1: Pre-check simulator returns projected utilization and credit decision', async () => {
    const res = await fetch(`${baseUrl}/api/credit-requests/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesToken}`,
      },
      body: JSON.stringify({
        approvedCreditLimit: 5000000,
        existingOutstanding: 2000000,
        newOrderAmount: 1000000,
        riskScore: 25,
      }),
    });

    assert.equal(res.status, 200, 'Simulator endpoint must return 200');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.simulation.projectedExposure, 3000000);
    assert.equal(data.simulation.projectedUtilization, 60.0);
    assert.equal(data.simulation.decision, 'ELIGIBLE');
  });

  await t.test('FIN 2: Financial Audit Log persistence on administrative actions', async () => {
    // Query audit logs using ADMIN token
    const res = await fetch(`${baseUrl}/api/audit-logs?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200, 'Audit log endpoint must return 200 for ADMIN');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.logs), 'Audit logs must return a list of logs');
  });

});
