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

## 10. Product Types & Billing Triggers

The MVP supports:

### One-time
Billed once. One-time quote lines are charged immediately.

### Recurring
Has a subscription plan, billing interval, and next billing date. Recurring quote lines create Subscription records.
A single order can contain both.

### Initial Billing Trigger & Invoice
- Billing is generated explicitly after the order is approved.
- It must NOT depend on fulfillment completion.
- One API/service call will generate the initial billing records.
- Repeated generation must be idempotent and must not create duplicate subscriptions/invoices.
- The first subscription cycle is included in the initial Invoice along with one-time charges.
- The Invoice is linked to the Order.
- Order/Invoice payment status initially starts as `UNPAID`.

---

## 11. Proration & Subscription Changes

When a recurring subscription changes during a billing cycle:

prorated_charge = affected_days × daily_rate × quantity_difference

### Day-Count Convention
Use a simple deterministic convention:
- monthly recurring billing period = 30 days
- daily rate = subscription amount / 30
- affected_days = number of days remaining in the current 30-day cycle

### Subscription Quantity Change
- Quantity increase creates a prorated charge for the additional quantity for the remaining days.
- Quantity decrease creates a prorated credit amount.
- Update the subscription quantity after calculating the adjustment.
- Do not silently delete billing history.

---

## 12. Cancellation / Refunds

For MVP:
- Cancellation does not automatically issue a cash refund.
- Any resulting credit/refund behavior is represented as a billing adjustment/credit decision and can be extended later.

---

## 13. Billing Safety, Idempotency & Math

- Initial billing cannot be generated twice for the same order.
- Existing subscription/invoice records must not be duplicated.
- Billing calculations must use deterministic rounding.
- **Money Rounding**: Use decimal arithmetic rather than floating-point arithmetic for billing calculations. Round monetary results to 2 decimal places using a consistent Decimal rounding strategy.

---

## 14. Customer Portal Security & View

For the MVP, the Customer Portal uses a mock customer identity mechanism at the API boundary:
- The caller supplies a `customer_id`.
- Every portal quotation lookup MUST strictly enforce: `quotation.customer_id == caller_customer_id`.
- A 403 Forbidden error must be returned when attempting to access another customer's quotation.
- This is MOCK authentication and is not production-grade authentication.

### Customer-Facing Quotation Data
Customers may view:
- quotation_number
- status
- subtotal, tax_total, grand_total
- product name, quantity, unit price
- applied customer-facing discount
- negotiation comments relevant to their quotation

Customers may NOT view internal operational information, including:
- unit cost
- risk score
- internal approval chain / routing
- manager or finance internal reasons
- internal discount thresholds

---

## 15. Customer Counteroffer & Negotiation Flow

### 15.1 Customer Counteroffer
A Customer:
- can view only quotations belonging to their customer account.
- can submit a negotiation comment.
- can optionally submit a `proposed_discount_percent`.
- cannot directly approve or reject their own quotation.
- cannot modify internal approval information.

When a customer submits a counteroffer:
- Create a `NegotiationComment` record.
- Associate it with the quotation and customer.
- Change the quotation status to `"draft"`.
- Do NOT automatically create an `Approval` record.

### 15.2 Negotiation History
- `NegotiationComment` records must be preserved.
- Do not delete previous negotiation messages.
- A new customer counteroffer creates a new comment/record.

### 15.3 Sales Rep Review
A Sales Rep reviews the counteroffer and awaits action in the `"draft"` state.
The Sales Rep:
- may update the quotation/quote lines to reflect an accepted counteroffer.
- may reject/ignore the proposal.
- may submit the revised quotation through the existing `ApprovalService`.

### 15.4 Re-approval
When the Sales Rep submits the revised quotation:
- Use the existing `ApprovalService`.
- Create a new `Approval` record (a new approval round).
- Evaluate the revised discount using the existing `DiscountService`.
- Apply the existing approval thresholds.
- Preserve previous `Approval` records as historical audit records.

---

## 16. Deal Health / Anomaly Detection

A quotation or deal is evaluated using deterministic, explainable rules. The health status is categorized into an overall color (GREEN, YELLOW, RED) based on the presence and severity of anomalies.

### 16.1 Deterministic Rules

**1. HIGH DISCOUNT RISK**
- **Trigger:** `quotation.risk_score > 10.0`
- **Severity:** Critical
- **Explanation:** Should include the current risk score.

**2. NEGOTIATION FATIGUE**
- **Trigger:** Count of `NegotiationComment` records > 2
- **Severity:** Warning
- **Explanation:** Should include the total negotiation comment count.

**3. APPROVAL CHURN**
- **Trigger:** Count of `Approval` records > 2, OR any `Approval` record has `status == "rejected"`
- **Severity:**
  - Rejected approval = Critical
  - >2 approval records without a rejection = Warning

**4. STALLED DEAL**
- **Trigger:** `quotation.status` is `"draft"` or `"negotiating"`, AND the latest activity timestamp is older than 7 days.
  - *Note:* The latest activity timestamp must be dynamically calculated as the maximum timestamp among `quotation.created_at`, `NegotiationComment.created_at`, and `Approval.created_at`. Do not rely on `last_activity_at`.
- **Severity:** Warning

**5. SUPPLY CHAIN BLOCKED**
- **Trigger:** The quotation has an associated `Order` AND the `Order` has one or more `Backorder` records with `remaining_quantity > 0`.
- **Severity:** Critical

**6. PAYMENT RISK**
- **Trigger:** The quotation has an associated `Order`, fulfillment exists, AND `order.payment_status == "UNPAID"`.
- **Severity:** Critical

### 16.2 Overall Health Status

The overall status is determined by the anomalies detected:

- **GREEN:** Zero anomalies
- **YELLOW:** One non-critical anomaly, OR multiple warnings without a Critical anomaly
- **RED:** Any Critical anomaly, OR two or more anomalies of any severity

### 16.3 Explainability & Architecture

Every detected anomaly must return:
- anomaly type
- severity
- human-readable explanation
- relevant measured value/count where useful

Example:
```json
{
  "type": "negotiation_fatigue",
  "severity": "warning",
  "message": "Customer has submitted 3 negotiation comments."
}
```

- **No Machine Learning:** The MVP remains deterministic, rule-based, and derived solely from existing application data.
- **Database:** No new tables or columns are required.
- **Sales Manager View:** The dashboard should show quotation number, overall health status, anomaly count, anomaly explanations, supporting values, and current quotation status.
- **Internal Only:** Do NOT expose internal restrictions to customers incorrectly; Deal Health is an internal sales/management view.

---

## 17. Payment Status

Possible states should be explicit.

Example:

UNPAID
→ PARTIALLY_PAID
→ PAID

Invoice/order status must update when payment is recorded.

---

## 18. Important Principle

Never make the UI the source of truth.

The backend must validate:

- discounts
- approval state
- inventory
- billing
- customer permissions
- order state