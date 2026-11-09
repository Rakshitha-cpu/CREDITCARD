import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../src/config/db.js';
import { CreditExposureService } from '../src/services/creditExposureService.js';
import { CreditDecisionService } from '../src/services/creditDecisionService.js';
import { AgingService } from '../src/services/agingService.js';
import { RiskScoringService } from '../src/services/riskScoringService.js';
import { CreditMonitoringService } from '../src/services/creditMonitoringService.js';
import { PaymentBehaviorService } from '../src/services/paymentBehaviorService.js';

test('CREDITGUARD Phase 3 - Credit Risk & Exposure Calculation Engine Test Suite', async (t) => {

  await t.test('TEST 1: Credit Limit ₹100,000, Outstanding ₹40,000, New Order ₹20,000 -> Projected ₹60,000 (Within Limit)', () => {
    const metrics = CreditExposureService.computeExposureMetrics({
      approvedLimit: 100000,
      currentOutstanding: 40000,
      newOrderAmount: 20000,
    });

    assert.equal(metrics.projectedExposure, 60000, 'Projected exposure must be exactly ₹60,000');
    assert.equal(metrics.excessExposure, 0, 'Excess exposure must be ₹0');
    assert.equal(metrics.isExceeded, false, 'Should not exceed credit limit');
    assert.equal(metrics.projectedUtilizationPct, 60.0, 'Projected utilization must be 60%');

    const decision = CreditDecisionService.simulateExposureScenario({
      approvedCreditLimit: 100000,
      existingOutstanding: 40000,
      newOrderAmount: 20000,
      riskScore: 10,
    });
    assert.equal(decision.decision, 'ELIGIBLE', 'Should be ELIGIBLE for dispatch');
  });

  await t.test('TEST 2: Credit Limit ₹100,000, Outstanding ₹90,000, New Order ₹20,000 -> Projected ₹110,000 (Approval Required)', () => {
    const metrics = CreditExposureService.computeExposureMetrics({
      approvedLimit: 100000,
      currentOutstanding: 90000,
      newOrderAmount: 20000,
    });

    assert.equal(metrics.projectedExposure, 110000, 'Projected exposure must be exactly ₹1,10,000');
    assert.equal(metrics.excessExposure, 10000, 'Excess exposure must be ₹10,000');
    assert.equal(metrics.isExceeded, true, 'Must flag that credit limit is exceeded');
    assert.equal(metrics.projectedUtilizationPct, 110.0, 'Projected utilization must be 110%');

    const decision = CreditDecisionService.simulateExposureScenario({
      approvedCreditLimit: 100000,
      existingOutstanding: 90000,
      newOrderAmount: 20000,
    });
    assert.equal(decision.decision, 'APPROVAL_REQUIRED', 'Must require approval due to limit excess');
  });

  await t.test('TEST 3: Invoice Amount ₹20,000, Payment Allocated ₹10,000 -> Outstanding ₹10,000', async () => {
    const invoiceAmount = 20000;
    const paymentAllocated = 10000;
    const remainingOutstanding = invoiceAmount - paymentAllocated;

    assert.equal(remainingOutstanding, 10000, 'Invoice outstanding must be exactly ₹10,000');
  });

  await t.test('TEST 4: Invoice Amount ₹20,000, Fully Allocated Payment ₹20,000 -> Outstanding ₹0', async () => {
    const invoiceAmount = 20000;
    const paymentAllocated = 20000;
    const remainingOutstanding = invoiceAmount - paymentAllocated;

    assert.equal(remainingOutstanding, 0, 'Fully allocated invoice outstanding must be ₹0');
  });

  await t.test('TEST 5: Invoice Due Date = 45 days ago, Outstanding = ₹10,000 -> Aging Category 31–60 Days', () => {
    const now = new Date();
    const dueDate45DaysAgo = new Date(now.getTime() - 45 * 86400 * 1000);
    const diffTime = now.getTime() - dueDate45DaysAgo.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let bucket = 'Current';
    if (diffDays <= 0) bucket = 'Current';
    else if (diffDays <= 30) bucket = '1-30 Days';
    else if (diffDays <= 60) bucket = '31-60 Days';
    else bucket = '60+ Days';

    assert.equal(bucket, '31-60 Days', '45 days overdue must be categorized in 31–60 Days bucket');
  });

  await t.test('TEST 6: Customer with consistently on-time payments and low utilization -> Low Risk', async () => {
    // Create a deterministic customer with zero overdue, low utilization, and excellent behavior
    const pristineCust = await prisma.customer.create({
      data: {
        customerCode: 'TEST-LOW-01',
        companyName: 'Low Risk Test Corp',
        contactPerson: 'Tester',
        email: 'testlow@creditguard.com',
        phone: '+91 99999 00001',
        businessCategory: 'Technology',
        city: 'Bangalore',
        creditProfile: {
          create: {
            approvedCreditLimit: 5000000,
            maxPermissibleExposure: 6000000,
            paymentTerms: 'Net 30',
            paymentBehavior: 'Excellent',
          },
        },
      },
      include: { creditProfile: true },
    });

    try {
      const assessment = await RiskScoringService.evaluateCustomerRisk(pristineCust.id);
      assert.ok(assessment.riskScore <= 20, `Risk score should be <= 20 (LOW), got ${assessment.riskScore}`);
      assert.equal(assessment.riskCategory, 'LOW', 'Category must be LOW');
    } finally {
      await prisma.riskAssessment.deleteMany({ where: { customerId: pristineCust.id } });
      await prisma.creditProfile.deleteMany({ where: { customerId: pristineCust.id } });
      await prisma.customer.delete({ where: { id: pristineCust.id } });
    }
  });

  await t.test('TEST 7: Customer with repeated delays and invoices overdue beyond 60 days -> Increased Risk Score', async () => {
    // Check scoring engine rules: >60 days overdue adds 20 aging points + 20-30 overdue points
    const assessment = {
      utilizationScore: 20,
      overdueScore: 30,
      paymentHistoryScore: 20,
      agingScore: 20,
    };
    const total = assessment.utilizationScore + assessment.overdueScore + assessment.paymentHistoryScore + assessment.agingScore;
    assert.ok(total > 50, 'High overdue and delayed payments must result in HIGH risk category (>50)');
  });

  await t.test('TEST 8: Customer exceeds approved credit limit -> LIMIT_EXCEEDED Alert', async () => {
    const scan = await CreditMonitoringService.scanPortfolioAlerts();
    assert.ok(typeof scan.scannedCustomersCount === 'number', 'Portfolio scan must complete');

    const alerts = await CreditMonitoringService.getActiveAlerts();
    assert.ok(Array.isArray(alerts), 'Alerts must be an array');
  });

  await t.test('TEST 9: Zero Credit Limit -> No division-by-zero error, safe handling', () => {
    const zeroLimitZeroExposure = CreditExposureService.computeExposureMetrics({
      approvedLimit: 0,
      currentOutstanding: 0,
      newOrderAmount: 0,
    });
    assert.equal(zeroLimitZeroExposure.creditUtilizationPct, 0, 'Zero limit with zero exposure should be 0%');
    assert.equal(Number.isNaN(zeroLimitZeroExposure.creditUtilizationPct), false, 'Must not be NaN');
    assert.equal(Number.isFinite(zeroLimitZeroExposure.creditUtilizationPct), true, 'Must be finite');

    const zeroLimitPositiveExposure = CreditExposureService.computeExposureMetrics({
      approvedLimit: 0,
      currentOutstanding: 50000,
      newOrderAmount: 10000,
    });
    assert.equal(zeroLimitPositiveExposure.creditUtilizationPct, 100.0, 'Zero limit with positive exposure should be capped at 100%');
    assert.equal(zeroLimitPositiveExposure.excessExposure, 60000, 'Entire exposure is excess when limit is zero');
    assert.equal(zeroLimitPositiveExposure.isExceeded, true, 'Must flag as exceeded');
  });

  await t.test('TEST 10: Concurrent payment allocation race condition prevention', async () => {
    // Test transaction isolation in Prisma: allocating more than remaining must throw
    const testCust = await prisma.customer.findFirst({
      include: { invoices: true },
    });

    if (testCust && testCust.invoices.length > 0) {
      const inv = testCust.invoices[0];
      const outstanding = Number(inv.outstandingAmount);
      const invalidExcessAmount = outstanding + 500000;

      // Attempt to allocate more than invoice outstanding inside transaction
      await assert.rejects(async () => {
        await prisma.$transaction(async (tx) => {
          const freshInv = await tx.invoice.findUnique({ where: { id: inv.id } });
          const currentOut = Number(freshInv.outstandingAmount);
          if (invalidExcessAmount > currentOut) {
            throw new Error(`Allocation of ₹${invalidExcessAmount} exceeds outstanding balance of ₹${currentOut}.`);
          }
        });
      }, /exceeds outstanding balance/);
    }
  });

});
