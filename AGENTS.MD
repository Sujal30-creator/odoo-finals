# AGENTS.md

# DealFlow360 - AI Agent Instructions

## 1. Project Identity

Project: DealFlow360

Type:
Intelligent, self-governing B2B Sales Operations Platform

Primary goal:
Build a working end-to-end sales workflow from quotation to approval,
fulfillment, billing, customer negotiation, and reporting.

This is a hackathon MVP.

Prioritize:
1. Correct business logic
2. End-to-end functionality
3. Integration between modules
4. Demo reliability
5. Good user experience

Do NOT prioritize unnecessary enterprise complexity.

---

## 2. Source of Truth

Before implementing any task, read:

1. `AGENTS.md`
2. `docs/PROJECT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/BUSINESS_RULES.md`
5. `docs/API_CONTRACT.md` when the task involves APIs
6. `docs/TASKS.md` to understand ownership

Do not scan the entire repository unless the task requires it.

---

## 3. Core Product Flow

The primary business flow is:

Customer
    ↓
Quotation
    ↓
Discount Evaluation
    ↓
Approval Routing
    ↓
Approval
    ↓
Warehouse Fulfillment
    ↓
Billing
    ↓
Customer Negotiation
    ↓
Possible Re-approval
    ↓
Order Confirmation
    ↓
Payment
    ↓
Deal Health / Reporting

All major implementation decisions should support this flow.

---

## 4. Core Modules

### Authentication
- Internal user login/signup
- Customer portal authentication
- Role-based access

### Product & Pricing
- Products
- Categories
- Variants
- Prices
- Taxes
- Customer-tier pricing

### Discount Governance
- Customer-tier discount limits
- Category discount limits
- Per-line discount validation
- Blended risk scoring
- Approval routing
- Audit trail

### Quotation
- Quote creation
- Quote lines
- Quantities
- Discounts
- Totals
- Margin calculation
- Quote status

### Upsell / Cross-sell
- Product recommendations
- Co-purchase relationships
- Promotions
- Margin-aware ranking

### Approval
- Sales Manager approval
- Finance approval when required
- Approve/reject/return for revision
- Complete audit history

### Inventory / Fulfillment
- Warehouses
- Stock
- Automatic warehouse split
- Shipment count
- Shipping cost
- Manual override
- Backorders

### Subscription / Billing
- One-time products
- Recurring products/services
- Billing schedules
- Proration
- Cancellation
- Refund/credit

### Customer Portal
- View quotation
- Comment/request changes
- Counter discount
- Confirm quotation
- Re-trigger approval when required

### Deal Health
- Stalled deals
- Discount anomalies
- Delivery slippage
- Alerts
- Escalation/nudges

### Reporting
- Period filters
- Sales representative/team filters
- Approval filters
- Product/category filters
- Sales analytics

---

## 5. Implementation Rules

### Rule 1 - Business logic must be real

Do not hardcode results merely to make the demo work.

Business rules must be implemented in application logic.

Especially:

- Discount governance
- Approval routing
- Warehouse splitting
- Billing/proration

### Rule 2 - No unnecessary abstraction

Prefer:

Simple + understandable + testable

over:

Complex + over-engineered + difficult to modify.

### Rule 3 - Small changes

Modify only files required for the assigned task.

Do not refactor unrelated code.

Do not rename unrelated files.

Do not introduce new frameworks without agreement from the integration owner.

### Rule 4 - Preserve contracts

Do not silently change:

- API endpoints
- Request formats
- Response formats
- Database relationships
- Shared interfaces

Update the relevant documentation when contracts change.

### Rule 5 - No duplicate implementations

Before creating a service, utility, hook, component, or helper:

Search the repository for an existing implementation.

Reuse it when appropriate.

---

## 6. AI / Recommendation Rules

AI/ML is optional unless explicitly assigned.

Do not introduce an ML model simply to make a feature appear intelligent.

Rule-based implementations are acceptable for hackathon MVP features such as:

- Upsell ranking
- Cross-sell ranking
- Discount risk
- Discount anomaly detection
- Deal health

The recommendation must remain explainable.

---

## 7. Security

Never commit:

- API keys
- passwords
- tokens
- secrets
- `.env` files

Use environment variables.

Customer portal data must only expose the customer's own quotation information.

---

## 8. Git Rules

Never work directly on `main`.

Use a feature branch.

Example:

`feat/discount-engine`

Before committing:

```bash
git status
git diff