import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Customer, Product, Quotation, QuoteLine, DiscountRule, User
from services.discount_service import evaluate_quotation_discount

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()

def setup_data(db):
    user = User(name="Rep", email="rep@example.com", password_hash="hash", role="sales")
    db.add(user)
    
    gold_cust = Customer(name="Gold Corp", tier="gold")
    basic_cust = Customer(name="Basic LLC", tier="basic")
    db.add_all([gold_cust, basic_cust])
    
    hw_prod = Product(name="Server", sku="HW-1", category="hardware", price=1000)
    sw_prod = Product(name="Software", sku="SW-1", category="software", price=500)
    db.add_all([hw_prod, sw_prod])
    
    db.add_all([
        DiscountRule(tier="gold", category="hardware", max_discount_percent=15),
        DiscountRule(tier="gold", category=None, max_discount_percent=10),
        DiscountRule(tier=None, category="software", max_discount_percent=5),
        DiscountRule(tier="basic", category="hardware", max_discount_percent=2),
    ])
    
    db.commit()
    return user, gold_cust, basic_cust, hw_prod, sw_prod

def test_discount_within_limit(db_session):
    user, gold_cust, basic_cust, hw_prod, sw_prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q1", customer_id=gold_cust.id, sales_rep_id=user.id)
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=hw_prod.id, quantity=1, unit_price=1000, discount_percent=10)
    db_session.add(ql)
    db_session.commit()
    
    res = evaluate_quotation_discount(db_session, quote)
    assert res["risk_score"] == 0
    assert res["approval_level"] == "no_approval"

def test_discount_exactly_at_limit(db_session):
    user, gold_cust, basic_cust, hw_prod, sw_prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q2", customer_id=gold_cust.id, sales_rep_id=user.id)
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=hw_prod.id, quantity=1, unit_price=1000, discount_percent=15)
    db_session.add(ql)
    db_session.commit()
    
    res = evaluate_quotation_discount(db_session, quote)
    assert res["risk_score"] == 0
    assert res["approval_level"] == "no_approval"

def test_discount_above_category_limit(db_session):
    user, gold_cust, basic_cust, hw_prod, sw_prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q3", customer_id=gold_cust.id, sales_rep_id=user.id)
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=sw_prod.id, quantity=1, unit_price=500, discount_percent=12) # 2 excess
    db_session.add(ql)
    db_session.commit()
    
    res = evaluate_quotation_discount(db_session, quote)
    assert res["risk_score"] == 2
    assert res["approval_level"] == "sales_manager"

def test_customer_tier_limit(db_session):
    user, gold_cust, basic_cust, hw_prod, sw_prod = setup_data(db_session)
    prod3 = Product(name="Service", sku="SVC", category="service", price=100)
    db_session.add(prod3)
    db_session.commit()
    
    quote = Quotation(quotation_number="Q4", customer_id=gold_cust.id, sales_rep_id=user.id)
    db_session.add(quote)
    db_session.commit()
    
    ql = QuoteLine(quotation_id=quote.id, product_id=prod3.id, quantity=1, unit_price=100, discount_percent=25) # 15 excess
    db_session.add(ql)
    db_session.commit()
    
    res = evaluate_quotation_discount(db_session, quote)
    assert res["risk_score"] == 15
    assert res["approval_level"] == "finance"

def test_multiple_small_violations(db_session):
    user, gold_cust, basic_cust, hw_prod, sw_prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q5", customer_id=gold_cust.id, sales_rep_id=user.id)
    db_session.add(quote)
    db_session.commit()
    
    ql1 = QuoteLine(quotation_id=quote.id, product_id=hw_prod.id, quantity=1, unit_price=1000, discount_percent=17) # 2 excess
    ql2 = QuoteLine(quotation_id=quote.id, product_id=sw_prod.id, quantity=1, unit_price=500, discount_percent=13) # 3 excess
    db_session.add_all([ql1, ql2])
    db_session.commit()
    
    res = evaluate_quotation_discount(db_session, quote)
    assert res["risk_score"] == 5
    assert res["approval_level"] == "sales_manager"
    
def test_finance_approval_required(db_session):
    user, gold_cust, basic_cust, hw_prod, sw_prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q6", customer_id=basic_cust.id, sales_rep_id=user.id)
    db_session.add(quote)
    db_session.commit()
    
    ql1 = QuoteLine(quotation_id=quote.id, product_id=hw_prod.id, quantity=1, unit_price=1000, discount_percent=15) # 13 excess
    db_session.add(ql1)
    db_session.commit()
    
    res = evaluate_quotation_discount(db_session, quote)
    assert res["risk_score"] == 13
    assert res["approval_level"] == "finance"

def test_mixed_category_quotation(db_session):
    user, gold_cust, basic_cust, hw_prod, sw_prod = setup_data(db_session)
    quote = Quotation(quotation_number="Q7", customer_id=gold_cust.id, sales_rep_id=user.id)
    db_session.add(quote)
    db_session.commit()
    
    ql1 = QuoteLine(quotation_id=quote.id, product_id=hw_prod.id, quantity=1, unit_price=1000, discount_percent=10) # 0 excess
    ql2 = QuoteLine(quotation_id=quote.id, product_id=sw_prod.id, quantity=1, unit_price=500, discount_percent=15) # 5 excess
    
    db_session.add_all([ql1, ql2])
    db_session.commit()
    
    res = evaluate_quotation_discount(db_session, quote)
    assert res["risk_score"] == 5
    assert res["approval_level"] == "sales_manager"
