import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Customer, Product, Quotation, QuoteLine, DiscountRule, User, Approval
from services.approval_service import submit_for_approval, process_approval

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()

def setup_data(db):
    sales_rep = User(name="Rep", email="rep@example.com", password_hash="hash", role="sales")
    manager = User(name="Manager", email="mgr@example.com", password_hash="hash", role="sales_manager")
    finance = User(name="Finance", email="fin@example.com", password_hash="hash", role="finance")
    db.add_all([sales_rep, manager, finance])
    
    cust = Customer(name="Gold Corp", tier="gold")
    db.add(cust)
    
    prod = Product(name="Server", sku="HW-1", category="hardware", price=1000)
    db.add(prod)
    
    db.add(DiscountRule(tier="gold", category="hardware", max_discount_percent=10))
    db.commit()
    return sales_rep, manager, finance, cust, prod

def test_no_approval_required(db_session):
    sales_rep, manager, finance, cust, prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q1", customer_id=cust.id, sales_rep_id=sales_rep.id, status="draft")
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=prod.id, quantity=1, unit_price=1000, discount_percent=5)
    db_session.add(ql)
    db_session.commit()
    
    approval = submit_for_approval(db_session, quote, sales_rep)
    assert approval is None
    assert quote.status == "approved"

def test_manager_approval_required_and_approves(db_session):
    sales_rep, manager, finance, cust, prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q2", customer_id=cust.id, sales_rep_id=sales_rep.id, status="draft")
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=prod.id, quantity=1, unit_price=1000, discount_percent=15)
    db_session.add(ql)
    db_session.commit()
    
    approval = submit_for_approval(db_session, quote, sales_rep)
    assert approval is not None
    assert approval.approval_level == "sales_manager"
    assert quote.status == "pending_approval"
    
    process_approval(db_session, approval, manager, "approve", "Looks good")
    assert approval.status == "approved"
    assert quote.status == "approved"
    
def test_manager_rejects(db_session):
    sales_rep, manager, finance, cust, prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q3", customer_id=cust.id, sales_rep_id=sales_rep.id, status="draft")
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=prod.id, quantity=1, unit_price=1000, discount_percent=15)
    db_session.add(ql)
    db_session.commit()
    
    approval = submit_for_approval(db_session, quote, sales_rep)
    process_approval(db_session, approval, manager, "reject", "Too high")
    assert approval.status == "rejected"
    assert quote.status == "lost"

def test_manager_returns_for_revision(db_session):
    sales_rep, manager, finance, cust, prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q4", customer_id=cust.id, sales_rep_id=sales_rep.id, status="draft")
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=prod.id, quantity=1, unit_price=1000, discount_percent=15)
    db_session.add(ql)
    db_session.commit()
    
    approval = submit_for_approval(db_session, quote, sales_rep)
    process_approval(db_session, approval, manager, "return_for_revision", "Reduce to 12%")
    assert approval.status == "returned"
    assert quote.status == "draft"

def test_finance_approval_sequence(db_session):
    sales_rep, manager, finance, cust, prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q5", customer_id=cust.id, sales_rep_id=sales_rep.id, status="draft")
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=prod.id, quantity=1, unit_price=1000, discount_percent=25)
    db_session.add(ql)
    db_session.commit()
    
    approval = submit_for_approval(db_session, quote, sales_rep)
    assert approval.approval_level == "sales_manager"
    
    process_approval(db_session, approval, manager, "approve")
    
    assert quote.status == "pending_approval"
    
    finance_appr = db_session.query(Approval).filter_by(quotation_id=quote.id, status="pending").first()
    assert finance_appr is not None
    assert finance_appr.approval_level == "finance"
    
    process_approval(db_session, finance_appr, finance, "approve")
    assert quote.status == "approved"

def test_unauthorized_approval_attempt(db_session):
    sales_rep, manager, finance, cust, prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q6", customer_id=cust.id, sales_rep_id=sales_rep.id, status="draft")
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=prod.id, quantity=1, unit_price=1000, discount_percent=15)
    db_session.add(ql)
    db_session.commit()
    
    approval = submit_for_approval(db_session, quote, sales_rep)
    
    with pytest.raises(PermissionError):
        process_approval(db_session, approval, sales_rep, "approve")

def test_invalid_approval_transition(db_session):
    sales_rep, manager, finance, cust, prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q7", customer_id=cust.id, sales_rep_id=sales_rep.id, status="draft")
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=prod.id, quantity=1, unit_price=1000, discount_percent=15)
    db_session.add(ql)
    db_session.commit()
    
    approval = submit_for_approval(db_session, quote, sales_rep)
    process_approval(db_session, approval, manager, "approve")
    
    with pytest.raises(ValueError, match="Invalid state transition"):
        process_approval(db_session, approval, manager, "approve")

def test_second_approval_round_after_revision(db_session):
    sales_rep, manager, finance, cust, prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q8", customer_id=cust.id, sales_rep_id=sales_rep.id, status="draft")
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=prod.id, quantity=1, unit_price=1000, discount_percent=15)
    db_session.add(ql)
    db_session.commit()
    
    # Round 1
    approval = submit_for_approval(db_session, quote, sales_rep)
    process_approval(db_session, approval, manager, "return_for_revision")
    assert quote.status == "draft"
    
    # Rep lowers discount
    ql.discount_percent = 5
    db_session.commit()
    
    # Round 2
    approval2 = submit_for_approval(db_session, quote, sales_rep)
    assert approval2 is None
    assert quote.status == "approved"
