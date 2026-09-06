import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models import User, Customer, Product, Quotation, QuoteLine, DiscountRule
from services import pricing_advisor_service as svc
from services.discount_service import evaluate_quotation_discount

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

def _seed(db):
    rep = User(name="Rep", email="rep@ex.com", password_hash="h", role="sales_rep")
    cust = Customer(name="Acme", tier="enterprise")
    p1 = Product(name="P1", sku="1", category="software", price=100.0, unit_cost=50.0)
    rule = DiscountRule(tier="enterprise", category="software", max_discount_percent=15.0)
    db.add_all([rep, cust, p1, rule])
    db.commit()
    
    q = Quotation(quotation_number="Q1", customer_id=cust.id, sales_rep_id=rep.id, status="draft")
    db.add(q)
    db.commit()
    
    line = QuoteLine(
        quotation_id=q.id,
        product_id=p1.id,
        quantity=10,
        unit_price=100.0,
        discount_percent=0.0,
        tax_rate=0.0,
        line_total=1000.0,
        unit_cost=50.0,
    )
    db.add(line)
    db.commit()
    
    return q

@patch("services.pricing_advisor_service.OpenAI")
def test_valid_pricing_recommendation(mock_openai_class, db):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    
    mock_completion = MagicMock()
    # AI recommends 10%
    mock_completion.choices = [
        MagicMock(message=MagicMock(content='{"recommended_discount_percent": 10.0, "reason": "Test reason", "recommendation_strength": "high", "supporting_factors": []}'))
    ]
    mock_client.chat.completions.create.return_value = mock_completion
    
    q = _seed(db)
    res = svc.get_discount_recommendation(db, q.id)
    
    assert res["quotation_id"] == q.id
    assert res["current_discount_percent"] == 0.0
    assert res["allowed_discount_percent"] == 15.0
    assert res["recommended_discount_percent"] == 10.0
    # Revenue at 10% discount for 1000 subtotal is 900. Cost is 500. Margin = 400/900 = 44.44%
    assert round(res["expected_margin_percent"], 1) == 44.4

@patch("services.pricing_advisor_service.OpenAI")
def test_recommendation_clamped_to_policy_limit(mock_openai_class, db):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    
    mock_completion = MagicMock()
    # AI recommends 25%, but policy max is 15%
    mock_completion.choices = [
        MagicMock(message=MagicMock(content='{"recommended_discount_percent": 25.0, "reason": "Test", "recommendation_strength": "low", "supporting_factors": []}'))
    ]
    mock_client.chat.completions.create.return_value = mock_completion
    
    q = _seed(db)
    res = svc.get_discount_recommendation(db, q.id)
    
    # Must be clamped
    assert res["recommended_discount_percent"] == 15.0

@patch("services.pricing_advisor_service.OpenAI")
def test_fallback_on_openai_failure(mock_openai_class, db):
    mock_client = MagicMock()
    mock_openai_class.return_value = mock_client
    mock_client.chat.completions.create.side_effect = Exception("API down")
    
    q = _seed(db)
    res = svc.get_discount_recommendation(db, q.id)
    
    # Fallback to policy max
    assert res["recommended_discount_percent"] == 15.0
    assert "temporarily unavailable" in res["reason"]

def test_nonexistent_quotation(db):
    with pytest.raises(LookupError):
        svc.get_discount_recommendation(db, 9999)
