# Database Final Review

## End-to-End Flow Database Schema Review

This document reviews the current database schema against the DealFlow360 PS1 end-to-end flow.

### 1. Quotation
**Entity: Quotation**
- **Status:** Existing
- **Required Fields:** `quotation_number`, `status`, `subtotal`, `discount_total`, `tax_total`, `grand_total`, `risk_score`
- **Required Foreign Keys:** `customer_id` (to `Customer`), `sales_rep_id` (to `User`)
- **Why it is needed:** The core object that moves through the entire workflow and aggregates the deal's financials.
- **Priority:** P0

**Entity: QuoteLine**
- **Status:** Existing (requires updates)
- **Required Fields:** `quantity`, `unit_price`, `discount_percent`, `tax_rate`, `line_total`, `unit_cost` (Missing, P1)
- **Required Foreign Keys:** `quotation_id` (to `Quotation`), `product_id` (to `Product`)
- **Why it is needed:** Defines the products requested. `unit_cost` is needed to snapshot the cost at quote time to accurately calculate margins (Rule 7).
- **Priority:** P0 (Existing), P1 (`unit_cost`)

**Entity: Customer**
- **Status:** Existing
- **Required Fields:** `name`, `email`, `phone`, `company`, `tier`, `address`
- **Required Foreign Keys:** None
- **Why it is needed:** Target of the quotation; tier determines discount governance limits.
- **Priority:** P0

**Entity: Product**
- **Status:** Existing
- **Required Fields:** `name`, `sku`, `category`, `price`, `tax_rate`, `unit_cost`, `product_type`, `billing_interval`, `is_active`
- **Required Foreign Keys:** None
- **Why it is needed:** The catalog items available to quote.
- **Priority:** P0

### 2. Discount Evaluation
**Entity: DiscountRule**
- **Status:** Existing
- **Required Fields:** `tier`, `category`, `max_discount_percent`
- **Required Foreign Keys:** None
- **Why it is needed:** Feeds into discount governance limits to calculate risk (Rules 1-3).
- **Priority:** P0

### 3. Approval
**Entity: Approval**
- **Status:** Existing (requires updates)
- **Required Fields:** `reason`, `requested_discount`, `status`, `approval_level` (Missing, P1)
- **Required Foreign Keys:** `quotation_id` (to `Quotation`), `requested_by` (to `User`), `approver_id` (to `User`)
- **Why it is needed:** Captures approval routing state and audit trail. `approval_level` is needed to route to the correct role (Manager vs. Finance) based on risk (Rule 4).
- **Priority:** P0 (Existing), P1 (`approval_level`)

### 4. Fulfillment
**Entity: Order**
- **Status:** Existing
- **Required Fields:** `order_number`, `status`, `payment_status`, `total_amount`, `promised_delivery_date`
- **Required Foreign Keys:** `quotation_id` (to `Quotation`), `customer_id` (to `Customer`)
- **Why it is needed:** Represents a confirmed quotation passed to fulfillment/billing operations.
- **Priority:** P0

**Entity: Warehouse**
- **Status:** Existing
- **Required Fields:** `name`, `location`, `is_active`
- **Required Foreign Keys:** None
- **Why it is needed:** Defines inventory locations for fulfillment splits.
- **Priority:** P0

**Entity: Inventory**
- **Status:** Existing
- **Required Fields:** `quantity`, `reserved_quantity`
- **Required Foreign Keys:** `product_id` (to `Product`), `warehouse_id` (to `Warehouse`)
- **Why it is needed:** Tracks product availability at specific locations.
- **Priority:** P0

**Entity: Fulfillment**
- **Status:** Missing
- **Required Fields:** `quantity`
- **Required Foreign Keys:** `order_id` (to `Order`), `product_id` (to `Product`), `warehouse_id` (to `Warehouse`)
- **Why it is needed:** Maps which warehouse is fulfilling which product quantities for an order to support Rule 8 (automatic warehouse split).
- **Priority:** P0

**Entity: Backorder**
- **Status:** Existing
- **Required Fields:** `remaining_quantity`, `expected_fulfillment_date`
- **Required Foreign Keys:** `order_id` (to `Order`), `product_id` (to `Product`)
- **Why it is needed:** Tracks unfulfilled quantities when inventory is insufficient.
- **Priority:** P0

### 5. Billing
**Entity: Subscription**
- **Status:** Existing (requires updates)
- **Required Fields:** `status`, `billing_interval`, `next_billing_date`, `amount`, `quantity` (Missing, P0), `start_date` (Missing, P0), `end_date` (Missing, P0)
- **Required Foreign Keys:** `customer_id` (to `Customer`), `product_id` (to `Product`), `order_id` (to `Order`)
- **Why it is needed:** Manages recurring products. `quantity`, `start_date`, and `end_date` are necessary to calculate proration and billing limits (Rule 11).
- **Priority:** P0 (Existing & Updates)

**Entity: Invoice**
- **Status:** Missing
- **Required Fields:** `amount`, `status`, `due_date`, `paid_at`
- **Required Foreign Keys:** `order_id` (to `Order`)
- **Why it is needed:** Tracks billing events over time, crucial for separating one-time and recurring billing (Rule 10).
- **Priority:** P1

### 6. Customer Negotiation
**Entity: NegotiationComment**
- **Status:** Existing (requires updates)
- **Required Fields:** `comment`, `proposed_discount_percent` (Missing, P1)
- **Required Foreign Keys:** `quotation_id` (to `Quotation`), `user_id` (to `User`, nullable), `customer_id` (to `Customer`, nullable)
- **Why it is needed:** Allows structured counter-offers from the customer portal to automatically trigger recalculation of discount risk (Rules 13 & 14).
- **Priority:** P0 (Existing), P1 (`proposed_discount_percent`)

### 7. Re-approval
Reuses the `Approval` entity by generating new records to track sequential approval rounds when customer negotiations exceed risk thresholds.

### 8. Order Confirmation
Reuses the `Order` entity. Note: System-wide missing SQLAlchemy `relationship()` mappings must be added (P0) to ensure smooth transitions and query traversal across entities when confirming orders.

### 9. Payment
Reuses the `Invoice` and `Order` entities to update `payment_status`.

---

## Excluded Schema Changes (Not Required for MVP)

The following schema expansions proposed or considered in `DATABASE_IMPLEMENTATION_PLAN.md` should **NOT** be implemented because they add unnecessary complexity for the hackathon MVP:

1. **`Shipment` and `ShipmentLine` Entities:** A complex nested structure is unnecessary. A single flat `Fulfillment` table tracking `order_id`, `product_id`, `warehouse_id`, and `quantity` is sufficient to fulfill the MVP requirement (Rule 8).
2. **`OrderLine` Entity:** Copying `QuoteLine` records into an `OrderLine` table adds unnecessary data duplication. The MVP should use `QuoteLine` as the source of truth for the `Order` by strictly enforcing `Quotation` immutability once confirmed.
3. **`InvoiceLine` Entity:** Line-item detail on invoices is not required. A single top-level `Invoice` record tied to an `Order` demonstrates the required billing generation and payment collection.
4. **Complex RBAC Tables:** Do not build a standalone Role-Based Access Control engine for roles. Using simple string fields (e.g., `approval_level` = `"sales_manager"`) is adequate for MVP approval routing.
5. **SQLAlchemy Enum Types:** Native database ENUMs should be avoided to prevent difficult schema migrations. Use controlled Python strings validated at the API layer instead.
6. **Complex DB Loading Strategies:** Avoid complex cascading deletes or global eager loading (`lazy="joined"`) on relationships, as they can cause performance issues or circular dependencies. Stick to simple lazy loading.
7. **`margin_total` on Quotation (P2):** Originally proposed in the gap analysis but excluded from the implementation plan steps. It can be calculated dynamically and doesn't require a dedicated schema field for the MVP.
