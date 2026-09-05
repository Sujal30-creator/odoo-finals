# Database Gap Analysis

**Date:** 2026-09-05
**Focus:** DealFlow360 PS1 Workflows
**Target:** `backend/models.py`

## Executive Summary
The current database schema provides a solid foundation but lacks critical fields and entities required to fully support the PS1 workflows, particularly around fulfillment, billing, and order management. Notably, the lack of `Fulfillment` tables makes warehouse splitting impossible, and missing `quantity` on subscriptions breaks recurring billing logic.

---

## 1. Missing Entities & Relationships

### 1.1 Fulfillment / Shipment (Warehouse Split)
- **Why PS1 requires it:** Rule 8 states inventory must be allocated and split across warehouses. Currently, we have `Order` and `Warehouse`, but no way to record *which* warehouse is fulfilling *which* products for a given order.
- **Priority:** P0
- **Recommended Schema Change:** 
  Create a `Fulfillment` (or Shipment) model:
  - `id` (PK)
  - `order_id` (FK to Order)
  - `warehouse_id` (FK to Warehouse)
  - `status` (Enum: pending, shipped, delivered)
  - `shipping_cost` (Numeric)
  - `actual_delivery_date` (TIMESTAMP - needed for deal health delivery slippage)
  Create a `FulfillmentLine` model:
  - `fulfillment_id` (FK)
  - `product_id` (FK)
  - `quantity` (Integer)

### 1.2 Invoice & Payment Records
- **Why PS1 requires it:** The system must separate one-time and recurring billing, and track "Payment/invoice status". An order with a subscription will generate multiple invoices over time.
- **Priority:** P1
- **Recommended Schema Change:**
  Create an `Invoice` model:
  - `order_id` (FK)
  - `amount` (Numeric)
  - `status` (Enum: unpaid, paid)
  - `due_date`, `paid_at` (TIMESTAMP)

### 1.3 Audit Trail / Status History
- **Why PS1 requires it:** To track stalled deals (Deal Health) and approval history (Negotiation Re-approval).
- **Priority:** P2 (Can be derived from `last_activity_at` for MVP, but a dedicated log is much more robust).
- **Recommended Schema Change:** Create an `AuditLog` or `QuoteHistory` table tracking state transitions.

---

## 2. Gaps in Existing Models

### `Subscription`
- **Missing Field:** `quantity` (Integer)
- **Why PS1 requires it:** A customer might buy 5 licenses of a subscription product. The current model assumes a quantity of 1.
- **Priority:** P0
- **Recommended Schema Change:** Add `quantity` to `Subscription`. Add `start_date` and `end_date` to support proration/cancellation logic.

### `QuoteLine`
- **Missing Field:** `unit_cost` (Numeric)
- **Why PS1 requires it:** Rule 7 (Margin) requires subtracting cost from revenue. If `Product.unit_cost` changes in the future, historical quote margins will be corrupted if the cost isn't snapshotted on the quote line at creation time.
- **Priority:** P1
- **Recommended Schema Change:** Add `unit_cost` to `QuoteLine`.

### `Approval`
- **Missing Field:** `approval_level` or `role_required` (String/Enum)
- **Why PS1 requires it:** Rule 4 states routing goes to Sales Manager OR Finance. We need to know which tier of approval this record represents.
- **Priority:** P1
- **Recommended Schema Change:** Add `level` (e.g., 'manager', 'finance') and a `round` (Integer) field to handle multiple re-approvals after negotiation.

### `NegotiationComment`
- **Missing Field:** `proposed_discount` or `proposed_price` (Numeric, nullable)
- **Why PS1 requires it:** Rule 13 (Customer Negotiation) allows counter discounts. A text comment isn't structured enough to automatically trigger the "recalculate discount risk" logic (Rule 14).
- **Priority:** P1
- **Recommended Schema Change:** Add `proposed_discount_percent` to capture structured counter-offers.

### `Quotation`
- **Missing Field:** `margin_total` (Numeric)
- **Why PS1 requires it:** Rule 7. While calculable on the fly, storing it makes reporting and risk routing significantly easier.
- **Priority:** P2
- **Recommended Schema Change:** Add `margin_total`.

### `Order`
- **Missing Field:** Missing an `OrderLine` entity.
- **Why PS1 requires it:** Currently, `Order` only links to `Quotation`. This means `QuoteLine` must serve as the source of truth for the order. If the quotation is mutated later, order history is lost. 
- **Priority:** P1
- **Recommended Schema Change:** Either implement an `OrderLine` table that snapshots the `QuoteLine`s at confirmation time, or strictly enforce `Quotation` immutability once ordered.

---

## 3. Data Types & Best Practices

### Enums vs Strings
Many fields use `String(20)` for bounded statuses. These should be constrained using SQLAlchemy `Enum` or documented constants to prevent invalid states:
- `Quotation.status`: draft, pending_approval, approved, negotiating, confirmed, lost
- `Order.status`: processing, fulfilled, backordered
- `Order.payment_status`: unpaid, partially_paid, paid
- `Approval.status`: pending, approved, rejected, returned
- `Product.product_type`: one-time, recurring
- `Subscription.status`: active, canceled, paused

### Missing ORM Relationships
- **Issue:** The models currently only define `ForeignKey` columns (e.g., `customer_id = Column(...)`) but completely lack SQLAlchemy `relationship()` properties (e.g., `customer = relationship("Customer")`).
- **Impact:** This makes querying extremely cumbersome, requiring explicit joins for every operation rather than using ORM object traversal (e.g., `quote.customer.name`).
- **Priority:** P0 (Developer experience)
- **Recommended Change:** Add `relationship()` definitions to all models to connect entities properly.
