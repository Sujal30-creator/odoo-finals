from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from models import Quotation, NegotiationComment, Approval, Order, Backorder, Fulfillment


def _to_utc(dt: datetime) -> datetime:
    """Normalize datetime to timezone-aware UTC datetime."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _get_negotiation_comments(db: Session, quotation: Quotation):
    if quotation.id is not None and db is not None:
        try:
            return (
                db.query(NegotiationComment)
                .filter(NegotiationComment.quotation_id == quotation.id)
                .all()
            )
        except Exception:
            pass
    return getattr(quotation, "negotiation_comments", []) or []


def _get_approvals(db: Session, quotation: Quotation):
    if quotation.id is not None and db is not None:
        try:
            return (
                db.query(Approval)
                .filter(Approval.quotation_id == quotation.id)
                .all()
            )
        except Exception:
            pass
    return getattr(quotation, "approvals", []) or []


def _get_orders(db: Session, quotation: Quotation):
    if quotation.id is not None and db is not None:
        try:
            return (
                db.query(Order)
                .filter(Order.quotation_id == quotation.id)
                .all()
            )
        except Exception:
            pass
    return getattr(quotation, "orders", []) or []


def _get_backorders(db: Session, order: Order):
    if order.id is not None and db is not None:
        try:
            return (
                db.query(Backorder)
                .filter(Backorder.order_id == order.id)
                .all()
            )
        except Exception:
            pass
    return getattr(order, "backorders", []) or []


def _get_fulfillments(db: Session, order: Order):
    if order.id is not None and db is not None:
        try:
            return (
                db.query(Fulfillment)
                .filter(Fulfillment.order_id == order.id)
                .all()
            )
        except Exception:
            pass
    return getattr(order, "fulfillments", []) or []


def evaluate_deal_health(db: Session, quotation: Quotation) -> dict:
    """
    Deterministically evaluates the health and anomalies of a quotation
    based on the rules in docs/BUSINESS_RULES.md.

    Does not mutate any database models or commit changes.
    """
    if not quotation:
        raise ValueError("Quotation must be provided.")

    anomalies = []

    # 1. HIGH DISCOUNT RISK
    # Trigger: quotation.risk_score > 10.0
    # Severity: critical
    risk_score = float(quotation.risk_score or 0)
    if risk_score > 10.0:
        anomalies.append({
            "type": "high_discount_risk",
            "severity": "critical",
            "message": f"Quotation risk score ({risk_score}) exceeds critical threshold of 10.0.",
            "value": risk_score
        })

    # 2. NEGOTIATION FATIGUE
    # Trigger: count of NegotiationComment records > 2
    # Severity: warning
    comments = _get_negotiation_comments(db, quotation)
    comment_count = len(comments)
    if comment_count > 2:
        anomalies.append({
            "type": "negotiation_fatigue",
            "severity": "warning",
            "message": f"Customer has submitted {comment_count} negotiation comments.",
            "value": comment_count
        })

    # 3. APPROVAL CHURN
    # Trigger:
    # - any Approval.status == "rejected" -> critical
    # OR
    # - number of Approval records > 2 -> warning
    approvals = _get_approvals(db, quotation)
    approval_count = len(approvals)
    has_rejected = any(getattr(a, "status", None) == "rejected" for a in approvals)

    if has_rejected:
        rejected_count = sum(1 for a in approvals if getattr(a, "status", None) == "rejected")
        anomalies.append({
            "type": "approval_churn",
            "severity": "critical",
            "message": f"Quotation has {rejected_count} rejected approval record(s) (total approvals: {approval_count}).",
            "value": approval_count
        })
    elif approval_count > 2:
        anomalies.append({
            "type": "approval_churn",
            "severity": "warning",
            "message": f"Quotation has {approval_count} approval records, indicating approval churn.",
            "value": approval_count
        })

    # 4. STALLED DEAL
    # Trigger:
    # quotation.status in ["draft", "negotiating"] AND latest activity is older than 7 days.
    # Latest activity dynamically calculated from:
    # - quotation.created_at
    # - latest NegotiationComment.created_at
    # - latest Approval.created_at
    # Severity: warning
    if quotation.status in ["draft", "negotiating"]:
        timestamps = []
        if quotation.created_at is not None:
            timestamps.append(quotation.created_at)
        for c in comments:
            if getattr(c, "created_at", None) is not None:
                timestamps.append(c.created_at)
        for a in approvals:
            if getattr(a, "created_at", None) is not None:
                timestamps.append(a.created_at)

        if timestamps:
            utc_timestamps = [_to_utc(ts) for ts in timestamps if ts is not None]
            if utc_timestamps:
                latest_activity = max(utc_timestamps)
                now = datetime.now(timezone.utc)
                diff = now - latest_activity
                if diff > timedelta(days=7):
                    days_inactive = diff.days
                    anomalies.append({
                        "type": "stalled_deal",
                        "severity": "warning",
                        "message": f"Quotation has had no activity for {days_inactive} days (status: '{quotation.status}').",
                        "value": days_inactive
                    })

    # 5. SUPPLY CHAIN BLOCKED & 6. PAYMENT RISK
    orders = _get_orders(db, quotation)
    if orders:
        # Rule 5: SUPPLY CHAIN BLOCKED
        # Trigger: quotation has an associated Order AND Order has Backorder records with remaining_quantity > 0
        # Severity: critical
        active_backorders = []
        for order in orders:
            backorders = _get_backorders(db, order)
            for b in backorders:
                rem = getattr(b, "remaining_quantity", 0) or 0
                if rem > 0:
                    active_backorders.append(b)

        if active_backorders:
            total_remaining = sum(b.remaining_quantity for b in active_backorders)
            anomalies.append({
                "type": "supply_chain_blocked",
                "severity": "critical",
                "message": f"Order has {len(active_backorders)} active backorder(s) with {total_remaining} unfulfilled units.",
                "value": total_remaining
            })

        # Rule 6: PAYMENT RISK
        # Trigger: quotation has an associated Order AND fulfillment exists AND order.payment_status == "UNPAID"
        # Severity: critical
        unpaid_fulfilled_orders = []
        total_fulfillments = 0
        for order in orders:
            fulfillments = _get_fulfillments(db, order)
            payment_status = (getattr(order, "payment_status", "") or "").upper()
            if len(fulfillments) > 0 and payment_status == "UNPAID":
                unpaid_fulfilled_orders.append(order)
                total_fulfillments += len(fulfillments)

        if unpaid_fulfilled_orders:
            anomalies.append({
                "type": "payment_risk",
                "severity": "critical",
                "message": f"Order has {total_fulfillments} fulfillment(s) but payment status is UNPAID.",
                "value": "UNPAID"
            })

    # OVERALL HEALTH STATUS
    # GREEN: zero anomalies
    # YELLOW: one or more warning anomalies, no critical anomaly, fewer than two total anomalies
    # RED: any critical anomaly OR two or more total anomalies
    critical_count = sum(1 for a in anomalies if a["severity"] == "critical")
    warning_count = sum(1 for a in anomalies if a["severity"] == "warning")
    total_count = len(anomalies)

    if total_count == 0:
        health_status = "green"
    elif critical_count > 0 or total_count >= 2:
        health_status = "red"
    elif warning_count > 0 and total_count < 2:
        health_status = "yellow"
    else:
        health_status = "green"

    return {
        "health_status": health_status,
        "anomalies": anomalies
    }
