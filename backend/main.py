from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
import models


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="DealFlow360 API",
    description="Intelligent, Self-Governing Sales Operations Platform Backend",
    version="1.0.0"
)


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# SYSTEM
# ==========================================

@app.get("/", tags=["System"])
def root():
    return {
        "message": "DealFlow360 API is running",
        "version": "1.0.0"
    }


@app.get("/health/db", tags=["System"])
def db_health(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1")).scalar()

        return {
            "database_connected": result == 1
        }

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed"
        )


# ==========================================
# USERS
# ==========================================

@app.get("/users", tags=["Users"])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.get("/users/{user_id}", tags=["Users"])
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = (
        db.query(models.User)
        .filter(models.User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


# ==========================================
# CUSTOMERS
# ==========================================

@app.get("/customers", tags=["Customers"])
def list_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).all()


@app.get("/customers/{customer_id}", tags=["Customers"])
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    customer = (
        db.query(models.Customer)
        .filter(models.Customer.id == customer_id)
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    return customer


# ==========================================
# PRODUCTS
# ==========================================

@app.get("/products", tags=["Products"])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()


@app.get("/products/{product_id}", tags=["Products"])
def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    product = (
        db.query(models.Product)
        .filter(models.Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


# ==========================================
# QUOTATIONS
# ==========================================

@app.get("/quotations", tags=["Quotations"])
def list_quotations(db: Session = Depends(get_db)):
    return db.query(models.Quotation).all()


@app.get("/quotations/{quotation_id}", tags=["Quotations"])
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db)
):
    quotation = (
        db.query(models.Quotation)
        .filter(models.Quotation.id == quotation_id)
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found"
        )

    return quotation


# ==========================================
# APPROVALS
# ==========================================

@app.get("/approvals", tags=["Approvals"])
def list_approvals(db: Session = Depends(get_db)):
    return db.query(models.Approval).all()


@app.get("/approvals/{approval_id}", tags=["Approvals"])
def get_approval(
    approval_id: int,
    db: Session = Depends(get_db)
):
    approval = (
        db.query(models.Approval)
        .filter(models.Approval.id == approval_id)
        .first()
    )

    if not approval:
        raise HTTPException(
            status_code=404,
            detail="Approval not found"
        )

    return approval


# ==========================================
# ORDERS
# ==========================================

@app.get("/orders", tags=["Orders"])
def list_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).all()


@app.get("/orders/{order_id}", tags=["Orders"])
def get_order(
    order_id: int,
    db: Session = Depends(get_db)
):
    order = (
        db.query(models.Order)
        .filter(models.Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    return order


# ==========================================
# WAREHOUSES
# ==========================================

@app.get("/warehouses", tags=["Warehouses"])
def list_warehouses(db: Session = Depends(get_db)):
    return db.query(models.Warehouse).all()


@app.get("/warehouses/{warehouse_id}", tags=["Warehouses"])
def get_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db)
):
    warehouse = (
        db.query(models.Warehouse)
        .filter(models.Warehouse.id == warehouse_id)
        .first()
    )

    if not warehouse:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    return warehouse


# ==========================================
# INVENTORY
# ==========================================

@app.get("/inventory", tags=["Inventory"])
def list_inventory(db: Session = Depends(get_db)):
    return db.query(models.Inventory).all()


@app.get("/inventory/{inventory_id}", tags=["Inventory"])
def get_inventory(
    inventory_id: int,
    db: Session = Depends(get_db)
):
    inventory = (
        db.query(models.Inventory)
        .filter(models.Inventory.id == inventory_id)
        .first()
    )

    if not inventory:
        raise HTTPException(
            status_code=404,
            detail="Inventory record not found"
        )

    return inventory


# ==========================================
# APPLICATION START
# ==========================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )