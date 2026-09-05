# DealFlow360 - Project Context

## Problem

Traditional sales systems often stop at quotation, order, and invoice creation.

Real B2B sales operations involve:

- Discount approvals
- Customer-specific pricing
- Product/category discount limits
- Inventory distributed across warehouses
- Subscription and one-time products in the same order
- Customer negotiations
- Delayed or risky deals

DealFlow360 addresses these operational problems through a connected,
self-governing sales workflow.

---

## Product Goal

Build a sales platform where a quotation is not just a document.

The quotation becomes a living business object that:

- evaluates discounts
- calculates deal risk
- triggers approvals
- recommends additional products
- checks inventory
- plans fulfillment
- supports subscriptions
- allows customer negotiation
- re-enters approval when negotiated terms exceed thresholds
- feeds reporting and deal-health monitoring

---

## Primary Users

### Sales Rep

Creates quotations, applies discounts, adds products, tracks approval,
and monitors fulfillment.

### Sales Manager

Reviews discount exceptions and monitors deal health.

### Finance / Operations

Handles high-risk approvals, warehouse fulfillment and recurring billing.

### Customer

Views and negotiates quotations through a restricted customer portal.

### Admin

Configures products, price lists, discount tiers, approval chains,
warehouses and subscription plans.

---

## MVP

The MVP must demonstrate:

1. User authentication
2. Product/customer setup
3. Quotation creation
4. Discount validation
5. Automatic approval routing
6. Upsell/cross-sell suggestion
7. Warehouse split
8. One-time + recurring billing
9. Customer negotiation
10. Automatic re-approval after risky negotiation
11. Order confirmation
12. Payment/invoice status
13. Deal-health dashboard

---

## Primary Demo Scenario

A sales representative creates a quotation containing:

- Hardware product
- Service product
- Recurring subscription

The rep applies a discount exceeding a category-specific threshold.

The system:

1. Calculates the discount risk.
2. Routes the quote for approval.
3. Shows an upsell recommendation.
4. Updates margin when the recommendation is added.
5. Calculates warehouse fulfillment.
6. Separates one-time and recurring billing.
7. Allows customer negotiation.
8. Recalculates risk after negotiation.
9. Re-routes the quote if required.
10. Confirms the order after approval.
11. Records payment.
12. Updates deal health/reporting.

---

## Non-Goals

For the hackathon MVP, avoid unnecessary complexity such as:

- Full enterprise CRM
- Real-world banking integration
- Complex tax jurisdiction systems
- Sophisticated ML training pipelines
- Large-scale distributed inventory systems
- Multi-company support unless time permits
- Multi-currency unless time permits