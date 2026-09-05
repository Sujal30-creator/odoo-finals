import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import get_db, Base
from models import User, Customer, Product, DiscountRule

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
Base.metadata.create_all(engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_data():
    db = TestingSessionLocal()
    # clean db
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    
    rep = User(id=1, name="Rep", email="r@x.com", password_hash="h", role="sales")
    mgr = User(id=2, name="Mgr", email="m@x.com", password_hash="h", role="sales_manager")
    fin = User(id=3, name="Fin", email="f@x.com", password_hash="h", role="finance")
    cust = Customer(id=1, name="GoldCorp", tier="gold")
    prod = Product(id=1, name="Server", sku="S1", category="hw", price=1000)
    rule = DiscountRule(id=1, tier="gold", category="hw", max_discount_percent=10)
    
    db.add_all([rep, mgr, fin, cust, prod, rule])
    db.commit()
    db.close()
    
def test_create_quotation():
    resp = client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q1"})
    assert resp.status_code == 200
    assert resp.json()["quotation_number"] == "Q1"

def test_add_quote_line():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q1"})
    resp = client.post("/api/quotations/1/lines", json={
        "product_id": 1,
        "quantity": 1,
        "unit_price": 1000,
        "discount_percent": 15
    })
    assert resp.status_code == 200
    assert resp.json()["discount_percent"] == 15.0

def test_evaluate_discount():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q1"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 1, "unit_price": 1000, "discount_percent": 15})
    
    resp = client.post("/api/quotations/1/evaluate-discount")
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_score"] == 5.0
    assert data["approval_level"] == "sales_manager"

def test_submit_for_approval():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q1"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 1, "unit_price": 1000, "discount_percent": 15})
    
    resp = client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1})
    assert resp.status_code == 200
    data = resp.json()
    assert data["quotation"]["status"] == "pending_approval"
    assert data["approval"]["approval_level"] == "sales_manager"

def test_manager_approval():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q1"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 1, "unit_price": 1000, "discount_percent": 15})
    sub = client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1}).json()
    appr_id = sub["approval"]["id"]
    
    resp = client.post(f"/api/approvals/{appr_id}/action", json={"user_id": 2, "action": "approve"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"
    
def test_finance_approval_when_required():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q1"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 1, "unit_price": 1000, "discount_percent": 25})
    
    sub = client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1}).json()
    appr1_id = sub["approval"]["id"]
    
    mgr_appr = client.post(f"/api/approvals/{appr1_id}/action", json={"user_id": 2, "action": "approve"}).json()
    assert mgr_appr["status"] == "pending_approval"
    
    db = TestingSessionLocal()
    from models import Approval
    fin_appr = db.query(Approval).filter(Approval.quotation_id == 1, Approval.status == "pending").first()
    fin_appr_id = fin_appr.id
    db.close()
    
    fin_resp = client.post(f"/api/approvals/{fin_appr_id}/action", json={"user_id": 3, "action": "approve"}).json()
    assert fin_resp["status"] == "approved"

def test_reject():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q1"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 1, "unit_price": 1000, "discount_percent": 15})
    sub = client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1}).json()
    appr_id = sub["approval"]["id"]
    
    res = client.post(f"/api/approvals/{appr_id}/action", json={"user_id": 2, "action": "reject"}).json()
    assert res["status"] == "lost"

def test_return_for_revision():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q1"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 1, "unit_price": 1000, "discount_percent": 15})
    sub = client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1}).json()
    appr_id = sub["approval"]["id"]
    
    res = client.post(f"/api/approvals/{appr_id}/action", json={"user_id": 2, "action": "return_for_revision"}).json()
    assert res["status"] == "draft"

def test_invalid_state_transition():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q1"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 1, "unit_price": 1000, "discount_percent": 15})
    sub = client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1}).json()
    appr_id = sub["approval"]["id"]
    
    client.post(f"/api/approvals/{appr_id}/action", json={"user_id": 2, "action": "approve"})
    res = client.post(f"/api/approvals/{appr_id}/action", json={"user_id": 2, "action": "approve"})
    assert res.status_code == 400

def test_invalid_ids():
    assert client.get("/api/quotations/999").status_code == 404
    assert client.post("/api/approvals/999/action", json={"user_id": 2, "action": "approve"}).status_code == 404
