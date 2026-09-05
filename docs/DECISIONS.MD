# Architecture Decisions

## Decision Template

### DEC-001

Date:
Owner:

Decision:

Reason:

Alternatives considered:

Impact:

---

## DEC-001 - MVP Strategy

Decision:

Prioritize a deterministic, explainable business-rule implementation
over unnecessary ML complexity.

Reason:

The hackathon evaluates functional business workflows and requires
core rules to work in application logic.

Impact:

Recommendation, anomaly and risk features can initially use rules,
scoring and historical data instead of trained models.

---

## DEC-002 - Backend as Source of Truth

Decision:

Business decisions are validated by backend services.

Reason:

Prevents frontend-only logic from producing invalid orders.

Impact:

Frontend displays state; backend determines state.

---

## DEC-003 - Quote as Central Business Object

Decision:

Quotation connects customer, products, discounts, approvals,
fulfillment, billing and negotiation.

Reason:

The quotation is the central object in the required end-to-end flow.