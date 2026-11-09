# CREDITGUARD 🛡️
### Customer Credit Limit & Payment Risk Management Platform

An enterprise-grade B2B credit risk and exposure calculation platform built for distribution networks, manufacturing corporations, and commercial finance organizations. CREDITGUARD safeguards cash flow by automating credit limit management, exposure tracking, invoice aging, payment allocations, multi-factor risk scoring, and multi-tier approval workflows.

---

## 🏛️ System Architecture

CREDITGUARD is architected as a modular, high-integrity full-stack financial system:

```
creditguard/
├── src/                          # React 18 + Vite Frontend Application
│   ├── components/               # Enterprise UI Components & Metric Cards
│   ├── context/                  # AppContext & JWT Auth Session Management
│   ├── layouts/                  # AppLayout, Sidebar & Header Navigation
│   ├── pages/                    # 14 Full Enterprise Dashboards & Modules
│   └── services/                 # Axios HTTP client with Bearer Interceptors
├── backend/                      # Node.js + Express + Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma         # Relational schema with composite indexes
│   │   └── seed.js               # Demo dataset (Users, Invoices, Payments)
│   ├── src/
│   │   ├── config/               # Prisma client singleton
│   │   ├── controllers/          # Modular API request handlers
│   │   ├── middleware/           # JWT Auth, RBAC guards, Rate Limiters, Helmet
│   │   ├── routes/               # Modular Express REST routing
│   │   ├── services/             # Core Financial & Credit Risk Engines
│   │   │   ├── creditExposureService.js
│   │   │   ├── creditDecisionService.js
│   │   │   ├── agingService.js
│   │   │   ├── riskScoringService.js
│   │   │   ├── paymentBehaviorService.js
│   │   │   ├── creditMonitoringService.js
│   │   │   └── auditService.js
│   │   └── server.js             # HTTP server with graceful shutdown
│   └── tests/                    # Automated Node.js native test suites
│       ├── creditRiskEngine.test.js       # Phase 3 Core Financial Calculations
│       ├── securityAndIntegration.test.js # Phase 4 Security & RBAC Guards
│       ├── fiveCriticalWorkflows.test.js  # Phase 4 Critical Business Workflows
│       └── advancedEdgeCases.test.js      # Phase 5 Advanced Edge-Case & Stress Suite
```

---

## 🔐 Security & Access Control (RBAC)

CREDITGUARD implements defense-in-depth security:
- **Authentication**: JWT token issued upon secure `bcrypt` credential verification with configurable token expiration (`24h`).
- **HTTP Security Headers**: `helmet` enabled (strict transport security, DNS prefetch control, frameguard, XSS protection).
- **Rate Limiting**: `express-rate-limit` enforces 30 requests/15m on authentication endpoints to prevent brute-force attacks, and 1000 requests/15m globally.
- **Role-Based Access Control (RBAC)**:
  - `ADMIN`: Full access to settings, user management, audit trails, and system-wide overrides.
  - `FINANCE_MANAGER`: Credit request approvals/rejections, credit holds, risk reassessment. **Self-approval is strictly forbidden** (`submittedById !== req.user.id`).
  - `FINANCE`: Invoice creation, payment recording and invoice allocation, aging bucket analysis.
  - `SALES`: Customer onboarding, credit limit request submissions, pre-check simulator. Blocked (403 Forbidden) from financial approvals and administrative actions.
- **Audit Trails**: Every credit limit modification, approval, rejection, and payment allocation is permanently persisted in the `AuditLog` table.

---

## 📊 Core Calculation Engine Specifications

1. **Credit Exposure Service**:
   - `Current Outstanding` = $\sum(\text{Invoice Amount} - \text{Paid Amount})$ for all unpaid/overdue invoices.
   - `Available Credit` = $\max(0, \text{Approved Credit Limit} - \text{Current Outstanding})$.
   - `Credit Utilization %` = $(\text{Current Outstanding} / \text{Approved Credit Limit}) \times 100$.
   - Zero-division protected with finite bounds.
2. **Dynamic Aging Buckets**:
   - Computes elapsed calendar days: $\text{Overdue Days} = \text{Current Date} - \text{Invoice Due Date}$.
   - Buckets: `Current` ($\le 0$ days), `1–30 Days`, `31–60 Days`, `60+ Days`.
3. **Multi-Factor Risk Scoring Engine (0–100 Capped)**:
   - **Credit Utilization (Max 30 pts)**: $>90\% \to 30$, $75-90\% \to 20$, $50-75\% \to 10$, $<50\% \to 0$.
   - **Overdue Amount (Max 30 pts)**: $>30\%$ of limit or $>₹5\text{L} \to 30$, $>10\%$ of limit or $>₹1\text{L} \to 20$, $>₹0 \to 10$, $₹0 \to 0$.
   - **Payment History (Max 20 pts)**: Evaluated from historical on-time settlement percentages (`POOR`: 20, `MODERATE`: 10, `GOOD`: 5, `EXCELLENT`: 0).
   - **Aging Bracket (Max 20 pts)**: Overdue $>60$ days $\to 20$, $31-60$ days $\to 10$, $1-30$ days $\to 5$, Current $\to 0$.
   - **Risk Categories**: `LOW` ($\le 20$), `MEDIUM` ($21–50$), `HIGH` ($>50$).
4. **Credit Pre-Check Simulator**:
   - Evaluates real-time order eligibility: `ELIGIBLE`, `WARNING`, `APPROVAL_REQUIRED`, or `CREDIT_BLOCKED`.

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: 14+ (or hosted PostgreSQL like Neon/Supabase/ElephantSQL)

### 2. Database & Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL DATABASE_URL

# Generate Prisma Client & Push Database Schema
npm run prisma:generate
npm run prisma:push

# Seed Demo Database (15 Customers, 30 Invoices, 20 Payments, 4 Users)
npm run prisma:seed

# Start the Backend Server (Runs on port 5000)
npm run dev
```

### 3. Frontend Setup
```bash
# In the project root directory
npm install

# Start Vite Development Server (Runs on http://localhost:5173)
npm run dev
```

### 4. Demo Login Credentials
| Role | Email | Password |
|---|---|---|
| **System Admin** | `admin@creditguard.com` | `demo1234` |
| **Finance Manager** | `manager@creditguard.com` | `demo1234` |
| **Finance Executive** | `finance@creditguard.com` | `demo1234` |
| **Sales Analyst** | `sales@creditguard.com` | `demo1234` |

---

## 🧪 Automated Testing & Financial Validation (70/70 Tests Passed)

CREDITGUARD comes with 4 automated test suites covering financial calculations, edge conditions, security controls, RBAC, and all 5 core business workflows:

```bash
cd backend
npm test
```

### Complete Test Suites Overview (100% Pass Rate):
1. **`tests/fiveCriticalWorkflows.test.js` (13/13 Passed)**:
   - **Customer Lifecycle**: Add new customer, edit company profile, delete customer safely.
   - **Invoice Generation**: Auto-sequential invoice numbers, balance tracking, customer relationship integrity.
   - **Payment Recording**: Atomic partial payments, balance deduction, customer credit balance sync.
   - **Real-Time Credit Calculation**: Auto-recalculated outstanding balance, available credit, and credit utilization.
   - **Approval Management**: Credit limit increase request submission, Finance Manager approval/rejection, balance updates.

2. **`tests/advancedEdgeCases.test.js` (34/34 Passed)**:
   - **Customer Edge Cases**: Duplicate email (409), duplicate company name (409), invalid email format (400), invalid phone number (400), missing mandatory fields (400), cascade deletion rejection with active invoices (400), invoicing blocked for inactive customers (400).
   - **Invoice Edge Cases**: Zero/negative amount rejection (400), missing customer (404), due date earlier than invoice date (400), duplicate invoice number collision (409), editing blocked after partial payment (400), cancellation blocked after payment allocation (400).
   - **Payment Edge Cases**: Zero/negative payment rejection (400), payment allocation exceeding outstanding invoice balance (400), multi-invoice atomic allocation, multiple payments against single invoice to full settlement, unallocated payment tracking.
   - **Credit Engine Calculations**: Outstanding > credit limit, utilization exactly 100%, utilization > 100%, fully paid vs partially paid status, overdue across 4 aging buckets (`Current`, `1-30`, `31-60`, `60+`), zero-division math safety.
   - **Approval Edge Cases**: Sales user approval attempt blocked (403 Forbidden), self-approval blocked for manager submitters (403 Forbidden), duplicate approval rejected (400), expired extension rejection (400).
   - **Risk Scoring**: Pristine payer low risk, delinquent high risk, 0 payment history default risk, real-time recalculation after payment.
   - **Security**: Expired JWT rejection (401), missing token (401), password hashes redacted from all API payloads.

3. **`tests/creditRiskEngine.test.js` (11/11 Passed)**:
   - Core financial formula verification, dynamic exposure limits, zero-limit edge cases, and transactional isolation.

4. **`tests/securityAndIntegration.test.js` (12/12 Passed)**:
   - RBAC privilege enforcement, helmet headers, audit log persistence, and pre-check simulation engine.

---

## 💾 Database Backup & Recovery Guide

### Backup (Logical Dump)
To perform a complete database dump of schemas and data:
```bash
pg_dump -h localhost -p 54321 -U postgres -d creditguard_db -F c -b -v -f creditguard_backup.dump
```

### Recovery / Restore
To restore into a fresh database instance:
```bash
# 1. Create fresh database
createdb -h localhost -p 54321 -U postgres creditguard_db

# 2. Restore schema and data
pg_restore -h localhost -p 54321 -U postgres -d creditguard_db -v creditguard_backup.dump
```

---

## 🌐 Production Deployment Guide

### Environment Variables Matrix
| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | Backend listening port | `5000` |
| `DATABASE_URL` | PostgreSQL connection pool URL | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_SECRET` | High-entropy secret key | `super_secure_random_string_min_32_chars` |
| `JWT_EXPIRES_IN` | Token time-to-live | `24h` |
| `CORS_ORIGIN` | Authorized frontend domain | `https://creditguard.yourcompany.com` |

### Production Build & Launch
```bash
# Build frontend static bundle
npm run build

# Start backend with cluster or process manager (e.g. PM2)
cd backend
npm start
```
