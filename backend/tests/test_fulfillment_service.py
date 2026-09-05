import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Order, Quotation, QuoteLine, Warehouse, Inventory, Product
from services.fulfillment_service import fulfill_order

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def setup_basic_data(db):
    product = Product(name="Test Product", sku="SKU1", price=100)
    db.add(product)
    
    quotation = Quotation(quotation_number="Q1", customer_id=1, sales_rep_id=1, status="approved")
    db.add(quotation)
    db.flush()
    
    line = QuoteLine(quotation_id=quotation.id, product_id=product.id, quantity=10, unit_price=100)
    db.add(line)
    
    order = Order(order_number="O1", quotation_id=quotation.id, customer_id=1)
    db.add(order)
    db.flush()
    
    return product, quotation, order

def test_approved_order_required(db_session):
    product, quotation, order = setup_basic_data(db_session)
    quotation.status = "draft"
    db_session.flush()
    
    with pytest.raises(ValueError, match="Quotation is not approved"):
        fulfill_order(db_session, order)

def test_single_warehouse_fulfillment(db_session):
    product, quotation, order = setup_basic_data(db_session)
    
    w1 = Warehouse(name="W1", is_active=True)
    db_session.add(w1)
    db_session.flush()
    
    inv = Inventory(product_id=product.id, warehouse_id=w1.id, quantity=20, reserved_quantity=0)
    db_session.add(inv)
    db_session.flush()
    
    res = fulfill_order(db_session, order)
    
    assert res["total_fulfilled_quantity"] == 10
    assert res["shipment_count"] == 1
    
    assert len(order.fulfillments) == 1
    assert order.fulfillments[0].quantity == 10
    assert order.fulfillments[0].warehouse_id == w1.id
    assert len(order.backorders) == 0
    assert inv.reserved_quantity == 10

def test_multi_warehouse_split(db_session):
    product, quotation, order = setup_basic_data(db_session)
    
    w1 = Warehouse(name="W1", is_active=True)
    w2 = Warehouse(name="W2", is_active=True)
    db_session.add_all([w1, w2])
    db_session.flush()
    
    inv1 = Inventory(product_id=product.id, warehouse_id=w1.id, quantity=6, reserved_quantity=0)
    inv2 = Inventory(product_id=product.id, warehouse_id=w2.id, quantity=8, reserved_quantity=0)
    db_session.add_all([inv1, inv2])
    db_session.flush()
    
    # Requires 10. w2 has 8, w1 has 6. Should take 8 from w2, 2 from w1.
    res = fulfill_order(db_session, order)
    
    assert res["total_fulfilled_quantity"] == 10
    assert res["shipment_count"] == 2
    assert len(order.backorders) == 0
    
    assert len(order.fulfillments) == 2
    f_w2 = next(f for f in order.fulfillments if f.warehouse_id == w2.id)
    f_w1 = next(f for f in order.fulfillments if f.warehouse_id == w1.id)
    
    assert f_w2.quantity == 8
    assert f_w1.quantity == 2
    assert inv2.reserved_quantity == 8
    assert inv1.reserved_quantity == 2

def test_insufficient_stock_backorder(db_session):
    product, quotation, order = setup_basic_data(db_session)
    
    w1 = Warehouse(name="W1", is_active=True)
    db_session.add(w1)
    db_session.flush()
    
    inv = Inventory(product_id=product.id, warehouse_id=w1.id, quantity=5, reserved_quantity=0)
    db_session.add(inv)
    db_session.flush()
    
    res = fulfill_order(db_session, order)
    
    assert res["total_fulfilled_quantity"] == 5
    assert len(order.fulfillments) == 1
    assert order.fulfillments[0].quantity == 5
    
    assert len(order.backorders) == 1
    assert order.backorders[0].remaining_quantity == 5

def test_exact_stock_boundary(db_session):
    product, quotation, order = setup_basic_data(db_session)
    w1 = Warehouse(name="W1", is_active=True)
    db_session.add(w1)
    db_session.flush()
    
    inv = Inventory(product_id=product.id, warehouse_id=w1.id, quantity=10, reserved_quantity=0)
    db_session.add(inv)
    db_session.flush()
    
    res = fulfill_order(db_session, order)
    
    assert res["total_fulfilled_quantity"] == 10
    assert len(order.fulfillments) == 1
    assert order.fulfillments[0].quantity == 10
    assert len(order.backorders) == 0

def test_zero_inventory(db_session):
    product, quotation, order = setup_basic_data(db_session)
    w1 = Warehouse(name="W1", is_active=True)
    db_session.add(w1)
    db_session.flush()
    
    inv = Inventory(product_id=product.id, warehouse_id=w1.id, quantity=0, reserved_quantity=0)
    db_session.add(inv)
    db_session.flush()
    
    res = fulfill_order(db_session, order)
    
    assert res["total_fulfilled_quantity"] == 0
    assert len(order.fulfillments) == 0
    assert len(order.backorders) == 1
    assert order.backorders[0].remaining_quantity == 10

def test_manual_override(db_session):
    product, quotation, order = setup_basic_data(db_session)
    w1 = Warehouse(name="W1", is_active=True)
    db_session.add(w1)
    db_session.flush()
    
    inv = Inventory(product_id=product.id, warehouse_id=w1.id, quantity=20, reserved_quantity=0)
    db_session.add(inv)
    db_session.flush()
    
    manual = [{"product_id": product.id, "warehouse_id": w1.id, "quantity": 3}]
    res = fulfill_order(db_session, order, manual_allocations=manual)
    
    assert res["total_fulfilled_quantity"] == 3
    assert len(order.fulfillments) == 1
    assert order.fulfillments[0].quantity == 3
    # Wait, the algorithm will fulfill the remaining 7 manually or automatically?
    # The logic provided: if manual_allocations, we iterate over manual allocations and subtract. It does NOT fallback to automatic if manual is given.
    # Ah, let's check: remaining_to_fulfill = 10, manual given = 3, remaining = 7. Backorder created for 7.
    assert len(order.backorders) == 1
    assert order.backorders[0].remaining_quantity == 7

def test_idempotency_no_double_allocate(db_session):
    product, quotation, order = setup_basic_data(db_session)
    w1 = Warehouse(name="W1", is_active=True)
    db_session.add(w1)
    db_session.flush()
    
    inv = Inventory(product_id=product.id, warehouse_id=w1.id, quantity=20, reserved_quantity=0)
    db_session.add(inv)
    db_session.flush()
    
    res1 = fulfill_order(db_session, order)
    assert inv.reserved_quantity == 10
    
    res2 = fulfill_order(db_session, order)
    # Shouldn't double reserve
    assert inv.reserved_quantity == 10
    
    # If we force reallocation by giving manual allocation, it should clear the old one.
    manual = [{"product_id": product.id, "warehouse_id": w1.id, "quantity": 10}]
    res3 = fulfill_order(db_session, order, manual_allocations=manual)
    assert inv.reserved_quantity == 10
