# Paytm Merchant Autopilot - Backend & Data Layer

Deterministic, structured backend and business analytics engine powering **Paytm Merchant Autopilot** for small merchants. 

The backend acts as the single source of truth for financial metrics, transaction histories, customer intelligence, and deterministic rule-based anomaly detection. It is designed to be cleanly invoked as tool calls by Phinite-orchestrated AI agents (Analytics Agent and Customer Intelligence Agent) without LLM mathematical hallucination.

---

## 🏛️ Architecture Overview

```text
       Paytm Transaction Stream / Mock Paytm Data
                           ↓
                Node.js / Express Backend
              (Deterministic Computations)
                           ↓
                   REST APIs & Schemas
              (Standardized, Typed JSON)
                           ↓
                     Phinite Tools
             (Declared Tool Specifications)
                           ↓
         Phinite Multi-Agent Orchestrator
                           ↓
      ┌────────────────────┴────────────────────┐
      ▼                                         ▼
Analytics Agent                        Customer Intelligence Agent
("Revenue is up 14.2% vs baseline")   ("42 high-value customers became inactive")
```

> [!IMPORTANT]
> **Core Architecture Principle: Deterministic Source of Truth**
> - **Backend**: Queries raw transactions, aggregates revenue, calculates Average Transaction Value (ATV), segments customers, detects rule-based anomalies, and returns structured JSON.
> - **Phinite**: Determines which tool to trigger, interprets findings, coordinates agents, and generates business action recommendations.
> - **LLM**: **NEVER** calculates financial arithmetic or sums raw transactions.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod (params, query strings, request bodies)
- **Security & Logging**: Helmet, CORS, Morgan
- **Environment**: dotenv

---

## 📁 Directory Structure

```text
backend/
├── src/
│   ├── config/
│   │   ├── database.ts        # Mongoose connection with embedded fallback
│   │   └── env.ts             # Zod environment validation
│   │
│   ├── models/
│   │   ├── Merchant.ts        # Merchant profile & timezone
│   │   ├── Transaction.ts     # Transactions (SUCCESS, FAILED, PENDING, REFUNDED)
│   │   ├── Customer.ts        # Aggregated customer metrics (spend, recency)
│   │   └── Campaign.ts        # Campaign stub for future Action Agent
│   │
│   ├── routes/
│   │   ├── health.routes.ts       # GET /api/health
│   │   ├── analytics.routes.ts    # Daily metrics, period compare, trends, peak hours
│   │   ├── transaction.routes.ts  # Transaction queries and summaries
│   │   ├── customer.routes.ts     # Retention, segments, and churn analytics
│   │   └── campaign.routes.ts     # Action Agent campaign stubs
│   │
│   ├── controllers/
│   │   ├── analytics.controller.ts
│   │   ├── transaction.controller.ts
│   │   ├── customer.controller.ts
│   │   └── campaign.controller.ts
│   │
│   ├── services/
│   │   ├── analytics.service.ts   # Core deterministic financial aggregations
│   │   ├── transaction.service.ts
│   │   ├── customer.service.ts
│   │   └── campaign.service.ts
│   │
│   ├── utils/
│   │   ├── date.ts            # Timezone-aware date bounds & comparison windows
│   │   ├── metrics.ts         # Pure calculations (ATV, percentages, rates)
│   │   └── errors.ts          # Custom AppError classes
│   │
│   ├── middleware/
│   │   ├── error.middleware.ts       # Centralized JSON error formatting
│   │   └── validation.middleware.ts  # Zod schema validation
│   │
│   ├── seed/
│   │   ├── seedDatabase.ts    # Deterministic PRNG seed generator (M001, M002, M003)
│   │   └── verifyMilestone.ts # Milestone automated verification suite
│   │
│   └── server.ts              # Express application entrypoint
│
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🚀 Setup & Installation

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy the sample environment file:
```bash
cp .env.example .env
```

Default configuration variables:
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/paytm_autopilot
CORS_ORIGIN=*
NODE_ENV=development
# Set to true to automatically use embedded in-memory MongoDB
USE_MEMORY_DB=false
```

### 3. Seed Deterministic Dataset
Populate the database with 3 merchants, 1,300 customers, and 10,000+ transactions spanning 90 days:
```bash
npm run seed
```

### 4. Run Milestone Verification Suite
Verify database counts, arithmetic precision, and milestone API responses:
```bash
npm run verify:milestone
```

### 5. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:4000`.

---

## 📊 Injected Business Scenarios in Seed Data

The seed dataset utilizes a deterministic PRNG (seed `42`) to simulate real merchant operating environments:

| Merchant | Category | Pattern & Injected Scenarios |
| :--- | :--- | :--- |
| **M001** (Rajesh Bakery) | Bakery | Steady daily sales baseline (~₹18k–₹25k).<br>• **Scenario C**: 30% refund spike on `2026-09-08`<br>• **Scenario F**: Simulated shutdown drop (~70% decline) on `2026-09-10`. |
| **M002** (Priya Fashion Store) | Apparel | Sales & repeat customer decline.<br>• **Scenario A**: 50% drop in transaction volume in last 14 days.<br>• **Scenario B**: Drop in basket size (ATV drop from ~₹1,400 to ~₹480).<br>• **Scenario E**: High-value customers inactive for >45 days. |
| **M003** (Spice & Craft Retail) | Retail | Weekend-heavy retail.<br>• **Scenario D**: Weekend volume surge (2.5x volume and higher basket size on Saturdays & Sundays). |

---

## 📡 API Endpoints

### Milestone 1 Endpoints

#### 1. Health Check
`GET /api/health`

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "paytm-merchant-autopilot-backend"
  }
}
```

---

#### 2. Daily Metrics
`GET /api/merchants/:merchantId/analytics/daily?date=YYYY-MM-DD`

**Query Parameters:**
- `date` *(optional)*: Target date (defaults to today in merchant timezone).

**Sample Request:**
```bash
curl -X GET "http://localhost:4000/api/merchants/M001/analytics/daily?date=2026-09-12"
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "merchantId": "M001",
    "date": "2026-09-12",
    "successfulRevenue": 18240,
    "successfulTransactions": 74,
    "averageTransactionValue": 246.49,
    "failedTransactions": 3,
    "refundAmount": 0,
    "successfulTransactionRate": 96.1
  }
}
```

---

#### 3. Period Comparison
`GET /api/merchants/:merchantId/analytics/compare`

**Query Parameters:**
- `preset`: `today_vs_yesterday` | `today_vs_same_weekday_last_week` | `this_week_vs_previous_week` | `mtd_vs_previous_mtd`
- `referenceDate` *(optional)*: Base reference date (defaults to today).
- Or custom ranges: `currentFrom`, `currentTo`, `previousFrom`, `previousTo`.

**Sample Request:**
```bash
curl -X GET "http://localhost:4000/api/merchants/M001/analytics/compare?preset=today_vs_yesterday&referenceDate=2026-09-12"
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "merchantId": "M001",
    "comparisonType": "today_vs_yesterday",
    "period": {
      "current": { "from": "2026-09-12", "to": "2026-09-12" },
      "previous": { "from": "2026-09-11", "to": "2026-09-11" }
    },
    "metrics": {
      "currentRevenue": 18240,
      "previousRevenue": 19410,
      "revenueChange": -1170,
      "revenueChangePercent": -6.03,
      "currentTransactions": 74,
      "previousTransactions": 78,
      "transactionChangePercent": -5.13,
      "currentATV": 246.49,
      "previousATV": 248.85,
      "atvChangePercent": -0.95
    }
  }
}
```

---

### Additional Phinite Analytics & Intelligence Endpoints

| Endpoint | Method | Phinite Agent | Description |
| :--- | :--- | :--- | :--- |
| `/api/merchants/:merchantId/analytics/revenue-trend` | GET | Analytics Agent | Time-series revenue trend (`7d`, `30d`, `90d`) |
| `/api/merchants/:merchantId/analytics/peak-hours` | GET | Analytics Agent | Hourly revenue distribution and peak hour identification |
| `/api/merchants/:merchantId/analytics/day-of-week` | GET | Analytics Agent | Average performance by weekday (counteracts seasonality) |
| `/api/merchants/:merchantId/analytics/anomalies` | GET | Analytics Agent | Rule-based rolling deviation detection |
| `/api/merchants/:merchantId/customers/summary` | GET | Customer Agent | Total, new, repeat, and high-value customer counts |
| `/api/merchants/:merchantId/customers/segments` | GET | Customer Agent | Customer breakdown across RFM clusters |
| `/api/merchants/:merchantId/customers/inactive` | GET | Customer Agent | Identifies customers inactive past threshold |
| `/api/merchants/:merchantId/customers/high-value` | GET | Customer Agent | 90th percentile high-value customer cohort |
| `/api/merchants/:merchantId/customers/at-risk` | GET | Customer Agent | Identifies declining repeat customers |
| `/api/merchants/:merchantId/campaigns` | POST | Action Agent | Creates targeted campaign stubs |

---

## 🤖 Connecting Endpoints to Phinite Tools

In your Phinite agent configuration, declare tools that bind directly to these deterministic REST endpoints.

### Example Tool Definition (JSON Schema for Phinite)

```json
{
  "name": "get_daily_metrics",
  "description": "Fetches deterministic revenue, transaction counts, and ATV for a merchant on a specific date.",
  "parameters": {
    "type": "object",
    "properties": {
      "merchantId": {
        "type": "string",
        "description": "Unique merchant identifier (e.g. M001)"
      },
      "date": {
        "type": "string",
        "description": "Date in YYYY-MM-DD format (defaults to current date)"
      }
    },
    "required": ["merchantId"]
  }
}
```

When Phinite needs to answer `"How much did I make today?"`:
1. Phinite executes `get_daily_metrics(merchantId="M001")`.
2. Node backend computes `SUM(amount WHERE status = SUCCESS)` directly via MongoDB aggregation pipeline.
3. Backend returns exact figures (`successfulRevenue: 18240, ATV: 246.49`).
4. Phinite reasons: `"Your total earnings today are ₹18,240 across 74 successful transactions with an average order value of ₹246.49."`
