import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models import (
    User, Customer, Product, Quotation, QuoteLine,
    NegotiationComment, Approval, Order, Backorder, Fulfillment, Warehouse
)
from services.deal_health_service import evaluate_deal_health


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    yield session
    session.close()


def setup_base_data(db):
    rep = User(name="Rep", email="rep@example.com", password_hash="h", role="sales")
    mgr = User(name="Manager", email="mgr@example.com", password_hash="h", role="sales_manager")
    cust = Customer(name="Acme Corp", tier="basic")
    prod = Product(name="Widget", sku="W1", price=100)
    wh = Warehouse(name="WH1", location="Loc1")
    db.add_all([rep, mgr, cust, prod, wh])
    db.commit()
    return rep, mgr, cust, prod, wh


# 1. Fresh healthy quotation -> GREEN with zero anomalies
def test_fresh_healthy_quotation(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-HEALTHY",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=0.0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "green"
    assert len(health["anomalies"]) == 0


# 2. High discount risk -> CRITICAL/RED
def test_high_discount_risk(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-HIGH-RISK",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=15.5,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "red"
    assert len(health["anomalies"]) == 1
    anomaly = health["anomalies"][0]
    assert anomaly["type"] == "high_discount_risk"
    assert anomaly["severity"] == "critical"
    assert anomaly["value"] == 15.5
    assert "15.5" in anomaly["message"]


# 3. Three negotiation comments -> YELLOW with negotiation_fatigue
def test_negotiation_fatigue(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-FATIGUE",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=5.0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    now = datetime.now(timezone.utc)
    for i in range(3):
        nc = NegotiationComment(
            quotation_id=quote.id,
            customer_id=cust.id,
            comment=f"Comment {i + 1}",
            created_at=now
        )
        db.add(nc)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "yellow"
    assert len(health["anomalies"]) == 1
    anomaly = health["anomalies"][0]
    assert anomaly["type"] == "negotiation_fatigue"
    assert anomaly["severity"] == "warning"
    assert anomaly["value"] == 3
    assert "3" in anomaly["message"]


# 4. Rejected approval -> RED
def test_rejected_approval(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-REJECTED",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=0.0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    appr = Approval(
        quotation_id=quote.id,
        requested_by=rep.id,
        approver_id=mgr.id,
        status="rejected",
        approval_level="sales_manager",
        created_at=datetime.now(timezone.utc)
    )
    db.add(appr)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "red"
    assert len(health["anomalies"]) == 1
    anomaly = health["anomalies"][0]
    assert anomaly["type"] == "approval_churn"
    assert anomaly["severity"] == "critical"
    assert anomaly["value"] == 1


# 5. More than two approval records -> YELLOW if no critical anomalies
def test_more_than_two_approvals_warning(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-CHURN-WARN",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=0.0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    now = datetime.now(timezone.utc)
    for i in range(3):
        appr = Approval(
            quotation_id=quote.id,
            requested_by=rep.id,
            approver_id=mgr.id,
            status="approved",
            approval_level="sales_manager",
            created_at=now
        )
        db.add(appr)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "yellow"
    assert len(health["anomalies"]) == 1
    anomaly = health["anomalies"][0]
    assert anomaly["type"] == "approval_churn"
    assert anomaly["severity"] == "warning"
    assert anomaly["value"] == 3
    assert "3" in anomaly["message"]


# 6. Stalled draft quotation older than 7 days -> YELLOW
def test_stalled_draft_quotation_older_than_7_days(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    old_time = datetime.now(timezone.utc) - timedelta(days=9)
    quote = Quotation(
        quotation_number="Q-STALLED",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=0.0,
        created_at=old_time
    )
    db.add(quote)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "yellow"
    assert len(health["anomalies"]) == 1
    anomaly = health["anomalies"][0]
    assert anomaly["type"] == "stalled_deal"
    assert anomaly["severity"] == "warning"
    assert anomaly["value"] >= 7
    assert str(anomaly["value"]) in anomaly["message"]


# 7. Recent draft quotation -> no stalled anomaly
def test_recent_draft_quotation_not_stalled(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    recent_time = datetime.now(timezone.utc) - timedelta(days=2)
    quote = Quotation(
        quotation_number="Q-RECENT",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=0.0,
        created_at=recent_time
    )
    db.add(quote)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "green"
    assert len(health["anomalies"]) == 0


# 8. Backorder with remaining quantity -> RED
def test_backorder_with_remaining_quantity(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-BO",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="approved",
        risk_score=0.0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    order = Order(
        order_number="ORD-BO",
        quotation_id=quote.id,
        customer_id=cust.id,
        status="processing",
        payment_status="PAID"
    )
    db.add(order)
    db.commit()

    bo = Backorder(
        order_id=order.id,
        product_id=prod.id,
        remaining_quantity=4
    )
    db.add(bo)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "red"
    assert len(health["anomalies"]) == 1
    anomaly = health["anomalies"][0]
    assert anomaly["type"] == "supply_chain_blocked"
    assert anomaly["severity"] == "critical"
    assert anomaly["value"] == 4
    assert "4" in anomaly["message"]


# 9. Unpaid fulfilled order -> RED
def test_unpaid_fulfilled_order(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-UNPAID",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="approved",
        risk_score=0.0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    order = Order(
        order_number="ORD-UNPAID",
        quotation_id=quote.id,
        customer_id=cust.id,
        status="processing",
        payment_status="UNPAID"
    )
    db.add(order)
    db.commit()

    f = Fulfillment(
        order_id=order.id,
        product_id=prod.id,
        warehouse_id=wh.id,
        quantity=5
    )
    db.add(f)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "red"
    assert len(health["anomalies"]) == 1
    anomaly = health["anomalies"][0]
    assert anomaly["type"] == "payment_risk"
    assert anomaly["severity"] == "critical"
    assert anomaly["value"] == "UNPAID"
    assert "UNPAID" in anomaly["message"]


# 10. Missing order -> no supply-chain/payment anomaly
def test_missing_order_no_supply_chain_or_payment_anomaly(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-NO-ORDER",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="approved",
        risk_score=0.0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "green"
    assert len(health["anomalies"]) == 0


# 11. Multiple warnings -> RED when total anomalies >= 2
def test_multiple_warnings_lead_to_red(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    old_time = datetime.now(timezone.utc) - timedelta(days=10)
    quote = Quotation(
        quotation_number="Q-MULTI-WARN",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=0.0,
        created_at=old_time
    )
    db.add(quote)
    db.commit()

    # Warning 1: negotiation fatigue (3 comments)
    # Give them old timestamps so they don't refresh the stalled deal activity
    for i in range(3):
        nc = NegotiationComment(
            quotation_id=quote.id,
            customer_id=cust.id,
            comment=f"Comment {i + 1}",
            created_at=old_time
        )
        db.add(nc)
    db.commit()

    # Warning 2: stalled deal (both created_at and comments are 10 days old)
    health = evaluate_deal_health(db, quote)
    assert len(health["anomalies"]) == 2
    types = {a["type"] for a in health["anomalies"]}
    assert types == {"negotiation_fatigue", "stalled_deal"}
    for a in health["anomalies"]:
        assert a["severity"] == "warning"

    # Total warnings >= 2 must result in RED overall status
    assert health["health_status"] == "red"


# 12. Critical + warning -> RED
def test_critical_plus_warning_leads_to_red(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-CRIT-WARN",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=15.0,  # Critical anomaly
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    # Warning anomaly: 3 comments
    now = datetime.now(timezone.utc)
    for i in range(3):
        nc = NegotiationComment(
            quotation_id=quote.id,
            customer_id=cust.id,
            comment=f"Comment {i + 1}",
            created_at=now
        )
        db.add(nc)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "red"
    assert len(health["anomalies"]) == 2
    types = {a["type"] for a in health["anomalies"]}
    assert "high_discount_risk" in types
    assert "negotiation_fatigue" in types


# 13. Dynamic latest activity:
#     - recent negotiation/approval prevents stalled status
#     - old quotation with recent activity is not marked stalled
def test_dynamic_latest_activity_negotiation_prevents_stalled(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    old_quote_time = datetime.now(timezone.utc) - timedelta(days=15)
    recent_comment_time = datetime.now(timezone.utc) - timedelta(days=1)

    quote = Quotation(
        quotation_number="Q-DYN-NEG",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=0.0,
        created_at=old_quote_time
    )
    db.add(quote)
    db.commit()

    nc = NegotiationComment(
        quotation_id=quote.id,
        customer_id=cust.id,
        comment="Recent touchpoint",
        created_at=recent_comment_time
    )
    db.add(nc)
    db.commit()

    health = evaluate_deal_health(db, quote)
    stalled_anomalies = [a for a in health["anomalies"] if a["type"] == "stalled_deal"]
    assert len(stalled_anomalies) == 0
    assert health["health_status"] == "green"


def test_dynamic_latest_activity_approval_prevents_stalled(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    old_quote_time = datetime.now(timezone.utc) - timedelta(days=20)
    recent_approval_time = datetime.now(timezone.utc) - timedelta(days=2)

    quote = Quotation(
        quotation_number="Q-DYN-APPR",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=0.0,
        created_at=old_quote_time
    )
    db.add(quote)
    db.commit()

    appr = Approval(
        quotation_id=quote.id,
        requested_by=rep.id,
        approver_id=mgr.id,
        status="approved",
        approval_level="sales_manager",
        created_at=recent_approval_time
    )
    db.add(appr)
    db.commit()

    health = evaluate_deal_health(db, quote)
    stalled_anomalies = [a for a in health["anomalies"] if a["type"] == "stalled_deal"]
    assert len(stalled_anomalies) == 0
    assert health["health_status"] == "green"


def test_dynamic_latest_activity_old_activity_triggers_stalled(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    old_quote_time = datetime.now(timezone.utc) - timedelta(days=30)
    old_comment_time = datetime.now(timezone.utc) - timedelta(days=10)

    quote = Quotation(
        quotation_number="Q-DYN-OLD",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="negotiating",
        risk_score=0.0,
        created_at=old_quote_time
    )
    db.add(quote)
    db.commit()

    nc = NegotiationComment(
        quotation_id=quote.id,
        customer_id=cust.id,
        comment="Old comment",
        created_at=old_comment_time
    )
    db.add(nc)
    db.commit()

    health = evaluate_deal_health(db, quote)
    stalled_anomalies = [a for a in health["anomalies"] if a["type"] == "stalled_deal"]
    assert len(stalled_anomalies) == 1
    assert stalled_anomalies[0]["value"] >= 10


# 14. Explainability:
#     - anomaly messages contain the relevant count/value
def test_explainability_all_anomalies(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    old_time = datetime.now(timezone.utc) - timedelta(days=12)

    quote = Quotation(
        quotation_number="Q-EXPLAIN",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=25.0,
        created_at=old_time
    )
    db.add(quote)
    db.commit()

    # 3 comments
    for i in range(3):
        db.add(NegotiationComment(
            quotation_id=quote.id,
            customer_id=cust.id,
            comment=f"C{i}",
            created_at=old_time
        ))

    # 1 rejected approval
    db.add(Approval(
        quotation_id=quote.id,
        requested_by=rep.id,
        status="rejected",
        approval_level="sales_manager",
        created_at=old_time
    ))

    # Order with backorder and unpaid fulfillment
    order = Order(
        order_number="ORD-EXPLAIN",
        quotation_id=quote.id,
        customer_id=cust.id,
        status="processing",
        payment_status="UNPAID"
    )
    db.add(order)
    db.commit()

    db.add(Backorder(order_id=order.id, product_id=prod.id, remaining_quantity=7))
    db.add(Fulfillment(order_id=order.id, product_id=prod.id, warehouse_id=wh.id, quantity=3))
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "red"

    # Check all 6 anomalies are present and explainable
    anomaly_types = {a["type"]: a for a in health["anomalies"]}
    expected_types = {
        "high_discount_risk",
        "negotiation_fatigue",
        "approval_churn",
        "stalled_deal",
        "supply_chain_blocked",
        "payment_risk",
    }
    assert set(anomaly_types.keys()) == expected_types

    for a_type, a in anomaly_types.items():
        assert isinstance(a["message"], str) and len(a["message"]) > 0
        assert a["severity"] in ("critical", "warning")
        assert a["value"] is not None
        assert str(a["value"]) in a["message"]


# Edge case tests
def test_approved_quotation_not_stalled_even_if_old(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    old_time = datetime.now(timezone.utc) - timedelta(days=20)
    quote = Quotation(
        quotation_number="Q-APPROVED-OLD",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="approved",
        risk_score=0.0,
        created_at=old_time
    )
    db.add(quote)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert len(health["anomalies"]) == 0
    assert health["health_status"] == "green"


def test_backorder_zero_remaining_quantity(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-BO-ZERO",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="approved",
        risk_score=0.0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    order = Order(
        order_number="ORD-BO-ZERO",
        quotation_id=quote.id,
        customer_id=cust.id,
        status="processing",
        payment_status="PAID"
    )
    db.add(order)
    db.commit()

    db.add(Backorder(order_id=order.id, product_id=prod.id, remaining_quantity=0))
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert len(health["anomalies"]) == 0
    assert health["health_status"] == "green"


def test_unpaid_order_without_fulfillment(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-UNPAID-NO-FULFILL",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="approved",
        risk_score=0.0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    order = Order(
        order_number="ORD-UNPAID-NO-F",
        quotation_id=quote.id,
        customer_id=cust.id,
        status="processing",
        payment_status="UNPAID"
    )
    db.add(order)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert len(health["anomalies"]) == 0
    assert health["health_status"] == "green"


def test_fulfilled_paid_order(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-PAID-FULFILLED",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="approved",
        risk_score=0.0,
        created_at=datetime.now(timezone.utc)
    )
    db.add(quote)
    db.commit()

    order = Order(
        order_number="ORD-PAID",
        quotation_id=quote.id,
        customer_id=cust.id,
        status="completed",
        payment_status="PAID"
    )
    db.add(order)
    db.commit()

    db.add(Fulfillment(order_id=order.id, product_id=prod.id, warehouse_id=wh.id, quantity=2))
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert len(health["anomalies"]) == 0
    assert health["health_status"] == "green"


def test_nullable_timestamps_handled_safely(db):
    rep, mgr, cust, prod, wh = setup_base_data(db)
    quote = Quotation(
        quotation_number="Q-NULL-TS",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
        risk_score=0.0,
        created_at=None
    )
    db.add(quote)
    db.commit()

    health = evaluate_deal_health(db, quote)
    assert health["health_status"] == "green"
    assert len(health["anomalies"]) == 0


def test_none_quotation_raises_error(db):
    with pytest.raises(ValueError, match="Quotation must be provided"):
        evaluate_deal_health(db, None)
