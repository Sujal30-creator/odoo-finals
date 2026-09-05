# Database Implementation Plan

**Date:** 2026-09-05
**Focus:** Resolving PS1 Workflow Gaps in Database Schema

## Status Fields: SQLAlchemy Enum vs Controlled Strings

Before defining the schema changes, we must decide how to handle status fields (e.g., `status`, `payment_status`, `product_type`).

### SQLAlchemy Enum
- **Pros:** Enforces strict validation at the database level. Prevents bad data from bypassing the application layer.
- **Cons:** Schema migrations (e.g., using Alembic) for native ENUMs can be notoriously painful and time-consuming, especially when adding new states mid-hackathon.

### Controlled Strings / Constants
- **Pros:** High flexibility. No complex schema migrations when adding a new state (it's just a VARCHAR column). Very easy to implement using simple Python classes (e.g., `class QuoteStatus: DRAFT = "draft"`).
- **Cons:** Validation relies entirely on the application layer. Manual DB edits could introduce invalid states.

**Recommendation:** For a Hackathon MVP, **Controlled Strings/Constants are strongly recommended**. You want maximum agility to add states as the workflows evolve without fighting database migration errors. Use Pydantic and Python constants to validate inputs at the API boundary.

---

## P0/P1 Gap Resolutions

### 1. Fulfillment / Warehouse Split (P0)
- **Why it is required:** Rule 8 states inventory must be allocated across warehouses for a single order.
- **Connects to:** `Order`, `Product`, `Warehouse`
- **Minimum Schema Change:** 
  Create a flat `Fulfillment` model:
  - `id` (Integer, PK)
  - `order_id` (Integer, FK)
  - `product_id` (Integer, FK)
  - `warehouse_id` (Integer, FK)
  - `quantity` (Integer)
- **Complexity Flag:** DO NOT create a complex nested `Shipment` -> `ShipmentLine` structure. A flat `Fulfillment` mapping table is the absolute simplest way to satisfy the MVP requirement of splitting product quantities across warehouses.

### 2. Missing ORM Relationships (P0)
- **Why it is required:** Without SQLAlchemy `relationship()` definitions, querying related data (e.g., getting a quote's customer or lines) requires manual joins, vastly slowing down API development.
- **Connects to:** All existing models.
- **Minimum Schema Change:** Add standard `relationship("TargetModel", back_populates="...")` to all models.
- **Complexity Flag:** This reduces complexity. However, avoid complex cascading deletes or eager loading (`lazy="joined"`) globally, as it can cause performance issues or circular dependencies. Stick to default lazy loading.

### 3. Subscription Constraints (P0)
- **Why it is required:** A subscription requires a quantity (e.g., 5 seats) and dates to calculate proration (Rule 11).
- **Connects to:** `Subscription`
- **Minimum Schema Change:** 
  Add to `Subscription`:
  - `quantity` (Integer, nullable=False, default=1)
  - `start_date` (TIMESTAMP)
  - `end_date` (TIMESTAMP, nullable=True)
- **Complexity Flag:** None. Very straightforward.

### 4. QuoteLine Margin Calculation (P1)
- **Why it is required:** Rule 7 (Margin) requires calculating margin dynamically. If `Product.unit_cost` changes, historical quotes will report incorrect margins unless the cost was snapshotted.
- **Connects to:** `QuoteLine`
- **Minimum Schema Change:** Add `unit_cost` (Numeric) to `QuoteLine`.
- **Complexity Flag:** None.

### 5. Invoice Records (P1)
- **Why it is required:** Project rules separate one-time and recurring billing. A single subscription order generates multiple billing events over time.
- **Connects to:** `Order`
- **Minimum Schema Change:** 
  Create an `Invoice` model:
  - `id` (Integer, PK)
  - `order_id` (Integer, FK)
  - `amount` (Numeric)
  - `status` (String, default="unpaid")
  - `due_date` (TIMESTAMP)
  - `paid_at` (TIMESTAMP, nullable=True)
- **Complexity Flag:** DO NOT create `InvoiceLine` items. For the MVP, a single top-level `Invoice` tied to the `Order` is sufficient to demonstrate billing generation and payment collection.

### 6. Approval Routing Levels (P1)
- **Why it is required:** Rule 4 routes approvals to different roles (Manager vs Finance) based on risk thresholds.
- **Connects to:** `Approval`
- **Minimum Schema Change:** Add `approval_level` (String) to `Approval`.
- **Complexity Flag:** DO NOT build a complex Role-Based Access Control (RBAC) engine. Hardcoded strings like `"sales_manager"` and `"finance"` are perfectly fine for the MVP.

### 7. Negotiation Counter-Offers (P1)
- **Why it is required:** Rules 13 & 14 require automatically recalculating risk when a customer counter-offers. The system needs structured data, not just a text comment.
- **Connects to:** `NegotiationComment`
- **Minimum Schema Change:** Add `proposed_discount_percent` (Numeric, nullable=True) to `NegotiationComment`.
- **Complexity Flag:** None.

### 8. Order Lines vs Quote Lines (P1)
- **Why it is required:** `Order` needs to know what products were sold.
- **Connects to:** `Order`, `Quotation`, `QuoteLine`
- **Minimum Schema Change:** DO NOT create an `OrderLine` table.
- **Complexity Flag:** Copying `QuoteLine` records into a new `OrderLine` table adds massive data shuffling complexity. For the MVP, simply use `QuoteLine` as the source of truth for the `Order`, and strictly enforce that `Quotation` state is immutable once the status changes to `confirmed`. 

---

## Implementation Plan

1. **Step 1: Status Constants:** Define a standard Python class file (e.g., `backend/constants.py`) containing the controlled string statuses (QuoteStatus, OrderStatus, etc.).
2. **Step 2: Existing Model Updates:** Add `unit_cost`, `quantity`, `approval_level`, `start_date`, `end_date`, and `proposed_discount_percent` to their respective existing models in `models.py`.
3. **Step 3: New Entities:** Add the `Fulfillment` and `Invoice` models to `models.py`.
4. **Step 4: ORM Relationships:** Wire up all models with SQLAlchemy `relationship()` attributes.
5. **Step 5: Database Migration:** Drop and recreate the SQLite database (`test.db`) via `validate_db.py` to immediately apply the schema changes (since we are using SQLite and haven't launched to production, dropping the DB is much faster and simpler than setting up Alembic).
