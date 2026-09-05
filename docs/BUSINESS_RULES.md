# DealFlow360 - Business Rules

## 1. Discount Governance

Discount limits can depend on:

- Customer tier
- Product category

Example:

Gold customer:
15% general limit

Hardware:
15%

Services:
10%

The applicable category-specific limit must be checked for every quote line.

---

## 2. Line Discount Risk

For each quote line:

risk_excess =
max(0, actual_discount - allowed_discount)

A line within its allowed limit has zero excess.

A line above its allowed limit contributes risk.

---

## 3. Blended Risk

The quotation can contain multiple lines.

The system must consider the overall pattern of discount violations.

Example:

Line 1 = 2 points over
Line 2 = 3 points over
Line 3 = 2 points over

Combined excess = 7 points

The implementation uses the simplest deterministic blended risk formula:
**Blended Risk Score** = sum of all `risk_excess` points across all lines.

The formula must be:

- deterministic
- documented
- testable
- explainable

Do not pretend to use ML when a deterministic rule is being used.

---

## 4. Approval Routing

Depending on risk:

No approval required
OR
Sales Manager approval
OR
Sales Manager → Finance approval

The exact thresholds implemented are:
- `risk_score == 0`: No approval required
- `0 < risk_score <= 10`: Sales Manager approval
- `risk_score > 10`: Finance approval

Approval must be triggered automatically.

The sales representative should not have to manually request approval.

---

## 5. Approval Actions

A reviewer can:

- Approve
- Reject
- Return for revision

Every action must create an audit record containing:

- user
- timestamp
- action
- reason

---

## 6. Upsell / Cross-sell

Recommendations may use:

- historical co-purchase relationships
- active promotions
- margin threshold

A recommendation should have:

- product
- reason
- expected margin impact

Only healthy-margin products should surface when minimum margin rules apply.

---

## 7. Margin

At minimum:

line_revenue =
quantity × unit_price × (1 - discount%)

line_margin =
line_revenue - (quantity × unit_cost)

Quote margin is derived from quote lines.

Adding/removing products must immediately update the quote margin.

---

## 8. Warehouse Fulfillment

For every product quantity requested:

1. Check available inventory across warehouses.
2. Allocate available stock.
3. Prefer a split that balances:
   - stock availability
   - shipment count
   - configured shipping cost weighting

If inventory is insufficient:

remaining quantity becomes backorder.

Manual override must be possible.

---

## 9. Backorder

A backorder records:

- product
- remaining quantity
- order
- expected fulfillment

When stock becomes available, the system may propose consolidating remaining
backorder quantities.

---

## 10. Product Types

The MVP supports:

### One-time

Billed once.

### Recurring

Has:

- subscription plan
- billing interval
- next billing date

A single order can contain both.

---

## 11. Proration

When a recurring subscription changes during a billing cycle:

prorated_charge =
affected_days × daily_rate × quantity_difference

The precise day-count convention must be documented by the implementation.

---

## 12. Cancellation / Refund

Cancellation may create:

- partial refund
OR
- credit note

based on configured rules.

---

## 13. Customer Negotiation

Customer portal allows:

- line-level questions
- change requests
- counter discounts
- quotation confirmation

Customer access must be restricted to their own quotation.

---

## 14. Negotiation Re-approval

When negotiation changes pricing:

1. Recalculate discount risk.
2. Compare against approval rules.
3. If threshold is exceeded:
   return quote to approval.
4. Otherwise:
   continue toward confirmation.

---

## 15. Deal Health

A quote may be considered at risk because of:

### Stalled Deal

Quotation has been inactive beyond a configurable number of days.

### Discount Anomaly

Current discount is significantly higher than the representative's historical average.

### Delivery Slippage

Expected delivery is delayed relative to the promised date.

The implementation can initially use deterministic rules.

---

## 16. Payment Status

Possible states should be explicit.

Example:

UNPAID
→ PARTIALLY_PAID
→ PAID

Invoice/order status must update when payment is recorded.

---

## 17. Important Principle

Never make the UI the source of truth.

The backend must validate:

- discounts
- approval state
- inventory
- billing
- customer permissions
- order state