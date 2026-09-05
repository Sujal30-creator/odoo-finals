# DealFlow360 - Hackathon Task Board

> This file is the shared task board for the entire team.
> Every team member and AI agent should check this file before starting work.

---

# Team

## Member 1 - Tech Lead / Integration

Owner:
[NAME]

Branch:
`feat/integration`

Responsibilities:
- Architecture
- Database schema
- Shared domain models
- State machine / workflow
- Integration between modules
- API contract coordination
- Git coordination
- End-to-end testing
- Final demo

---

## Member 2 - Sales / Frontend

Owner:
[NAME]

Branch:
`feat/frontend`

Responsibilities:
- Authentication UI
- Sales workspace
- Quotation list
- Pipeline
- Quotation builder
- Product selection
- Cart / totals
- Discount interface
- Margin display
- Approval interface
- Upsell / cross-sell interface

---

## Member 3 - Backend / Fulfillment / Billing

Owner:
[NAME]

Branch:
`feat/backend`

Responsibilities:
- Product backend
- Customer backend
- Quote backend
- Pricing
- Discount APIs
- Approval APIs
- Warehouse management
- Inventory
- Warehouse allocation
- Backorders
- Subscription plans
- Billing schedules
- Proration
- Payment / invoice status

---

## Member 4 - Customer / Intelligence

Owner:
[NAME]

Branch:
`feat/intelligence`

Responsibilities:
- Customer portal
- Customer authentication/access control
- Negotiation
- Counter-offers
- Reapproval after negotiation
- Upsell recommendation logic
- Cross-sell recommendation logic
- Discount anomaly detection
- Deal health
- Stalled deal detection
- Delivery alerts
- Dashboard

---

# Priority

## P0 - MUST WORK FOR DEMO

These features are mandatory for the end-to-end demonstration.

### Core Sales Flow

- [ ] User login
- [ ] Customer selection
- [ ] Product selection
- [ ] Create quotation
- [ ] Add/remove products
- [ ] Quantity adjustment
- [ ] Price calculation
- [ ] Discount calculation
- [ ] Margin calculation

### Discount Governance

- [ ] Customer-tier discount limits
- [ ] Category-specific discount limits
- [ ] Per-line discount validation
- [ ] Risk score calculation
- [ ] Approval-level determination

### Approval

- [ ] Automatic approval routing
- [ ] Sales Manager approval
- [ ] Finance approval when required
- [ ] Approve
- [ ] Reject
- [ ] Return for revision
- [ ] Audit trail

### Fulfillment

- [ ] Warehouse stock
- [ ] Automatic warehouse allocation
- [ ] Multi-warehouse split
- [ ] Shipment count
- [ ] Shipping cost
- [ ] Manual override
- [ ] Backorder handling

### Billing

- [ ] One-time products
- [ ] Recurring products
- [ ] Billing schedule
- [ ] Basic proration
- [ ] Invoice
- [ ] Payment
- [ ] Payment status

### Customer Portal

- [ ] Separate customer login/access
- [ ] View quotation
- [ ] Line-level comments
- [ ] Change request
- [ ] Counter discount
- [ ] Confirm quotation
- [ ] Re-trigger approval when threshold is exceeded

---

# P1 - IMPORTANT

These should be completed after the P0 flow is stable.

- [ ] Upsell recommendations
- [ ] Cross-sell recommendations
- [ ] Margin delta on recommendations
- [ ] Promotions
- [ ] Discount anomaly detection
- [ ] Stalled deal detection
- [ ] Delivery slippage alerts
- [ ] Deal-health dashboard
- [ ] Reporting filters

---

# P2 - NICE TO HAVE

Only implement these after the complete P0 flow works.

- [ ] Advanced recommendation ranking
- [ ] Automated deal nudges
- [ ] Escalation automation
- [ ] PDF quotation export
- [ ] XLS reporting
- [ ] Advanced subscription cancellation/refund
- [ ] Advanced analytics
- [ ] Multi-currency
- [ ] Multi-company

---

# Current Sprint

## Architecture

- [ ] Finalize database entities
- [ ] Finalize relationships
- [ ] Finalize quotation state machine
- [ ] Finalize API boundaries
- [ ] Finalize business rules

## Backend

- [ ] Authentication
- [ ] Customer
- [ ] Product
- [ ] Quote
- [ ] Quote Line
- [ ] Discount Engine
- [ ] Approval Engine
- [ ] Warehouse
- [ ] Inventory
- [ ] Fulfillment
- [ ] Billing

## Frontend

- [ ] Login
- [ ] Dashboard shell
- [ ] Sales workspace
- [ ] Quote builder
- [ ] Approval screen
- [ ] Fulfillment screen
- [ ] Billing screen

## Customer

- [ ] Customer portal
- [ ] Negotiation
- [ ] Confirmation

## Intelligence

- [ ] Upsell
- [ ] Cross-sell
- [ ] Risk score
- [ ] Deal health

---

# Integration Milestones

## Milestone 1 - Quote Creation

Definition of Done:

```text
Login
  ↓
Select Customer
  ↓
Select Product
  ↓
Create Quote
  ↓
Add Quote Lines
  ↓
Calculate Total