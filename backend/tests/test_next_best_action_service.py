"""
Tests for services/next_best_action_service.py
===============================================
All tests use SQLite in-memory DB (same pattern as existing test suite).
No external APIs are called.
"""
import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models import (
    User, Customer, Product, Quotation, QuoteLine,
    NegotiationComment, Approval, Order, Backorder, Fulfillment, Warehouse,
)
from services.next_best_action_service import get_next_best_action


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

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


def _base(db):
    rep  = User(name="Rep",     email="rep@x.com",  password_hash="h", role="sales_rep")
    mgr  = User(name="Manager", email="mgr@x.com",  password_hash="h", role="sales_manager")
    cust = Customer(name="Acme", tier="basic")
    prod = Product(name="Widget", sku="W1", price=100, unit_cost=50)
    wh   = Warehouse(name="WH1", location="Loc1")
    db.add_all([rep, mgr, cust, prod, wh])
    db.commit()
    return rep, mgr, cust, prod, wh


def _quote(db, rep, cust, risk_score=0.0, status="draft", days_old=0):
    created = datetime.now(timezone.utc) - timedelta(days=days_old)
    q = Quotation(
        quotation_number=f"Q-{id(cust)}-{status}",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status=status,
        risk_score=risk_score,
        created_at=created,
    )
    db.add(q)
    db.commit()
    return q


# ---------------------------------------------------------------------------
# 1. Critical discount risk → review_discount wins
# ---------------------------------------------------------------------------

def test_critical_discount_risk(db):
    rep, mgr, cust, prod, wh = _base(db)
    q = _quote(db, rep, cust, risk_score=15.5)

    result = get_next_best_action(db, q)

    assert result["quotation_id"] == q.id
    assert result["priority"]     == "critical"
    assert result["action_type"]  == "review_discount"
    assert "15.5" in result["reason"]
    assert "high_discount_risk" in result["source_signals"]


# ---------------------------------------------------------------------------
# 2. Supply-chain / fulfillment issue → review_fulfillment
# ---------------------------------------------------------------------------

def test_supply_chain_blocked(db):
    rep, mgr, cust, prod, wh = _base(db)
    q = _quote(db, rep, cust, status="approved")

    order = Order(
        order_number="ORD-SC",
        quotation_id=q.id,
        customer_id=cust.id,
        status="processing",
        payment_status="UNPAID",
    )
    db.add(order)
    db.commit()

    bo = Backorder(order_id=order.id, product_id=prod.id, remaining_quantity=5)
    db.add(bo)
    db.commit()

    result = get_next_best_action(db, q)

    assert result["priority"]    == "critical"
    assert result["action_type"] == "review_fulfillment"
    assert "5" in result["reason"]
    assert "supply_chain_blocked" in result["source_signals"]


# ---------------------------------------------------------------------------
# 3. Payment risk → chase_payment
# ---------------------------------------------------------------------------

def test_payment_risk(db):
    rep, mgr, cust, prod, wh = _base(db)
    q = _quote(db, rep, cust, status="approved")

    order = Order(
        order_number="ORD-PAY",
        quotation_id=q.id,
        customer_id=cust.id,
        status="processing",
        payment_status="UNPAID",
    )
    db.add(order)
    db.commit()

    # Fulfillment exists → payment risk triggers
    f = Fulfillment(order_id=order.id, product_id=prod.id, warehouse_id=wh.id, quantity=3)
    db.add(f)
    db.commit()

    result = get_next_best_action(db, q)

    assert result["priority"]    == "critical"
    assert result["action_type"] == "chase_payment"
    assert "UNPAID" in result["reason"]
    assert "payment_risk" in result["source_signals"]


# ---------------------------------------------------------------------------
# 4. Negotiation requiring attention → respond_to_customer
# ---------------------------------------------------------------------------

def test_negotiation_fatigue(db):
    rep, mgr, cust, prod, wh = _base(db)
    q = _quote(db, rep, cust)

    now = datetime.now(timezone.utc)
    for i in range(3):
        db.add(NegotiationComment(
            quotation_id=q.id,
            customer_id=cust.id,
            comment=f"Comment {i}",
            created_at=now,
        ))
    db.commit()

    result = get_next_best_action(db, q)

    assert result["priority"]    == "warning"
    assert result["action_type"] == "respond_to_customer"
    assert "3" in result["reason"]
    assert "negotiation_fatigue" in result["source_signals"]


# ---------------------------------------------------------------------------
# 5. Stalled deal → follow_up_customer
# ---------------------------------------------------------------------------

def test_stalled_deal(db):
    rep, mgr, cust, prod, wh = _base(db)
    q = _quote(db, rep, cust, days_old=10)  # 10 days old, no other activity

    result = get_next_best_action(db, q)

    assert result["priority"]    == "warning"
    assert result["action_type"] == "follow_up_customer"
    assert "10" in result["reason"] or "day" in result["reason"]
    assert "stalled_deal" in result["source_signals"]


# ---------------------------------------------------------------------------
# 6. Healthy deal → continue_deal_progress
# ---------------------------------------------------------------------------

def test_healthy_deal_no_action_needed(db):
    rep, mgr, cust, prod, wh = _base(db)
    q = _quote(db, rep, cust)  # fresh, no anomalies

    result = get_next_best_action(db, q)

    assert result["priority"]    == "normal"
    assert result["action_type"] == "continue_deal_progress"
    assert result["source_signals"] == []


# ---------------------------------------------------------------------------
# 7. Non-existent quotation → LookupError
# ---------------------------------------------------------------------------

def test_nonexistent_quotation(db):
    with pytest.raises(LookupError):
        get_next_best_action(db, None)


# ---------------------------------------------------------------------------
# 8. Priority ordering: critical discount beats stalled deal
# ---------------------------------------------------------------------------

def test_critical_beats_warning(db):
    rep, mgr, cust, prod, wh = _base(db)
    # Both: high risk (critical) AND stalled deal (warning)
    q = _quote(db, rep, cust, risk_score=15.0, days_old=10)

    result = get_next_best_action(db, q)

    # Critical must win over warning
    assert result["priority"]    == "critical"
    assert result["action_type"] == "review_discount"
    # Both signals should be present
    assert "high_discount_risk" in result["source_signals"]
    assert "stalled_deal"       in result["source_signals"]


# ---------------------------------------------------------------------------
# 9. Rejected approval (critical) beats negotiation fatigue (warning)
# ---------------------------------------------------------------------------

def test_rejected_approval_beats_negotiation_fatigue(db):
    rep, mgr, cust, prod, wh = _base(db)
    q = _quote(db, rep, cust)

    # Add rejected approval
    db.add(Approval(
        quotation_id=q.id,
        requested_by=rep.id,
        status="rejected",
        approval_level="sales_manager",
    ))
    # Add negotiation fatigue
    now = datetime.now(timezone.utc)
    for i in range(3):
        db.add(NegotiationComment(
            quotation_id=q.id, customer_id=cust.id,
            comment=f"C{i}", created_at=now,
        ))
    db.commit()

    result = get_next_best_action(db, q)

    assert result["priority"]    == "critical"
    assert result["action_type"] == "resolve_approval"


# ---------------------------------------------------------------------------
# 10. Supply chain beats payment risk (both critical, P2 < P3)
# ---------------------------------------------------------------------------

def test_supply_chain_beats_payment_risk(db):
    rep, mgr, cust, prod, wh = _base(db)
    q = _quote(db, rep, cust, status="approved")

    order = Order(
        order_number="ORD-SC-PAY",
        quotation_id=q.id,
        customer_id=cust.id,
        status="processing",
        payment_status="UNPAID",
    )
    db.add(order)
    db.commit()

    # Both supply chain blocked AND payment risk
    db.add(Backorder(order_id=order.id, product_id=prod.id, remaining_quantity=3))
    db.add(Fulfillment(order_id=order.id, product_id=prod.id, warehouse_id=wh.id, quantity=2))
    db.commit()

    result = get_next_best_action(db, q)

    # P2 (supply chain) wins over P3 (payment)
    assert result["action_type"] == "review_fulfillment"
    assert "supply_chain_blocked" in result["source_signals"]
    assert "payment_risk"         in result["source_signals"]
