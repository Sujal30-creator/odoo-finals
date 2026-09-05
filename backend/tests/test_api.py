import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import get_db, Base
from models import User, Customer, Product, DiscountRule
import models

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

def test_api_fulfillment_unapproved_rejected():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q2"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 10, "unit_price": 1000, "discount_percent": 0})
    
    db = TestingSessionLocal()
    from models import Order
    order = Order(order_number="O2", quotation_id=1, customer_id=1)
    db.add(order)
    db.commit()
    db.close()
    
    resp = client.post("/api/orders/1/fulfillment/preview") # Order 1 was created from Q2
    assert resp.status_code == 400
    assert "Quotation is not approved" in resp.json()["detail"]

def test_api_fulfillment_automatic_success_and_preview():
    # Setup approved order
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q3"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 10, "unit_price": 1000, "discount_percent": 0})
    sub = client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1}).json()
    # Risk is 0, so it should be auto-approved
    assert sub["quotation"]["status"] == "approved"
    
    db = TestingSessionLocal()
    from models import Order, Warehouse, Inventory
    order = Order(order_number="O3", quotation_id=1, customer_id=1)
    db.add(order)
    w1 = Warehouse(name="W1", is_active=True)
    db.add(w1)
    db.commit()
    
    inv = Inventory(product_id=1, warehouse_id=w1.id, quantity=20, reserved_quantity=0)
    db.add(inv)
    db.commit()
    db.refresh(order)
    order_id = order.id
    db.close()
    
    # Preview
    resp = client.post(f"/api/orders/{order_id}/fulfillment/preview")
    assert resp.status_code == 200
    assert resp.json()["total_fulfilled_quantity"] == 10
    assert resp.json()["shipment_count"] == 1
    
    # Check that it didn't reserve permanently
    db = TestingSessionLocal()
    inv = db.query(Inventory).filter_by(product_id=1).first()
    assert inv.reserved_quantity == 0
    db.close()
    
    # Confirm
    resp = client.post(f"/api/orders/{order_id}/fulfillment")
    assert resp.status_code == 200
    assert resp.json()["total_fulfilled_quantity"] == 10
    
    # Status GET
    resp = client.get(f"/api/orders/{order_id}/fulfillment")
    assert resp.status_code == 200
    assert resp.json()["total_fulfilled_quantity"] == 10
    assert len(resp.json()["fulfillments"]) == 1
    assert len(resp.json()["backorders"]) == 0

def test_api_fulfillment_manual_override_and_rejection():
    # Setup approved order
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q4"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 5, "unit_price": 1000, "discount_percent": 0})
    client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1})
    
    db = TestingSessionLocal()
    from models import Order, Warehouse, Inventory
    order = Order(order_number="O4", quotation_id=1, customer_id=1)
    w1 = Warehouse(name="W2", is_active=True)
    db.add_all([order, w1])
    db.commit()
    
    inv = Inventory(product_id=1, warehouse_id=w1.id, quantity=20, reserved_quantity=0)
    db.add(inv)
    db.commit()
    order_id = order.id
    w1_id = w1.id
    db.close()
    
    # Manual Allocation
    resp = client.post(f"/api/orders/{order_id}/fulfillment", json={
        "manual_allocations": [
            {"product_id": 1, "warehouse_id": w1_id, "quantity": 5}
        ]
    })
    assert resp.status_code == 200
    assert resp.json()["total_fulfilled_quantity"] == 5
    
    # Attempt override on processed order
    resp = client.post(f"/api/orders/{order_id}/fulfillment", json={
        "manual_allocations": [
            {"product_id": 1, "warehouse_id": w1_id, "quantity": 5}
        ]
    })
    assert resp.status_code == 400
    assert "has already been processed" in resp.json()["detail"]

def test_api_fulfillment_multi_warehouse():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q_MW"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 20, "unit_price": 1000, "discount_percent": 0})
    client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1})
    
    db = TestingSessionLocal()
    from models import Order, Warehouse, Inventory
    order = Order(order_number="O_MW", quotation_id=1, customer_id=1)
    w1 = Warehouse(name="W1", is_active=True)
    w2 = Warehouse(name="W2", is_active=True)
    db.add_all([order, w1, w2])
    db.commit()
    
    inv1 = Inventory(product_id=1, warehouse_id=w1.id, quantity=15, reserved_quantity=0)
    inv2 = Inventory(product_id=1, warehouse_id=w2.id, quantity=15, reserved_quantity=0)
    db.add_all([inv1, inv2])
    db.commit()
    order_id = order.id
    db.close()
    
    resp = client.post(f"/api/orders/{order_id}/fulfillment")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_fulfilled_quantity"] == 20
    assert data["shipment_count"] == 2
    assert len(data["fulfillments"]) == 2
    assert len(data["backorders"]) == 0

def test_api_fulfillment_insufficient_stock():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q_IS"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 30, "unit_price": 1000, "discount_percent": 0})
    client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1})
    
    db = TestingSessionLocal()
    from models import Order, Warehouse, Inventory
    order = Order(order_number="O_IS", quotation_id=1, customer_id=1)
    w1 = Warehouse(name="W1", is_active=True)
    w2 = Warehouse(name="W2", is_active=True)
    db.add_all([order, w1, w2])
    db.commit()
    
    inv1 = Inventory(product_id=1, warehouse_id=w1.id, quantity=15, reserved_quantity=0)
    inv2 = Inventory(product_id=1, warehouse_id=w2.id, quantity=5, reserved_quantity=0)
    db.add_all([inv1, inv2])
    db.commit()
    order_id = order.id
    db.close()
    
    resp = client.post(f"/api/orders/{order_id}/fulfillment")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_fulfilled_quantity"] == 20
    assert len(data["fulfillments"]) == 2
    assert len(data["backorders"]) == 1
    assert data["backorders"][0]["remaining_quantity"] == 10

def test_api_fulfillment_idempotency():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q_IDEM"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 10, "unit_price": 1000, "discount_percent": 0})
    client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1})
    
    db = TestingSessionLocal()
    from models import Order, Warehouse, Inventory
    order = Order(order_number="O_IDEM", quotation_id=1, customer_id=1)
    w1 = Warehouse(name="W1", is_active=True)
    db.add_all([order, w1])
    db.commit()
    
    inv = Inventory(product_id=1, warehouse_id=w1.id, quantity=20, reserved_quantity=0)
    db.add(inv)
    db.commit()
    order_id = order.id
    db.close()
    
    resp1 = client.post(f"/api/orders/{order_id}/fulfillment")
    assert resp1.status_code == 200
    assert len(resp1.json()["fulfillments"]) == 1
    
    resp2 = client.post(f"/api/orders/{order_id}/fulfillment")
    assert resp2.status_code == 200
    assert len(resp2.json()["fulfillments"]) == 1 # unchanged

def test_api_fulfillment_invalid_manual_quantity():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q_INV"})
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 5, "unit_price": 1000, "discount_percent": 0})
    client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1})
    
    db = TestingSessionLocal()
    from models import Order
    order = Order(order_number="O_INV", quotation_id=1, customer_id=1)
    db.add(order)
    db.commit()
    order_id = order.id
    db.close()
    
    resp_zero = client.post(f"/api/orders/{order_id}/fulfillment", json={
        "manual_allocations": [{"product_id": 1, "warehouse_id": 1, "quantity": 0}]
    })
    assert resp_zero.status_code == 422
    
    resp_neg = client.post(f"/api/orders/{order_id}/fulfillment", json={
        "manual_allocations": [{"product_id": 1, "warehouse_id": 1, "quantity": -5}]
    })
    assert resp_neg.status_code == 422

def setup_approved_order_for_billing(db, items):
    q = models.Quotation(customer_id=1, sales_rep_id=1, quotation_number="Q_BILL")
    db.add(q)
    db.commit()
    
    q.status = "approved"
    
    for item in items:
        p = models.Product(name=item['name'], sku=item['sku'], price=item['price'], product_type=item['type'], billing_interval=item.get('interval', None))
        db.add(p)
        db.commit()
        
        ql = models.QuoteLine(quotation_id=q.id, product_id=p.id, quantity=item['qty'], unit_price=item['price'], line_total=item['qty']*item['price'])
        db.add(ql)
    
    db.commit()
    
    o = models.Order(order_number="O_BILL", quotation_id=q.id, customer_id=1, payment_status="UNPAID")
    db.add(o)
    db.commit()
    return o

def test_api_billing_unapproved_rejected():
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q_UNAPP"})
    
    db = TestingSessionLocal()
    from models import Order
    order = Order(order_number="O_UNAPP", quotation_id=1, customer_id=1)
    db.add(order)
    db.commit()
    order_id = order.id
    db.close()
    
    resp = client.post(f"/api/orders/{order_id}/billing")
    assert resp.status_code == 400
    assert "approved" in resp.json()["detail"]

def test_api_billing_approved_mixed():
    db = TestingSessionLocal()
    o = setup_approved_order_for_billing(db, [
        {"name": "Hardware", "sku": "HW_1", "price": 1000, "type": "one-time", "qty": 1},
        {"name": "Software", "sku": "SW_1", "price": 50, "type": "recurring", "interval": "monthly", "qty": 10}
    ])
    order_id = o.id
    db.close()
    
    resp = client.post(f"/api/orders/{order_id}/billing")
    assert resp.status_code == 200
    data = resp.json()
    assert data["order_payment_status"] == "UNPAID"
    assert data["invoices"][0]["amount"] == 1500.0
    assert data["invoices"][0]["status"] == "unpaid"
    assert len(data["subscriptions"]) == 1
    assert data["subscriptions"][0]["amount"] == 50.0
    assert data["subscriptions"][0]["quantity"] == 10
    
    # GET status
    resp_get = client.get(f"/api/orders/{order_id}/billing")
    assert resp_get.status_code == 200
    assert resp_get.json()["invoices"][0]["amount"] == 1500.0

def test_api_billing_idempotency():
    db = TestingSessionLocal()
    o = setup_approved_order_for_billing(db, [
        {"name": "Hardware", "sku": "HW_2", "price": 1000, "type": "one-time", "qty": 1}
    ])
    order_id = o.id
    db.close()
    
    resp1 = client.post(f"/api/orders/{order_id}/billing")
    assert resp1.status_code == 200
    inv1_id = resp1.json()["invoices"][0]["id"]
    
    resp2 = client.post(f"/api/orders/{order_id}/billing")
    assert resp2.status_code == 200
    inv2_id = resp2.json()["invoices"][0]["id"]
    
    assert inv1_id == inv2_id

def test_api_subscription_quantity_update_increase():
    db = TestingSessionLocal()
    o = setup_approved_order_for_billing(db, [
        {"name": "Software", "sku": "SW_2", "price": 50, "type": "recurring", "interval": "monthly", "qty": 10}
    ])
    order_id = o.id
    db.close()
    
    client.post(f"/api/orders/{order_id}/billing")
    
    resp_get = client.get(f"/api/orders/{order_id}/billing")
    sub_id = resp_get.json()["subscriptions"][0]["id"]
    
    resp_update = client.patch(f"/api/subscriptions/{sub_id}/quantity", json={"new_quantity": 15})
    assert resp_update.status_code == 200
    data = resp_update.json()
    assert data["subscription"]["quantity"] == 15
    assert data["prorated_invoice"]["amount"] > 0

def test_api_subscription_quantity_update_decrease():
    db = TestingSessionLocal()
    o = setup_approved_order_for_billing(db, [
        {"name": "Software", "sku": "SW_3", "price": 50, "type": "recurring", "interval": "monthly", "qty": 10}
    ])
    order_id = o.id
    db.close()
    
    client.post(f"/api/orders/{order_id}/billing")
    
    resp_get = client.get(f"/api/orders/{order_id}/billing")
    sub_id = resp_get.json()["subscriptions"][0]["id"]
    
    resp_update = client.patch(f"/api/subscriptions/{sub_id}/quantity", json={"new_quantity": 5})
    assert resp_update.status_code == 200
    data = resp_update.json()
    assert data["subscription"]["quantity"] == 5
    assert data["prorated_invoice"]["amount"] < 0

def test_api_subscription_quantity_invalid():
    db = TestingSessionLocal()
    o = setup_approved_order_for_billing(db, [
        {"name": "Software", "sku": "SW_4", "price": 50, "type": "recurring", "interval": "monthly", "qty": 10}
    ])
    order_id = o.id
    db.close()
    
    client.post(f"/api/orders/{order_id}/billing")
    
    resp_get = client.get(f"/api/orders/{order_id}/billing")
    sub_id = resp_get.json()["subscriptions"][0]["id"]
    
    resp_update = client.patch(f"/api/subscriptions/{sub_id}/quantity", json={"new_quantity": 0})
    assert resp_update.status_code == 422 # Pydantic validation
    
    resp_update = client.patch(f"/api/subscriptions/{sub_id}/quantity", json={"new_quantity": -5})
    assert resp_update.status_code == 422

def test_api_subscription_quantity_cancelled():
    db = TestingSessionLocal()
    o = setup_approved_order_for_billing(db, [
        {"name": "Software", "sku": "SW_5", "price": 50, "type": "recurring", "interval": "monthly", "qty": 10}
    ])
    order_id = o.id
    db.close()
    
    client.post(f"/api/orders/{order_id}/billing")
    
    db = TestingSessionLocal()
    sub = db.query(models.Subscription).filter_by(order_id=order_id).first()
    sub.status = "cancelled"
    sub_id = sub.id
    db.commit()
    db.close()
    
    resp_update = client.patch(f"/api/subscriptions/{sub_id}/quantity", json={"new_quantity": 15})
    assert resp_update.status_code == 400
    assert "cancelled" in resp_update.json()["detail"]

def test_api_subscription_quantity_invalid_dates():
    db = TestingSessionLocal()
    o = setup_approved_order_for_billing(db, [
        {"name": "Software", "sku": "SW_6", "price": 50, "type": "recurring", "interval": "monthly", "qty": 10}
    ])
    order_id = o.id
    db.close()
    
    client.post(f"/api/orders/{order_id}/billing")
    
    db = TestingSessionLocal()
    sub = db.query(models.Subscription).filter_by(order_id=order_id).first()
    sub.start_date = None
    sub_id = sub.id
    db.commit()
    db.close()
    
    resp_update = client.patch(f"/api/subscriptions/{sub_id}/quantity", json={"new_quantity": 15})
    assert resp_update.status_code == 400
    assert "missing required billing dates" in resp_update.json()["detail"]

def test_api_billing_get_before_generation():
    db = TestingSessionLocal()
    o = setup_approved_order_for_billing(db, [
        {"name": "Hardware", "sku": "HW_BEFORE", "price": 1000, "type": "one-time", "qty": 1}
    ])
    order_id = o.id
    db.close()
    
    resp_get = client.get(f"/api/orders/{order_id}/billing")
    assert resp_get.status_code == 200
    data = resp_get.json()
    assert data["invoices"] == []
    assert data["subscriptions"] == []

def test_api_billing_get_after_update():
    db = TestingSessionLocal()
    o = setup_approved_order_for_billing(db, [
        {"name": "Software", "sku": "SW_UPDATE", "price": 50, "type": "recurring", "interval": "monthly", "qty": 10}
    ])
    order_id = o.id
    db.close()
    
    client.post(f"/api/orders/{order_id}/billing")
    
    resp_get = client.get(f"/api/orders/{order_id}/billing")
    sub_id = resp_get.json()["subscriptions"][0]["id"]
    initial_invoice_id = resp_get.json()["invoices"][0]["id"]
    
    client.patch(f"/api/subscriptions/{sub_id}/quantity", json={"new_quantity": 15})
    
    resp_get_after = client.get(f"/api/orders/{order_id}/billing")
    assert resp_get_after.status_code == 200
    data = resp_get_after.json()
    assert len(data["invoices"]) == 2
    assert data["invoices"][0]["id"] == initial_invoice_id
    assert data["invoices"][1]["amount"] > 0
    assert data["invoices"][0]["id"] < data["invoices"][1]["id"]

def test_api_billing_unsupported_interval():
    db = TestingSessionLocal()
    o = setup_approved_order_for_billing(db, [
        {"name": "Software", "sku": "SW_YEAR", "price": 500, "type": "recurring", "interval": "yearly", "qty": 1}
    ])
    order_id = o.id
    db.close()
    
    resp = client.post(f"/api/orders/{order_id}/billing")
    assert resp.status_code == 400
    assert "Unsupported billing interval" in resp.json()["detail"]

# ==========================================
# CUSTOMER PORTAL API TESTS
# ==========================================

def setup_portal_quotation(db, customer_id=1, status="draft"):
    import time
    q = models.Quotation(customer_id=customer_id, sales_rep_id=1, quotation_number=f"QP_{int(time.time()*1000)}", status=status)
    db.add(q)
    db.commit()
    
    p = models.Product(name="PortalProduct", sku=f"PP_{int(time.time()*1000)}", price=100)
    db.add(p)
    db.commit()
    
    ql = models.QuoteLine(quotation_id=q.id, product_id=p.id, quantity=1, unit_price=100, line_total=100)
    db.add(ql)
    
    q.subtotal = 100
    q.grand_total = 100
    db.commit()
    return q

def test_portal_list_own_quotations():
    db = TestingSessionLocal()
    q1 = setup_portal_quotation(db, customer_id=1)
    q2 = setup_portal_quotation(db, customer_id=2)
    q2_id = q2.id
    db.close()
    
    resp = client.get("/api/portal/quotations", headers={"X-Customer-ID": "1"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert all(q["id"] != q2_id for q in data)

def test_portal_get_own_quotation():
    db = TestingSessionLocal()
    q = setup_portal_quotation(db, customer_id=1)
    q_id = q.id
    db.close()
    
    resp = client.get(f"/api/portal/quotations/{q_id}", headers={"X-Customer-ID": "1"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == q_id
    assert "unit_cost" not in data
    assert "risk_score" not in data

def test_portal_get_other_quotation_forbidden():
    db = TestingSessionLocal()
    q = setup_portal_quotation(db, customer_id=2)
    q_id = q.id
    db.close()
    
    resp = client.get(f"/api/portal/quotations/{q_id}", headers={"X-Customer-ID": "1"})
    assert resp.status_code == 403

def test_portal_missing_identity_rejected():
    resp = client.get("/api/portal/quotations")
    assert resp.status_code == 422
    assert "x-customer-id" in resp.json()["detail"][0]["loc"]

def test_portal_get_negotiations():
    db = TestingSessionLocal()
    q = setup_portal_quotation(db, customer_id=1)
    q_id = q.id
    
    from services.negotiation_service import submit_customer_counteroffer
    submit_customer_counteroffer(db, q, 1, "First comment")
    db.commit()
    db.close()
    
    resp = client.get(f"/api/portal/quotations/{q_id}/negotiations", headers={"X-Customer-ID": "1"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["comment"] == "First comment"

def test_portal_negotiate_success():
    db = TestingSessionLocal()
    q = setup_portal_quotation(db, customer_id=1, status="approved")
    q_id = q.id
    
    # Record approval count before
    from models import Approval
    initial_approval_count = db.query(Approval).count()
    db.close()
    
    resp = client.post(f"/api/portal/quotations/{q_id}/negotiate", 
                       json={"comment": "I want a discount", "proposed_discount_percent": 15.0},
                       headers={"X-Customer-ID": "1"})
    
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "draft"
    assert len(data["negotiation_comments"]) == 1
    assert data["negotiation_comments"][0]["proposed_discount_percent"] == 15.0
    
    # Verify approval count remains unchanged
    db = TestingSessionLocal()
    final_approval_count = db.query(Approval).count()
    db.close()
    assert final_approval_count == initial_approval_count

def test_portal_negotiate_forbidden():
    db = TestingSessionLocal()
    q = setup_portal_quotation(db, customer_id=2)
    q_id = q.id
    db.close()
    
    resp = client.post(f"/api/portal/quotations/{q_id}/negotiate", 
                       json={"comment": "I want a discount"},
                       headers={"X-Customer-ID": "1"})
    
    assert resp.status_code == 403

def test_portal_negotiate_invalid_discount():
    db = TestingSessionLocal()
    q = setup_portal_quotation(db, customer_id=1)
    q_id = q.id
    db.close()
    
    resp = client.post(f"/api/portal/quotations/{q_id}/negotiate", 
                       json={"comment": "I want a discount", "proposed_discount_percent": 105.0},
                       headers={"X-Customer-ID": "1"})
    assert resp.status_code == 422 # Pydantic validation

def test_portal_negotiate_empty_comment():
    db = TestingSessionLocal()
    q = setup_portal_quotation(db, customer_id=1)
    q_id = q.id
    db.close()
    
    resp = client.post(f"/api/portal/quotations/{q_id}/negotiate", 
                       json={"comment": ""},
                       headers={"X-Customer-ID": "1"})
    assert resp.status_code == 422 # Pydantic min_length validation

def test_portal_negotiate_lost_quotation():
    db = TestingSessionLocal()
    q = setup_portal_quotation(db, customer_id=1, status="lost")
    q_id = q.id
    db.close()
    
    resp = client.post(f"/api/portal/quotations/{q_id}/negotiate", 
                       json={"comment": "reopen please"},
                       headers={"X-Customer-ID": "1"})
    assert resp.status_code == 400
    assert "lost quotation" in resp.json()["detail"]

def test_portal_negotiate_ordered_quotation():
    db = TestingSessionLocal()
    q = setup_portal_quotation(db, customer_id=1, status="approved")
    order = models.Order(order_number="O_PORTAL", quotation_id=q.id, customer_id=1)
    db.add(order)
    db.commit()
    q_id = q.id
    db.close()
    
    resp = client.post(f"/api/portal/quotations/{q_id}/negotiate", 
                       json={"comment": "discount please"},
                       headers={"X-Customer-ID": "1"})
    assert resp.status_code == 400
    assert "converted into an order" in resp.json()["detail"]

# ==========================================
# END-TO-END RE-APPROVAL FLOW
# ==========================================

def test_end_to_end_reapproval_lifecycle():
    # A. Initial approval
    # Create quotation
    client.post("/api/quotations", json={"customer_id": 1, "sales_rep_id": 1, "quotation_number": "Q_REAPP"})
    
    # Add Quote Line with 5% discount (below max of 10% for gold tier, so it requires no_approval or just sales manager)
    # Actually, 5% is less than 10%, so it's a medium risk? 
    # Let's use 15% discount so it explicitly requires sales_manager approval
    client.post("/api/quotations/1/lines", json={"product_id": 1, "quantity": 1, "unit_price": 1000, "discount_percent": 15})
    
    # Submit for approval (Round 1)
    sub1 = client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1}).json()
    assert sub1["quotation"]["status"] == "pending_approval"
    appr1_id = sub1["approval"]["id"]
    
    # Manager approves Round 1
    resp_approve = client.post(f"/api/approvals/{appr1_id}/action", json={"user_id": 2, "action": "approve"})
    assert resp_approve.status_code == 200
    assert resp_approve.json()["status"] == "approved"
    
    # B. Customer counteroffer
    resp_neg = client.post("/api/portal/quotations/1/negotiate", 
                       json={"comment": "I want 25% discount!", "proposed_discount_percent": 25.0},
                       headers={"X-Customer-ID": "1"})
    assert resp_neg.status_code == 200
    assert resp_neg.json()["status"] == "draft"
    
    # Verify the original Approval record still exists and its status is intact
    db = TestingSessionLocal()
    from models import Approval, QuoteLine
    approvals_db = db.query(Approval).filter_by(quotation_id=1).all()
    assert len(approvals_db) == 1
    assert approvals_db[0].id == appr1_id
    assert approvals_db[0].status == "approved"
    
    # C. Sales Rep revision (Simulate manual update to DB directly since we don't have a PUT quote line endpoint yet)
    ql = db.query(QuoteLine).filter_by(quotation_id=1).first()
    ql.discount_percent = 25.0  # Update to 25% (now exceeds max_discount=10 by > 2x, might require finance)
    db.commit()
    db.close()
    
    # D. Re-approval
    # Submit for approval (Round 2)
    sub2 = client.post("/api/quotations/1/submit-approval", json={"requested_by_user_id": 1}).json()
    assert sub2["quotation"]["status"] == "pending_approval"
    appr2_id = sub2["approval"]["id"]
    
    # Verify a NEW Approval record is created
    assert appr2_id != appr1_id
    
    # E. Approval history
    db = TestingSessionLocal()
    approvals_history = db.query(Approval).filter_by(quotation_id=1).order_by(Approval.id.asc()).all()
    db.close()
    
    # Verify exactly two approval records for the quotation
    assert len(approvals_history) == 2
    
    # Verify the first approval remains preserved
    assert approvals_history[0].id == appr1_id
    assert approvals_history[0].status == "approved"
    
    # Verify the second approval has its own ID and current state
    assert approvals_history[1].id == appr2_id
    assert approvals_history[1].status == "pending"

