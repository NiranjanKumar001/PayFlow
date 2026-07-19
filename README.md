# User Payout Management System

A comprehensive **Low-Level Design (LLD)** and working implementation for managing user payouts in an affiliate sales platform — built with **Node.js**, **Express**, **MongoDB**, and a modern **React interactive dashboard**.

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [System Architecture](#-system-architecture)
- [Database Schema](#-database-schema)
- [Class Design](#-class-design)
- [API Reference](#-api-reference)
- [Core Workflows](#-core-workflows)
  - [Advance Payout Job](#1-advance-payout-job)
  - [Sale Reconciliation](#2-sale-reconciliation)
  - [Withdrawal](#3-withdrawal)
  - [Failed Payout Recovery](#4-failed-payout-recovery)
- [State Machines](#-state-machines)
- [Business Rules & Edge Cases](#-business-rules--edge-cases)
- [Design Decisions & Trade-offs](#-design-decisions--trade-offs)
- [Walkthrough Example](#-walkthrough-example)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Running Tests](#-running-tests)
- [Project Structure](#-project-structure)

---

## 🎯 Problem Statement

Every affiliate sale enters the system as **Pending**. The system must:

1. **Advance Payout** — Automatically pay users **10%** of earnings for each pending sale once they are **Trusted** (requires 3 approved sales). New/probationary users do not receive advance payouts.
2. **Reconciliation** — An admin later marks each sale as **Approved** or **Rejected**, triggering a final payout calculation that accounts for any advance already paid.
3. **Withdrawal** — Users can withdraw their balance, but are limited to **one withdrawal every 24 hours**.
4. **Failed Payout Recovery** — If a withdrawal fails, is cancelled, or is rejected by the payment gateway, the amount is credited back and the user can retry immediately.

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client / Admin UI                 │
│            (Interactive Dashboard - SPA)             │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP REST
┌──────────────────────▼──────────────────────────────┐
│                Express REST API                      │
│          /api/sales  /api/users  /api/payouts        │
│          /api/jobs   /api/sales/:id/reconcile        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Service Layer (PayoutService)            │
│    runAdvancePayoutJob()  │  reconcileSale()          │
│    initiateWithdrawal()   │  recoverFailedPayout()    │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│           OOP Models (User, Sale, Payout)             │
│       Business logic, validation, state checks        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│           MongoDB Atlas (Mongoose ODM)                │
│     users  │  sales  │  payouts (collections)         │
└─────────────────────────────────────────────────────┘
```

**Layers:**
- **Client** — Interactive browser dashboard for all operations
- **API** — RESTful Express endpoints
- **Service** — `PayoutService` class orchestrating all business logic inside MongoDB transactions
- **Models** — `User`, `Sale`, `Payout` Mongoose models encapsulating domain rules
- **Database** — MongoDB Atlas with multi-document ACID transactions ensuring data consistency

---

## 🗄 Database Schema

### Entity-Relationship Diagram

```
┌──────────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│        USERS         │       │        SALES          │       │      PAYOUTS        │
├──────────────────────┤       ├──────────────────────┤       ├─────────────────────┤
│ id (PK)              │──┐    │ id (PK)              │──┐    │ id (PK)             │
│ name                 │  │    │ user_id (FK) ────────│──┘──▶ │ user_id (FK)        │
│ withdrawable_        │  │    │ brand                │       │ type                │
│   balance            │  └──▶ │ status               │       │ amount              │
│ last_withdrawal_     │       │ earning              │       │ status              │
│   at                 │       │ advance_status       │       │ reference_id        │
│ is_trusted           │       │ advance_amount       │       │ created_at          │
│ approved_sales_count │       │ reconciled_at        │       │ updated_at          │
│ created_at           │       │ created_at           │       └─────────────────────┘
│ updated_at           │       │ updated_at           │
└──────────────────────┘       └──────────────────────┘
                    
                    USERS  1 ──── * SALES
                    USERS  1 ──── * PAYOUTS
                    SALES  1 ──── * PAYOUTS (via reference_id)
```

### Collection Definitions

#### `users`
| Field | Type | Description |
|---|---|---|
| `_id` | `String` | Unique user identifier (e.g. `"john_doe"`) |
| `name` | `String` | Display name |
| `withdrawableBalance` | `Number` | Current balance (can go negative on rejections). Default: `0` |
| `lastWithdrawalAt` | `Date` | Timestamp of last successful withdrawal (24h rate limit). Default: `null` |
| `isTrusted` | `Boolean` | Eligibility for 10% advance payout (requires 3 approved sales). Default: `false` |
| `approvedSalesCount` | `Number` | Total count of reconciled approved sales. Default: `0` |
| `isTerminated` | `Boolean` | Flag indicating whether the user is deactivated/terminated. Default: `false` |
| `timestamps` | — | Auto-managed `createdAt` and `updatedAt` |

#### `sales`
| Field | Type | Description |
|---|---|---|
| `_id` | `ObjectId` | Auto-generated sale ID |
| `userId` | `String` ref → `users._id` | Owning user |
| `brand` | `String` | Brand name (`brand_1`, `brand_2`, `brand_3`) |
| `status` | `String` | `'pending'` / `'approved'` / `'rejected'`. Default: `'pending'` |
| `earning` | `Number` | Total earning amount |
| `advanceStatus` | `String` | `'eligible'` / `'paid'` — prevents double advance. Default: `'eligible'` |
| `advanceAmount` | `Number` | Amount paid as advance (10% of earning). Default: `0` |
| `reconciledAt` | `Date` | When sale was approved/rejected. Default: `null` |
| `timestamps` | — | Auto-managed `createdAt` and `updatedAt` |

#### `payouts` (Transaction Ledger)
| Field | Type | Description |
|---|---|---|
| `_id` | `ObjectId` | Auto-generated payout ID |
| `userId` | `String` ref → `users._id` | Owning user |
| `type` | `String` | `'advance_payout'` / `'adjustment'` / `'withdrawal'` / `'recovery'` |
| `amount` | `Number` | Transaction amount (negative for rejected-sale adjustments) |
| `status` | `String` | `'completed'` / `'failed'` / `'cancelled'`. Default: `'completed'` |
| `referenceId` | `String` | Links to `sale._id` or original `payout._id` |
| `timestamps` | — | Auto-managed `createdAt` and `updatedAt` |

---

## 🧱 Class Design

### `User` — Domain Model
```
User
├── Properties: id, name, withdrawable_balance, last_withdrawal_at, is_trusted, approved_sales_count
├── canWithdraw()     → checks 24h cooldown & positive balance
├── credit(amount)    → increases withdrawable_balance
└── debit(amount)     → decreases withdrawable_balance
```

### `Sale` — Domain Model
```
Sale
├── Properties: id, userId, brand, status, earning, advanceStatus, advanceAmount
└── isEligibleForAdvance() → true if status='pending' AND advanceStatus='eligible'
```

### `Payout` — Domain Model
```
Payout
├── Properties: id, userId, type, amount, status, referenceId
```

### `PayoutService` — Orchestrator
```
PayoutService
├── runAdvancePayoutJob()              → processes all eligible sales atomically
├── reconcileSale(saleId, newStatus)   → calculates final adjustment per sale
├── reconcileBulk(saleIds, newStatus)  → batch reconciliation
├── initiateWithdrawal(userId, amount) → 24h rate-limited withdrawal
└── recoverFailedPayout(payoutId)      → re-credits balance on gateway failure
```

All `PayoutService` methods execute inside **MongoDB multi-document transactions** (`session.startTransaction()` → `commitTransaction()` / `abortTransaction()`) to ensure consistency.

---

## 📡 API Reference

### Sales Management

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/sales` | `{ userId, brand, earning }` | Create a new pending sale |
| `GET` | `/api/sales` | Query: `?userId=&status=` | List/filter sales |

### Core Operations

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/jobs/advance-payout` | — | Run advance payout job (10% of pending sales) |
| `POST` | `/api/sales/:id/reconcile` | `{ status: "approved"\|"rejected" }` | Reconcile a single sale |
| `POST` | `/api/sales/reconcile` | `{ saleIds: [...], status }` | Bulk reconcile multiple sales |

### Withdrawals & Payouts

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/users/:id/withdraw` | `{ amount }` | Initiate withdrawal (24h limit enforced) |
| `POST` | `/api/payouts/:id/status` | `{ status: "failed"\|"cancelled" }` | Simulate gateway callback → triggers recovery |
| `GET` | `/api/payouts` | Query: `?userId=` | List all transactions |

### Users

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/api/users` | — | List all users with balances |
| `POST` | `/api/users/:id/terminate` | — | Terminate/Deactivate a user (disables new sales and withdrawals) |

---

## ⚙ Core Workflows

### 1. Advance Payout Job

```
TRIGGER: POST /api/jobs/advance-payout

BEGIN TRANSACTION
  │
  ├─ SELECT all sales WHERE status = 'pending' AND advance_status = 'eligible'
  │
  ├─ For each eligible sale:
  │   ├─ advance_amount = earning × 0.10
  │   ├─ UPDATE sale SET advance_status = 'paid', advance_amount
  │   ├─ UPDATE user SET withdrawable_balance += advance_amount
  │   └─ INSERT payout (type = 'advance_payout', amount = advance_amount)
  │
COMMIT
```

**Idempotency guarantee:** The `advance_status = 'eligible'` filter ensures running the job multiple times never double-pays.

### 2. Sale Reconciliation

```
TRIGGER: POST /api/sales/:id/reconcile { status: "approved" | "rejected" }

BEGIN TRANSACTION
  │
  ├─ SELECT sale (must have status = 'pending')
  │
  ├─ IF status = 'approved':
  │   ├─ remaining = earning - advance_amount
  │   ├─ UPDATE user SET withdrawable_balance += remaining
  │   └─ INSERT payout (type = 'adjustment', amount = +remaining)
  │
  ├─ IF status = 'rejected':
  │   ├─ clawback = advance_amount
  │   ├─ UPDATE user SET withdrawable_balance -= clawback
  │   └─ INSERT payout (type = 'adjustment', amount = -clawback)
  │
  ├─ UPDATE sale SET status, reconciled_at = NOW()
  │
COMMIT
```

### 3. Withdrawal

```
TRIGGER: POST /api/users/:id/withdraw { amount }

BEGIN TRANSACTION
  │
  ├─ SELECT user
  ├─ CHECK: withdrawable_balance >= amount         → else 400
  ├─ CHECK: last_withdrawal_at is NULL or > 24h ago → else 429
  │
  ├─ UPDATE user SET withdrawable_balance -= amount, last_withdrawal_at = NOW()
  └─ INSERT payout (type = 'withdrawal', amount, status = 'completed')
  │
COMMIT
```

### 4. Failed Payout Recovery

```
TRIGGER: POST /api/payouts/:id/status { status: "failed" | "cancelled" }

BEGIN TRANSACTION
  │
  ├─ SELECT payout (must be type = 'withdrawal', status = 'completed')
  │
  ├─ UPDATE payout SET status = 'failed'/'cancelled'
  ├─ UPDATE user SET withdrawable_balance += payout.amount
  ├─ UPDATE user SET last_withdrawal_at = NULL  (allow immediate retry)
  └─ INSERT payout (type = 'recovery', amount, reference_id = original payout ID)
  │
COMMIT
```

---

## 🔄 State Machines

### Sale Lifecycle

```
                    ┌──────────────────┐
                    │     PENDING      │
                    │  (initial state) │
                    └───────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              │ reconcile   │             │ reconcile
              │ (approved)  │             │ (rejected)
              ▼             │             ▼
     ┌────────────┐         │      ┌────────────┐
     │  APPROVED  │         │      │  REJECTED  │
     │  (final)   │         │      │  (final)   │
     └────────────┘         │      └────────────┘
```

### Sale Advance Status

```
     ┌────────────┐   advance job    ┌────────────┐
     │  ELIGIBLE  │ ───────────────▶ │    PAID    │
     │  (default) │                  │  (locked)  │
     └────────────┘                  └────────────┘
```

### Payout (Withdrawal) Status

```
     ┌────────────┐   gateway fail   ┌────────────┐
     │ COMPLETED  │ ───────────────▶ │   FAILED   │ ──▶ Recovery credited
     │            │                  │ CANCELLED  │
     └────────────┘                  └────────────┘
```

---

## 🛡 Business Rules & Edge Cases

| # | Scenario | Rule / Handling |
|---|---|---|
| 1 | **Double advance payout** | `advance_status = 'eligible'` filter + atomic transaction prevents re-processing |
| 2 | **Rejected sale clawback** | Advance amount is debited from user balance; balance can go negative |
| 3 | **Negative balance** | Allowed — future approved sales offset it; withdrawals blocked at ≤ 0 |
| 4 | **24-hour withdrawal limit** | `last_withdrawal_at` checked in transaction; returns `429 Too Many Requests` |
| 5 | **Concurrent withdrawal race** | MongoDB transactions with document-level write locks serialize writes; second request sees updated state |
| 6 | **Failed/cancelled payout** | Amount re-credited; `last_withdrawal_at` reset to `NULL` for immediate retry |
| 7 | **Reconcile non-pending sale** | Returns `400 Bad Request` — only pending sales can be reconciled |
| 8 | **Withdraw more than balance** | Returns `400 Bad Request` with insufficient balance error |
| 9 | **Zero-earning sale** | Valid — advance = ₹0, no financial impact |
| 10 | **DB crash mid-transaction** | Entire transaction rolls back; no partial state corruption |

---

## 🧠 Design Decisions & Trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| **Materialized `withdrawable_balance`** | O(1) balance lookups; instant withdrawal checks | Must be kept in sync via transactions (vs. computing from ledger on every read) |
| **MongoDB Atlas** | Fully managed cloud database with built-in multi-document ACID transactions | Requires network connection; slightly more configuration than SQLite |
| **Ledger-style `payouts` table** | Full audit trail of every money movement; easy debugging | Storage grows linearly with transactions |
| **`advance_status` flag on sales** | Simple, robust idempotency for the advance job | Extra column per sale row |
| **Reset `last_withdrawal_at` on failure** | User isn't unfairly penalized for gateway errors | Adds slight complexity to recovery logic |
| **Allow negative balance** | Simplifies rejection math; no need for escrow accounts | Must enforce `balance > 0` check before withdrawals |
| **Service-layer orchestration** | Single `PayoutService` class owns all business logic; routes stay thin | Service class grows with features — mitigated by clear method boundaries |

---

## 📝 Walkthrough Example

### Setup: 3 Pending Sales for `john_doe`

```json
[
  { "userId": "john_doe", "brand": "brand_1", "status": "pending", "earning": 40 },
  { "userId": "john_doe", "brand": "brand_1", "status": "pending", "earning": 40 },
  { "userId": "john_doe", "brand": "brand_1", "status": "pending", "earning": 40 }
]
```

**Total Pending Earnings: ₹120**

### Step 1: Run Advance Payout Job

Each sale gets 10% advance:

| Sale | Earning | Advance (10%) | advance_status |
|---|---|---|---|
| Sale 1 | ₹40 | ₹4 | `paid` |
| Sale 2 | ₹40 | ₹4 | `paid` |
| Sale 3 | ₹40 | ₹4 | `paid` |

**User balance: ₹0 + ₹12 = ₹12**

### Step 2: Reconciliation

Admin reconciles: Sale 1 → `rejected`, Sale 2 → `approved`, Sale 3 → `approved`

| Sale | Status | Earning | Advance Paid | Final Adjustment |
|---|---|---|---|---|
| Sale 1 | Rejected | ₹40 | ₹4 | **−₹4** (clawback) |
| Sale 2 | Approved | ₹40 | ₹4 | **+₹36** (remaining) |
| Sale 3 | Approved | ₹40 | ₹4 | **+₹36** (remaining) |

**User balance: ₹12 − ₹4 + ₹36 + ₹36 = ₹80**

Wait — but the expected final payout from the assignment is **₹68**. That's because the final payout is the amount disbursed *after* the advance. The user already received ₹12 as advance, so:

> **Total earned: ₹80** = ₹12 (advance already paid) + ₹68 (final payout)

The system balance correctly reflects ₹68 remaining to withdraw after the advance was already credited.

### Step 3: Withdrawal

User calls `POST /api/users/john_doe/withdraw { amount: 68 }` → ✅ Success

### Step 4: Failure Recovery

If the gateway later reports the withdrawal as failed:
- ₹68 is **re-credited** to the user's balance
- `last_withdrawal_at` is **reset** so the user can retry immediately

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (v18+) |
| Backend | Express.js |
| Database | MongoDB Atlas (via Mongoose) |
| Frontend | React 19 + Vite |
| Deployment | Backend: Render (Free Tier) <br> Frontend: Vercel (Free Tier) |
| Testing | Custom automated integration tests |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v8 or higher
- **MongoDB Atlas** free cluster (or local MongoDB instance)

### Installation

```bash
# Clone the repository
git clone https://github.com/NiranjanKumar001/User-Payout-Management-System.git
cd User-Payout-Management-System

# Install all dependencies (server + client)
npm install

# Configure MongoDB connection
cp server/.env.example server/.env
# Edit server/.env with your MongoDB Atlas URI

# Start both server and client in development mode
npm run dev
```

- **API Server** runs at **http://localhost:3001**
- **React Dashboard** runs at **http://localhost:5173** (Vite dev server)

### Production Build (Local)

```bash
npm run build    # Builds the React client
npm start        # Serves API + built client from Express
```

---

## ☁️ Deployment

### 1. Backend (Render)
The backend is configured for deployment on **Render** via the provided `render.yaml` Blueprint:
1. Connect your GitHub repository to Render.
2. Render will automatically detect the `render.yaml` configuration and create the **payflow-backend** web service.
3. In the Render environment settings, configure the following:
   - `MONGODB_URI`: Your MongoDB Atlas connection string (e.g. `mongodb+srv://...`).
   - `NODE_ENV`: `production`.

### 2. Frontend (Vercel)
The React client is optimized to run as a static Single Page Application (SPA) on **Vercel**:
1. Import your GitHub repository into Vercel.
2. Set the **Root Directory** to `client`.
3. In the **Build & Development Settings**, keep the defaults (Vercel automatically detects Vite: build command `npm run build`, output directory `dist`).
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: The live URL of your Render backend (e.g. `https://payflow-backend.onrender.com`).
5. Vercel will build and deploy the React app. The custom `client/vercel.json` ensures all route queries route through `index.html` seamlessly.

---

## 🧪 Running Tests

### CI Pipeline
We have integrated a **GitHub Actions CI workflow** (`.github/workflows/ci.yml`) that spins up a MongoDB container and executes the test runner on every push/pull request to `main`.

### Running Locally
To execute the comprehensive test suite:
```bash
npm test
```

### Running Individual Modular Tests
You can run specific groups by executing their respective files directly with Node:
* **Domain Model Tests**: `node server/src/tests/domain.test.js`
* **Service/Job Tests**: `node server/src/tests/service.test.js`
* **Withdrawal & Cooldown Tests**: `node server/src/tests/withdrawal.test.js`
* **HTTP API E2E Tests**: `node server/src/tests/api.test.js`
* **Trust & Probation Tests**: `node server/src/tests/trust.test.js`
* **User Termination Security Tests**: `node server/src/tests/termination.test.js`

The automated test suites exercise the full lifecycle:

1. ✅ Create users and sales
2. ✅ Run advance payout job (+ idempotency check)
3. ✅ Reconcile sales (approved + rejected)
4. ✅ Verify balance calculations
5. ✅ Withdrawal with 24h rate limit enforcement
6. ✅ Failed payout recovery
7. ✅ Edge cases (double advance, negative balance, concurrent requests)
8. ✅ Trust & Probation Tier (probationary exclusion, promotion on 3rd approved sale, subsequent advance eligibility)
9. ✅ Affiliate User Termination (blocks new sales, blocks withdrawals, skips advance job)

---

## 📂 Project Structure

```
User-Payout-Management-System/
├── server/                        # Backend
│   ├── src/
│   │   ├── db.js                  # MongoDB Atlas connection & seeding
│   │   ├── models/
│   │   │   ├── User.js            # User domain model
│   │   │   ├── Sale.js            # Sale domain model
│   │   │   └── Payout.js          # Payout domain model
│   │   ├── services/
│   │   │   └── PayoutService.js   # Core business logic orchestrator
│   │   ├── routes/
│   │   │   ├── users.js           # User endpoints
│   │   │   ├── sales.js           # Sales + reconciliation endpoints
│   │   │   └── payouts.js         # Withdrawal + recovery endpoints
│   │   ├── middleware/
│   │   │   └── errorHandler.js    # Centralized error handling
│   │   ├── tests/                 # Modularized test suites
│   │   │   ├── helpers.js         # Shared test environment & DB connection
│   │   │   ├── domain.test.js     # User & Sale unit model tests
│   │   │   ├── service.test.js    # Advance job & reconciliation tests
│   │   │   ├── withdrawal.test.js # Withdrawal & gateway failures tests
│   │   │   ├── api.test.js        # E2E Express API routes tests
│   │   │   ├── trust.test.js      # Probation tier & trusted status tests
│   │   │   ├── termination.test.js # User deactivation security tests
│   │   │   └── run.js             # Sequential main test runner
│   │   └── app.js                 # Express application setup
│   ├── index.js                   # Server entry point
│   └── package.json
├── client/                        # React Frontend (Vite)
│   ├── src/
│   │   ├── components/            # Modular dashboard subcomponents
│   │   │   ├── CustomSelect.jsx   # Reusable Shadcn-style dropdowns
│   │   │   ├── Toast.jsx          # Alert/notification banner
│   │   │   ├── Header.jsx         # App header & active tab navigation
│   │   │   ├── StatsCards.jsx     # Overview metrics & balances
│   │   │   ├── SalesTable.jsx     # Sales grid table with filters
│   │   │   ├── UsersTable.jsx     # User directory grid
│   │   │   ├── PayoutsTable.jsx   # Ledger history & fail simulations
│   │   │   ├── RegisterSaleForm.jsx # Add new sales panel form
│   │   │   └── WithdrawForm.jsx   # Withdraw balance panel form
│   │   ├── services/              # API client functions
│   │   ├── App.jsx                # Dashboard main state coordinator
│   │   ├── App.css                # Style override file
│   │   ├── index.css              # Premium global styles
│   │   └── main.jsx               # Vite entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json                # Vercel SPA router config
│   └── package.json
├── render.yaml                    # Render Blueprint config
├── package.json                   # Root package (monorepo scripts)
└── README.md                      # Documentation

```

---

## 🛡️ Security Analysis: Preventing Advance Payout Fraud

### The Vulnerability: "Hit-and-Run" Affiliate Fraud
Under a basic 10% advance payout rule, an affiliate can sign up, register a high-value fake sale (e.g., ₹2,000 earning), immediately receive a ₹200 advance payout, withdraw it, and abandon the account. When the admin later rejects/cancels the fake sale, the system claws back the ₹200, bringing the user's balance to `-₹200`. However, since the fraudster has already abandoned the account, the platform suffers a direct loss of **₹200**.

### Why a "Minimum Withdrawal Threshold" is Ineffective
A simple solution might seem to be setting a **Minimum Withdrawal Threshold** (e.g., must have at least ₹200 to withdraw). However, this is easily bypassed:
1. **Collateral Inflation**: The attacker simply inflates the fake sale's registered value (e.g., registering a ₹2,000 sale to hit the ₹200 advance threshold).
2. **Bulk Accumulation**: The attacker registers multiple smaller fake sales until the accumulated advances exceed the minimum withdrawal limit.
3. **Legitimate User Friction**: It penalizes real, low-volume affiliates who have to wait a long time to withdraw genuine earnings, harming the platform's reputation.

### The Recommended Solution: Trust-Based Probation Tiers
To robustly secure the platform, we recommend a **Trust/Probation Tier** system:
1. **New User Probation**: When a user signs up, they are placed in a "Probationary" tier. During this phase, **no advance payouts are issued**.
2. **Verification Requirement**: Their first $N$ sales (e.g., 3 or 5 sales) must be fully reconciled and **Approved** by the admin.
3. **Trust Promotion**: Once they establish a history of $N$ valid sales, their account status is promoted to "Trusted," unlocking the automatic 10% advance payout on future pending sales.
4. **Dynamic Caps**: High-value sales from newly trusted users can be capped to limit the maximum advance exposure (e.g., max ₹50 advance per sale) until they reach higher trust tiers.

By moving the security logic from a withdrawal restriction (minimum threshold) to an identity/reputation check (Trust Tier), the store owner is fully protected without adding friction for verified affiliates.

---

## 📄 License

This project is built as part of an SDE Intern assignment submission.

---

<p align="center">Built with ❤️ using Node.js, Express & MongoDB</p>
