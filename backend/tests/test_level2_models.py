import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Product, Order, Warehouse, PriceList, WarehouseSplit, Customer, Quotation, User

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    # This call will fail if the relationships or schemas are misconfigured
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    yield db
    db.close()

def test_price_list_model(db_session):
    product = Product(name="Test Product", sku="TEST-1", price=100.0)
    db_session.add(product)
    db_session.commit()
    
    price_list = PriceList(
        product_id=product.id,
        customer_tier="gold",
        price=80.0,
        currency="USD"
    )
    db_session.add(price_list)
    db_session.commit()
    
    # Test relationship traversal
    assert len(product.price_lists) == 1
    assert product.price_lists[0].customer_tier == "gold"
    assert price_list.product.sku == "TEST-1"

def test_warehouse_split_model(db_session):
    user = User(name="Rep", email="rep@test.com", password_hash="h", role="sales")
    db_session.add(user)
    db_session.commit()

    cust = Customer(name="Cust", tier="basic")
    db_session.add(cust)
    db_session.commit()

    quote = Quotation(quotation_number="Q1", customer_id=cust.id, sales_rep_id=user.id)
    db_session.add(quote)
    db_session.commit()

    order = Order(order_number="O1", quotation_id=quote.id, customer_id=cust.id)
    product = Product(name="Test Product", sku="TEST-1", price=100.0)
    warehouse = Warehouse(name="Main Hub")
    
    db_session.add_all([order, product, warehouse])
    db_session.commit()
    
    split = WarehouseSplit(
        order_id=order.id,
        product_id=product.id,
        warehouse_id=warehouse.id,
        quantity=50,
        is_backorder=False
    )
    db_session.add(split)
    db_session.commit()
    
    # Test relationship traversal
    assert len(order.warehouse_splits) == 1
    assert len(product.warehouse_splits) == 1
    assert len(warehouse.warehouse_splits) == 1
    
    assert split.order.order_number == "O1"
    assert split.product.sku == "TEST-1"
    assert split.warehouse.name == "Main Hub"
    assert split.quantity == 50

def test_price_list_db_columns():
    # Verify that the model exactly maps to the authoritative PostgreSQL columns
    expected = {'id', 'product_id', 'customer_tier', 'price', 'currency', 'created_at'}
    actual = {c.name for c in PriceList.__table__.columns}
    assert expected == actual

def test_warehouse_split_db_columns():
    # Verify that the model exactly maps to the authoritative PostgreSQL columns
    expected = {'id', 'order_id', 'product_id', 'warehouse_id', 'quantity', 'is_backorder', 'shipped_at', 'created_at'}
    actual = {c.name for c in WarehouseSplit.__table__.columns}
    assert expected == actual
