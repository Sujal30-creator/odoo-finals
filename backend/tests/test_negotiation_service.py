import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from decimal import Decimal
import datetime
import time

from database import Base
from models import User, Customer, Product, Quotation, QuoteLine, NegotiationComment, Approval
from services.negotiation_service import submit_customer_counteroffer, get_negotiation_history

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
        
    cust1 = Customer(id=1, name="Customer One", tier="basic")
    cust2 = Customer(id=2, name="Customer Two", tier="gold")
    rep = User(id=1, name="Rep", email="rep@test.com", password_hash="h", role="sales")
    prod = Product(id=1, name="Prod", sku="P1", price=100)
    
    db.add_all([cust1, cust2, rep, prod])
    db.commit()
    db.close()

def setup_quotation(db, status="approved", customer_id=1):
    q = Quotation(customer_id=customer_id, sales_rep_id=1, quotation_number=f"Q_{int(time.time()*1000)}", status=status)
    db.add(q)
    db.commit()
    return q

def test_valid_customer_counteroffer():
    db = TestingSessionLocal()
    q = setup_quotation(db)
    
    nc = submit_customer_counteroffer(
        db=db,
        quotation=q,
        customer_id=1,
        comment="Can we do better on the price?",
        proposed_discount_percent=15.0
    )
    db.commit()
    
    # Check return value
    assert nc.id is not None
    assert nc.quotation_id == q.id
    assert nc.customer_id == 1
    assert nc.comment == "Can we do better on the price?"
    assert float(nc.proposed_discount_percent) == 15.0
    
    # Check quotation status changed to draft
    assert q.status == "draft"
    
    # Ensure NO approval was automatically created
    approvals = db.query(Approval).filter_by(quotation_id=q.id).count()
    assert approvals == 0

def test_customer_mismatch_rejected():
    db = TestingSessionLocal()
    q = setup_quotation(db, customer_id=1)
    
    with pytest.raises(PermissionError, match="not authorized to access this quotation"):
        submit_customer_counteroffer(db, q, 2, "I want a discount")

def test_invalid_proposed_discount_rejected():
    db = TestingSessionLocal()
    q = setup_quotation(db)
    
    with pytest.raises(ValueError, match="between 0 and 100"):
        submit_customer_counteroffer(db, q, 1, "Crazy discount!", -5)
        
    with pytest.raises(ValueError, match="between 0 and 100"):
        submit_customer_counteroffer(db, q, 1, "Crazy discount!", 105)

def test_empty_comment_rejected():
    db = TestingSessionLocal()
    q = setup_quotation(db)
    
    with pytest.raises(ValueError, match="cannot be empty"):
        submit_customer_counteroffer(db, q, 1, "")
        
    with pytest.raises(ValueError, match="cannot be empty"):
        submit_customer_counteroffer(db, q, 1, "   \n  ")

def test_negotiation_history_preserved_chronological():
    db = TestingSessionLocal()
    q = setup_quotation(db)
    
    # First comment
    submit_customer_counteroffer(db, q, 1, "Can I get 10%?", 10)
    db.commit()
    
    # Add a rep comment (simulate sales rep response without discount prop)
    nc_rep = NegotiationComment(quotation_id=q.id, user_id=1, comment="I can do 5%.")
    db.add(nc_rep)
    db.commit()
    
    # Second customer counteroffer
    submit_customer_counteroffer(db, q, 1, "Let's meet at 7%.", 7)
    db.commit()
    
    # Retrieve history
    history = get_negotiation_history(db, q.id)
    assert len(history) == 3
    
    # Verify order
    assert history[0].comment == "Can I get 10%?"
    assert history[0].customer_id == 1
    
    assert history[1].comment == "I can do 5%."
    assert history[1].user_id == 1
    
    assert history[2].comment == "Let's meet at 7%."
    assert history[2].customer_id == 1
    assert float(history[2].proposed_discount_percent) == 7.0
    
    # Ensure quotation status remains draft
    assert q.status == "draft"

def test_counteroffer_on_lost_quotation_rejected():
    db = TestingSessionLocal()
    q = setup_quotation(db, status="lost")
    
    with pytest.raises(ValueError, match="lost quotation"):
        submit_customer_counteroffer(db, q, 1, "Can we reopen this?")
        
    assert q.status == "lost"
    nc_count = db.query(NegotiationComment).filter_by(quotation_id=q.id).count()
    assert nc_count == 0

def test_counteroffer_on_ordered_quotation_rejected():
    from models import Order
    db = TestingSessionLocal()
    q = setup_quotation(db, status="approved")
    
    order = Order(order_number="ORD_123", quotation_id=q.id, customer_id=q.customer_id)
    db.add(order)
    db.commit()
    
    with pytest.raises(ValueError, match="already been converted into an order"):
        submit_customer_counteroffer(db, q, 1, "I want a discount on my order!")
        
    assert q.status == "approved"
    nc_count = db.query(NegotiationComment).filter_by(quotation_id=q.id).count()
    assert nc_count == 0
