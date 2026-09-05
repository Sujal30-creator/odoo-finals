# DealFlow360 API Contract

This document is the shared contract between frontend and backend.

API changes must be coordinated.

---

## Authentication

### POST /api/auth/login

Request:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

---

## Quotations & Discounts

### POST /api/quotations

Create a new quotation.

**Request:**
```json
{
  "customer_id": 1,
  "sales_rep_id": 1,
  "quotation_number": "Q-1001"
}
```

**Response:**
```json
{
  "id": 1,
  "quotation_number": "Q-1001",
  "customer_id": 1,
  "sales_rep_id": 1,
  "status": "draft",
  "subtotal": 0.0,
  "discount_total": 0.0,
  "tax_total": 0.0,
  "grand_total": 0.0,
  "risk_score": 0.0,
  "lines": []
}
```

### GET /api/quotations/{id}

Retrieve a quotation and its lines.

**Response:** Matches `POST /api/quotations`.

### POST /api/quotations/{id}/lines

Add a product line to the quotation.

**Request:**
```json
{
  "product_id": 1,
  "quantity": 2,
  "unit_price": 1000.0,
  "discount_percent": 15.0,
  "tax_rate": 0.0,
  "unit_cost": 500.0
}
```

**Response:**
```json
{
  "id": 1,
  "product_id": 1,
  "quantity": 2,
  "unit_price": 1000.0,
  "discount_percent": 15.0,
  "tax_rate": 0.0,
  "line_total": 1700.0,
  "unit_cost": 500.0
}
```

### POST /api/quotations/{id}/evaluate-discount

Evaluate the risk score of the quotation limits based on current lines.

**Response:**
```json
{
  "risk_score": 5.0,
  "approval_level": "sales_manager",
  "explanation": "Manager approval needed: [Server] requested 15.0% vs allowed 10.0%"
}
```

### POST /api/quotations/{id}/submit-approval

Submit the quotation for approval routing.

**Request:**
```json
{
  "requested_by_user_id": 1
}
```

**Response:** Returns the updated quotation, and optionally the newly spawned approval sequence record if the quotation wasn't instantly approved.
```json
{
  "quotation": {
    "id": 1,
    "status": "pending_approval",
    ...
  },
  "approval": {
    "id": 1,
    "quotation_id": 1,
    "status": "pending",
    "approval_level": "sales_manager",
    "reason": "System routing based on risk.",
    "requested_by": 1,
    "approver_id": null
  }
}
```

---

## Approvals

### POST /api/approvals/{id}/action

Process a pending approval.

**Request:**
```json
{
  "user_id": 2,
  "action": "approve", 
  "reason": "Approved within limits"
}
```
*Note: Valid actions are `approve`, `reject`, and `return_for_revision`.*

**Response:** Returns the updated Quotation object. If further approval is still required (e.g., Finance), the quotation status will remain `pending_approval`. If fully approved, the status transitions to `approved`.

---

## Fulfillment

### POST /api/orders/{order_id}/fulfillment/preview

Preview automatic fulfillment allocation without permanently reserving inventory or saving records.

**Response:**
```json
{
  "total_fulfilled_quantity": 10,
  "shipment_count": 1,
  "estimated_shipping_cost": 0.0
}
```

### POST /api/orders/{order_id}/fulfillment

Confirm and process fulfillment for an approved order.

**Request (Optional Manual Override):**
```json
{
  "manual_allocations": [
    {
      "product_id": 1,
      "warehouse_id": 2,
      "quantity": 5
    }
  ]
}
```

**Response:**
```json
{
  "total_fulfilled_quantity": 5,
  "shipment_count": 1,
  "estimated_shipping_cost": 0.0,
  "fulfillments": [
    {
      "id": 1,
      "order_id": 1,
      "product_id": 1,
      "warehouse_id": 2,
      "quantity": 5
    }
  ],
  "backorders": []
}
```

### GET /api/orders/{order_id}/fulfillment

Get current fulfillment status, showing all fulfillments, backorders, and allocation totals.

**Response:** Matches `POST /api/orders/{order_id}/fulfillment`.

---

## Billing

### POST /api/orders/{order_id}/billing

Generate initial billing for an approved order.

**Response:**
```json
{
  "order_id": 1,
  "order_payment_status": "UNPAID",
  "invoices": [
    {
      "id": 1,
      "order_id": 1,
      "amount": 1500.0,
      "status": "unpaid"
    }
  ],
  "subscriptions": [
    {
      "id": 1,
      "customer_id": 1,
      "product_id": 2,
      "order_id": 1,
      "status": "active",
      "billing_interval": "monthly",
      "quantity": 10,
      "amount": 50.0,
      "start_date": "2026-09-01T12:00:00Z",
      "next_billing_date": "2026-10-01T12:00:00Z"
    }
  ]
}
```
*Note: This endpoint is idempotent. Calling it multiple times for the same order returns the existing billing state.*
*Validation errors:* `400 Bad Request` if order is unapproved or product has unsupported billing interval.

### GET /api/orders/{order_id}/billing

Retrieve the current billing state (invoices and subscriptions) for an order.

**Response:** Matches `POST /api/orders/{order_id}/billing`.

### PATCH /api/subscriptions/{subscription_id}/quantity

Update the quantity of an active subscription, generating a prorated adjustment invoice.

**Request:**
```json
{
  "new_quantity": 15
}
```

**Response:**
```json
{
  "subscription": {
    "id": 1,
    "customer_id": 1,
    "product_id": 2,
    "order_id": 1,
    "status": "active",
    "billing_interval": "monthly",
    "quantity": 15,
    "amount": 50.0,
    "start_date": "2026-09-01T12:00:00Z",
    "next_billing_date": "2026-10-01T12:00:00Z"
  },
  "prorated_invoice": {
    "id": 2,
    "order_id": 1,
    "amount": 166.67,
    "status": "unpaid"
  }
}
```
*Validation errors:* `422 Unprocessable Entity` if `new_quantity <= 0`. `400 Bad Request` if subscription is cancelled or dates are invalid.