"""
Next Best Action Service
========================
Deterministic, rule-based engine that inspects a quotation's current signals
and returns the single highest-priority action a Sales Rep or Manager should
take next.

Rules are ordered by priority (lower number = higher priority):

  P1  high_discount_risk      → review_discount
  P1  approval_churn (crit)   → resolve_approval
  P2  supply_chain_blocked     → review_fulfillment
  P3  payment_risk             → chase_payment
  P4  negotiation_fatigue      → respond_to_customer
  P5  stalled_deal             → follow_up_customer
  P6  approval_churn (warn)    → review_approval_history
  P6  (any warning)            → review_deal_health
  P7  no anomalies             → continue_deal_progress

This service is READ-ONLY. It does not commit anything to the database.
It reuses evaluate_deal_health() to avoid duplicating business logic.
"""

from __future__ import annotations
from sqlalchemy.orm import Session

import models
from services.deal_health_service import evaluate_deal_health

# ---------------------------------------------------------------------------
# Priority table: maps anomaly type → (priority_rank, priority_label,
#   action_type, action_text, reason_template)
# priority_rank: lower = higher priority (1 = most critical)
# ---------------------------------------------------------------------------

_ANOMALY_RULES = [
    # P1 – Critical discount risk
    {
        "type":           "high_discount_risk",
        "severity":       "critical",
        "priority_rank":  1,
        "priority":       "critical",
        "action_type":    "review_discount",
        "action":         "Review the discount and request manager approval.",
        "reason_tpl":     "Quotation risk score ({value}) exceeds the critical threshold of 10.0. "
                          "Discounts are outside the configured limits and require manager or finance review.",
    },
    # P1 – Approval rejected (critical approval churn)
    {
        "type":           "approval_churn",
        "severity":       "critical",
        "priority_rank":  1,
        "priority":       "critical",
        "action_type":    "resolve_approval",
        "action":         "Revise the quotation to address the rejection reason and resubmit for approval.",
        "reason_tpl":     "One or more approval records for this quotation have been rejected. "
                          "The quotation cannot proceed until the issues are resolved and a new approval is obtained.",
    },
    # P2 – Supply chain blocked
    {
        "type":           "supply_chain_blocked",
        "severity":       "critical",
        "priority_rank":  2,
        "priority":       "critical",
        "action_type":    "review_fulfillment",
        "action":         "Review the fulfillment allocation and address the inventory shortage.",
        "reason_tpl":     "The order has active backorders with {value} unfulfilled unit(s). "
                          "Delivery cannot complete until inventory is resolved.",
    },
    # P3 – Payment risk
    {
        "type":           "payment_risk",
        "severity":       "critical",
        "priority_rank":  3,
        "priority":       "critical",
        "action_type":    "chase_payment",
        "action":         "Chase payment from the customer immediately.",
        "reason_tpl":     "The order has been fulfilled but the payment status is UNPAID. "
                          "Revenue is at risk until payment is collected.",
    },
    # P4 – Negotiation fatigue (customer waiting for a response)
    {
        "type":           "negotiation_fatigue",
        "severity":       "warning",
        "priority_rank":  4,
        "priority":       "warning",
        "action_type":    "respond_to_customer",
        "action":         "Respond to the customer's counter-offer in the negotiation portal.",
        "reason_tpl":     "The customer has submitted {value} negotiation comment(s). "
                          "Leaving the customer without a response increases the risk of losing the deal.",
    },
    # P5 – Stalled deal
    {
        "type":           "stalled_deal",
        "severity":       "warning",
        "priority_rank":  5,
        "priority":       "warning",
        "action_type":    "follow_up_customer",
        "action":         "Follow up with the customer to re-engage the deal.",
        "reason_tpl":     "This quotation has had no activity for {value} day(s). "
                          "Deals with no activity for more than 7 days are at risk of going cold.",
    },
    # P6 – Approval churn (warning only — multiple approval rounds but none rejected)
    {
        "type":           "approval_churn",
        "severity":       "warning",
        "priority_rank":  6,
        "priority":       "warning",
        "action_type":    "review_approval_history",
        "action":         "Review the approval history and streamline the discount terms.",
        "reason_tpl":     "This quotation has gone through {value} approval round(s). "
                          "Simplifying the discount structure may reduce future churn.",
    },
]

# Fallback when no anomaly matches
_FALLBACK_ACTION = {
    "priority_rank":  7,
    "priority":       "normal",
    "action_type":    "continue_deal_progress",
    "action":         "Continue progressing the deal.",
    "reason":         "No critical or warning issues detected. The deal is on track — keep momentum.",
    "source_signals": [],
}


def _render_reason(template: str, value) -> str:
    """Substitute {value} placeholder in reason templates."""
    try:
        return template.format(value=value)
    except (KeyError, IndexError):
        return template


def get_next_best_action(db: Session, quotation: models.Quotation) -> dict:
    """
    Analyse the quotation and return the single highest-priority next action.

    Returns a dict matching NextBestActionResponse schema:
      quotation_id, priority, action_type, action, reason, source_signals

    This function is READ-ONLY and does not commit anything.
    Raises LookupError if quotation is None.
    """
    if quotation is None:
        raise LookupError("Quotation not found")

    # Reuse the existing deal-health evaluation to get anomalies
    health_result = evaluate_deal_health(db, quotation)
    anomalies = health_result.get("anomalies", [])

    if not anomalies:
        result = dict(_FALLBACK_ACTION)
        result["quotation_id"] = quotation.id
        return result

    # Index anomalies by (type, severity) for fast lookup
    anomaly_index: dict[tuple, dict] = {}
    for anomaly in anomalies:
        key = (anomaly["type"], anomaly["severity"])
        anomaly_index[key] = anomaly

    # Find the highest-priority matching rule
    best_rule = None
    best_rank = 999
    matched_anomaly = None

    for rule in _ANOMALY_RULES:
        key = (rule["type"], rule["severity"])
        if key in anomaly_index and rule["priority_rank"] < best_rank:
            best_rule = rule
            best_rank = rule["priority_rank"]
            matched_anomaly = anomaly_index[key]

    if best_rule is None:
        # Anomalies exist but no rule matched (should not happen with current rule table)
        result = dict(_FALLBACK_ACTION)
        result["quotation_id"] = quotation.id
        result["source_signals"] = [a["type"] for a in anomalies]
        return result

    value = matched_anomaly.get("value", "")
    reason = _render_reason(best_rule["reason_tpl"], value)

    # Collect all matching anomaly types as source signals
    source_signals = [a["type"] for a in anomalies]

    return {
        "quotation_id":   quotation.id,
        "priority":       best_rule["priority"],
        "action_type":    best_rule["action_type"],
        "action":         best_rule["action"],
        "reason":         reason,
        "source_signals": source_signals,
    }
