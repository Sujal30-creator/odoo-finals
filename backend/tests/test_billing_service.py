import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models import User, Customer, Product, Quotation, QuoteLine, Order, Subscription, Invoice
from services.billing_service import generate_initial_billing, update_subscription_quantity, cancel_subscription

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_data():
    db = TestingSessionLocal()
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
        
    rep = User(id=1, name="Rep", email="r@x.com", password_hash="h", role="sales")
    cust = Customer(id=1, name="Acme", tier="basic")
    
    # Products
    p1 = Product(id=1, name="Hardware", sku="HW1", price=1000, product_type="one-time")
    p2 = Product(id=2, name="Software", sku="SW1", price=50, product_type="recurring", billing_interval="monthly")
    
    db.add_all([rep, cust, p1, p2])
    db.commit()
    yield
    db.close()

def test_initial_billing_one_time():
    db = TestingSessionLocal()
    q = Quotation(id=1, quotation_number="Q1", customer_id=1, sales_rep_id=1, status="approved")
    db.add(q)
    ql = QuoteLine(quotation_id=1, product_id=1, quantity=2, unit_price=1000, line_total=2000)
    db.add(ql)
    db.commit()
    
    o = Order(id=1, order_number="O1", quotation_id=1, customer_id=1, payment_status="UNPAID")
    db.add(o)
    db.commit()
    
    inv = generate_initial_billing(db, o)
    assert inv.amount == Decimal("2000.00")
    assert inv.status == "unpaid"
    
    subs = db.query(Subscription).filter_by(order_id=o.id).all()
    assert len(subs) == 0

def test_initial_billing_recurring():
    db = TestingSessionLocal()
    q = Quotation(id=1, quotation_number="Q1", customer_id=1, sales_rep_id=1, status="approved")
    db.add(q)
    ql = QuoteLine(quotation_id=1, product_id=2, quantity=10, unit_price=50, line_total=500)
    db.add(ql)
    db.commit()
    
    o = Order(id=1, order_number="O1", quotation_id=1, customer_id=1, payment_status="UNPAID")
    db.add(o)
    db.commit()
    
    inv = generate_initial_billing(db, o)
    assert inv.amount == Decimal("500.00")
    
    subs = db.query(Subscription).filter_by(order_id=o.id).all()
    assert len(subs) == 1
    assert subs[0].quantity == 10
    assert subs[0].amount == Decimal("50.00")
    assert subs[0].billing_interval == "monthly"

def test_initial_billing_mixed_and_idempotency():
    db = TestingSessionLocal()
    q = Quotation(id=1, quotation_number="Q1", customer_id=1, sales_rep_id=1, status="approved")
    db.add(q)
    ql1 = QuoteLine(quotation_id=1, product_id=1, quantity=1, unit_price=1000, line_total=1000)
    ql2 = QuoteLine(quotation_id=1, product_id=2, quantity=10, unit_price=50, line_total=500)
    db.add_all([ql1, ql2])
    db.commit()
    
    o = Order(id=1, order_number="O1", quotation_id=1, customer_id=1, payment_status="UNPAID")
    db.add(o)
    db.commit()
    
    inv1 = generate_initial_billing(db, o)
    assert inv1.amount == Decimal("1500.00")
    
    subs = db.query(Subscription).filter_by(order_id=o.id).all()
    assert len(subs) == 1
    
    # Check idempotency
    inv2 = generate_initial_billing(db, o)
    assert inv1.id == inv2.id
    subs_after = db.query(Subscription).filter_by(order_id=o.id).all()
    assert len(subs_after) == 1

def test_unapproved_order():
    db = TestingSessionLocal()
    q = Quotation(id=1, quotation_number="Q1", customer_id=1, sales_rep_id=1, status="pending_approval")
    db.add(q)
    db.commit()
    
    o = Order(id=1, order_number="O1", quotation_id=1, customer_id=1)
    db.add(o)
    db.commit()
    
    with pytest.raises(ValueError, match="approved before billing"):
        generate_initial_billing(db, o)

def test_subscription_quantity_increase():
    db = TestingSessionLocal()
    o = Order(id=1, order_number="O1", quotation_id=1, customer_id=1)
    db.add(o)
    db.commit()
    
    # 20 affected days left
    next_bill = datetime.now(timezone.utc) + timedelta(days=20, hours=1)
    sub = Subscription(
        customer_id=1, product_id=2, order_id=o.id,
        quantity=10, amount=Decimal("60.00"), status="active",
        billing_interval="monthly", start_date=datetime.now(timezone.utc), next_billing_date=next_bill
    )
    db.add(sub)
    db.commit()
    
    # daily rate = 60 / 30 = 2.00
    # affected days = 20
    # quantity delta = 15 - 10 = +5
    # prorated amount = 2 * 20 * 5 = 200.00
    
    inv = update_subscription_quantity(db, sub, 15)
    assert sub.quantity == 15
    assert inv.amount == Decimal("200.00")

def test_subscription_quantity_decrease():
    db = TestingSessionLocal()
    o = Order(id=1, order_number="O1", quotation_id=1, customer_id=1)
    db.add(o)
    db.commit()
    
    # 15 days left in cycle
    next_bill = datetime.now(timezone.utc) + timedelta(days=15, hours=1)
    sub = Subscription(
        customer_id=1, product_id=2, order_id=o.id,
        quantity=10, amount=Decimal("90.00"), status="active",
        billing_interval="monthly", start_date=datetime.now(timezone.utc), next_billing_date=next_bill
    )
    db.add(sub)
    db.commit()
    
    # daily rate = 90 / 30 = 3.00
    # affected days = 15
    # quantity delta = 8 - 10 = -2
    # prorated amount = 3 * 15 * (-2) = -90.00
    
    inv = update_subscription_quantity(db, sub, 8)
    assert sub.quantity == 8
    assert inv.amount == Decimal("-90.00")

def test_cancel_subscription():
    db = TestingSessionLocal()
    o = Order(id=1, order_number="O1", quotation_id=1, customer_id=1)
    db.add(o)
    db.commit()
    
    # 15 days left
    next_bill = datetime.now(timezone.utc) + timedelta(days=15, hours=1)
    sub = Subscription(
        customer_id=1, product_id=2, order_id=o.id,
        quantity=5, amount=Decimal("120.00"), status="active",
        billing_interval="monthly", start_date=datetime.now(timezone.utc), next_billing_date=next_bill
    )
    db.add(sub)
    db.commit()
    
    # daily rate = 120 / 30 = 4.00
    # affected days = 15
    # delta = -5
    # prorated amount = 4 * 15 * (-5) = -300.00
    
    inv = cancel_subscription(db, sub)
    assert sub.status == "cancelled"
    assert inv.amount == Decimal("-300.00")

def test_decimal_rounding():
    db = TestingSessionLocal()
    o = Order(id=1, order_number="O1", quotation_id=1, customer_id=1)
    db.add(o)
    db.commit()
    
    now = datetime.now(timezone.utc)
    sub = Subscription(
        customer_id=1, product_id=2, order_id=o.id,
        quantity=1, amount=Decimal("33.33"), status="active",
        billing_interval="monthly", start_date=now, next_billing_date=now
    )
    db.add(sub)
    db.commit()
    
    # daily rate = 33.33 / 30 = 1.111
    # affected days = 0 -> oh wait, if next billing is now, affected_days = 0.
    # let's set next billing to 15 days from now
    import datetime as dt
    sub.next_billing_date = now + dt.timedelta(days=15, hours=1)
    db.commit()
    
    # daily rate = 1.111
    # days = 15
    # delta = +1
    # amount = 1.111 * 15 * 1 = 16.665 -> rounds to 16.67
    
    inv = update_subscription_quantity(db, sub, 2)
    assert inv.amount == Decimal("16.67")

def test_invalid_quantity():
    db = TestingSessionLocal()
    o = Order(id=1, order_number="O1", quotation_id=1, customer_id=1)
    db.add(o)
    db.commit()
    sub = Subscription(
        customer_id=1, product_id=2, order_id=o.id,
        quantity=5, amount=Decimal("100.00"), status="active",
        billing_interval="monthly"
    )
    db.add(sub)
    db.commit()
    
    with pytest.raises(ValueError):
        update_subscription_quantity(db, sub, 0)
    
    with pytest.raises(ValueError):
        update_subscription_quantity(db, sub, -5)

def test_generate_initial_billing_invalid_order():
    db = TestingSessionLocal()
    with pytest.raises(ValueError, match="Invalid order."):
        generate_initial_billing(db, None)

def test_unsupported_billing_interval():
    db = TestingSessionLocal()
    q = Quotation(id=1, quotation_number="Q_UNSUP", customer_id=1, sales_rep_id=1, status="approved")
    db.add(q)
    
    p_yearly = Product(id=3, name="Yearly Software", sku="SW_Y", price=500, product_type="recurring", billing_interval="yearly")
    db.add(p_yearly)
    
    ql = QuoteLine(quotation_id=1, product_id=3, quantity=1, unit_price=500, line_total=500)
    db.add(ql)
    db.commit()
    
    o = Order(id=1, order_number="O_UNSUP", quotation_id=1, customer_id=1)
    db.add(o)
    db.commit()
    
    with pytest.raises(ValueError, match="Unsupported billing interval: yearly"):
        generate_initial_billing(db, o)
        
    # Check no invoices/subscriptions were created
    assert db.query(Invoice).count() == 0
    assert db.query(Subscription).count() == 0

def test_update_cancelled_subscription():
    db = TestingSessionLocal()
    o = Order(id=1, order_number="O_CANCELLED", quotation_id=1, customer_id=1)
    db.add(o)
    db.commit()
    
    now = datetime.now(timezone.utc)
    sub = Subscription(
        customer_id=1, product_id=2, order_id=o.id,
        quantity=5, amount=Decimal("100.00"), status="cancelled",
        billing_interval="monthly", start_date=now, next_billing_date=now + timedelta(days=15)
    )
    db.add(sub)
    db.commit()
    
    with pytest.raises(ValueError, match="Cannot update quantity for a cancelled subscription."):
        update_subscription_quantity(db, sub, 10)
        
    assert sub.quantity == 5 # Unchanged

def test_invalid_subscription_dates():
    db = TestingSessionLocal()
    o = Order(id=1, order_number="O_DATES", quotation_id=1, customer_id=1)
    db.add(o)
    db.commit()
    
    now = datetime.now(timezone.utc)
    
    # Missing dates
    sub_missing = Subscription(
        customer_id=1, product_id=2, order_id=o.id,
        quantity=5, amount=Decimal("100.00"), status="active",
        billing_interval="monthly"
    )
    db.add(sub_missing)
    db.commit()
    
    with pytest.raises(ValueError, match="missing required billing dates"):
        update_subscription_quantity(db, sub_missing, 10)
        
    # next_billing_date before start_date
    sub_invalid = Subscription(
        customer_id=1, product_id=2, order_id=o.id,
        quantity=5, amount=Decimal("100.00"), status="active",
        billing_interval="monthly", start_date=now, next_billing_date=now - timedelta(days=5)
    )
    db.add(sub_invalid)
    db.commit()
    
    with pytest.raises(ValueError, match="next_billing_date cannot be before start_date"):
        update_subscription_quantity(db, sub_invalid, 10)
