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