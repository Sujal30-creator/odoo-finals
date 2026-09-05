from sqlalchemy import (
    Column, Integer, String, Boolean, Numeric, Text, ForeignKey, TIMESTAMP
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    quotations = relationship("Quotation", back_populates="sales_rep", foreign_keys="[Quotation.sales_rep_id]")
    approvals_requested = relationship("Approval", back_populates="requested_by_user", foreign_keys="[Approval.requested_by]")
    approvals_decided = relationship("Approval", back_populates="approver", foreign_keys="[Approval.approver_id]")


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150))
    phone = Column(String(20))
    company = Column(String(150))
    tier = Column(String(20), nullable=False, default="basic")
    address = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    quotations = relationship("Quotation", back_populates="customer")
    orders = relationship("Order", back_populates="customer")
    subscriptions = relationship("Subscription", back_populates="customer")
    negotiation_comments = relationship("NegotiationComment", back_populates="customer")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String(150), nullable=False)
    sku = Column(String(50), nullable=False, unique=True)
    category = Column(String(80))
    price = Column(Numeric(12, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0)
    unit_cost = Column(Numeric(12, 2), nullable=False, default=0)
    product_type = Column(String(20), nullable=False, default="one-time")
    billing_interval = Column(String(20))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    quote_lines = relationship("QuoteLine", back_populates="product")
    inventory = relationship("Inventory", back_populates="product")
    subscriptions = relationship("Subscription", back_populates="product")
    backorders = relationship("Backorder", back_populates="product")
    fulfillments = relationship("Fulfillment", back_populates="product")
    price_lists = relationship("PriceList", back_populates="product")
    warehouse_splits = relationship("WarehouseSplit", back_populates="product")


class Quotation(Base):
    __tablename__ = "quotations"
    id = Column(Integer, primary_key=True)
    quotation_number = Column(String(30), nullable=False, unique=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    sales_rep_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="draft")
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    discount_total = Column(Numeric(12, 2), nullable=False, default=0)
    tax_total = Column(Numeric(12, 2), nullable=False, default=0)
    grand_total = Column(Numeric(12, 2), nullable=False, default=0)
    risk_score = Column(Numeric(5, 2), nullable=False, default=0)
    last_activity_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="quotations")
    sales_rep = relationship("User", back_populates="quotations", foreign_keys=[sales_rep_id])
    lines = relationship("QuoteLine", back_populates="quotation")
    approvals = relationship("Approval", back_populates="quotation")
    orders = relationship("Order", back_populates="quotation")
    negotiation_comments = relationship("NegotiationComment", back_populates="quotation")


class QuoteLine(Base):
    __tablename__ = "quote_lines"
    id = Column(Integer, primary_key=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    discount_percent = Column(Numeric(5, 2), nullable=False, default=0)
    tax_rate = Column(Numeric(5, 2), nullable=False, default=0)
    line_total = Column(Numeric(12, 2), nullable=False, default=0)
    unit_cost = Column(Numeric(12, 2), nullable=False, default=0)

    quotation = relationship("Quotation", back_populates="lines")
    product = relationship("Product", back_populates="quote_lines")


class Approval(Base):
    __tablename__ = "approvals"
    id = Column(Integer, primary_key=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"))
    reason = Column(Text)
    requested_discount = Column(Numeric(5, 2))
    status = Column(String(20), nullable=False, default="pending")
    approval_level = Column(String(50))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    decided_at = Column(TIMESTAMP(timezone=True))

    quotation = relationship("Quotation", back_populates="approvals")
    requested_by_user = relationship("User", back_populates="approvals_requested", foreign_keys=[requested_by])
    approver = relationship("User", back_populates="approvals_decided", foreign_keys=[approver_id])


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    order_number = Column(String(30), nullable=False, unique=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    status = Column(String(20), nullable=False, default="processing")
    payment_status = Column(String(20), nullable=False, default="UNPAID")
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)
    promised_delivery_date = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    quotation = relationship("Quotation", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    subscriptions = relationship("Subscription", back_populates="order")
    backorders = relationship("Backorder", back_populates="order")
    fulfillments = relationship("Fulfillment", back_populates="order")
    invoices = relationship("Invoice", back_populates="order")
    warehouse_splits = relationship("WarehouseSplit", back_populates="order")


class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    location = Column(String(150))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    inventory = relationship("Inventory", back_populates="warehouse")
    fulfillments = relationship("Fulfillment", back_populates="warehouse")
    warehouse_splits = relationship("WarehouseSplit", back_populates="warehouse")


class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    reserved_quantity = Column(Integer, nullable=False, default=0)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="inventory")
    warehouse = relationship("Warehouse", back_populates="inventory")


class DiscountRule(Base):
    __tablename__ = "discount_rules"
    id = Column(Integer, primary_key=True)
    tier = Column(String(20))
    category = Column(String(80))
    max_discount_percent = Column(Numeric(5, 2), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    status = Column(String(20), nullable=False, default="active")
    billing_interval = Column(String(20), nullable=False)
    next_billing_date = Column(TIMESTAMP(timezone=True))
    amount = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    start_date = Column(TIMESTAMP(timezone=True))
    end_date = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="subscriptions")
    product = relationship("Product", back_populates="subscriptions")
    order = relationship("Order", back_populates="subscriptions")


class Backorder(Base):
    __tablename__ = "backorders"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    remaining_quantity = Column(Integer, nullable=False)
    expected_fulfillment_date = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="backorders")
    product = relationship("Product", back_populates="backorders")


class NegotiationComment(Base):
    __tablename__ = "negotiation_comments"
    id = Column(Integer, primary_key=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"))
    comment = Column(Text, nullable=False)
    proposed_discount_percent = Column(Numeric(5, 2))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    quotation = relationship("Quotation", back_populates="negotiation_comments")
    user = relationship("User")
    customer = relationship("Customer", back_populates="negotiation_comments")


class Fulfillment(Base):
    __tablename__ = "fulfillments"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="fulfillments")
    product = relationship("Product", back_populates="fulfillments")
    warehouse = relationship("Warehouse", back_populates="fulfillments")


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default="unpaid")
    due_date = Column(TIMESTAMP(timezone=True))
    paid_at = Column(TIMESTAMP(timezone=True))

    order = relationship("Order", back_populates="invoices")


class PriceList(Base):
    __tablename__ = "price_lists"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    customer_tier = Column(String(20), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="USD")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="price_lists")


class WarehouseSplit(Base):
    __tablename__ = "warehouse_splits"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    is_backorder = Column(Boolean, nullable=False, default=False)
    shipped_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="warehouse_splits")
    product = relationship("Product", back_populates="warehouse_splits")
    warehouse = relationship("Warehouse", back_populates="warehouse_splits")