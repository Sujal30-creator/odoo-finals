from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from services.discount_service import evaluate_quotation_discount
from services.approval_service import submit_for_approval, process_approval

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
# QUOTATIONS & APPROVALS (API)
# ==========================================

@app.post("/api/quotations", response_model=schemas.QuotationResponse, tags=["Quotations"])
def create_quotation(quote: schemas.QuotationCreate, db: Session = Depends(get_db)):
    db_quote = models.Quotation(**quote.model_dump())
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    return db_quote

@app.get("/api/quotations/{id}", response_model=schemas.QuotationResponse, tags=["Quotations"])
def get_api_quotation(id: int, db: Session = Depends(get_db)):
    quote = db.query(models.Quotation).filter(models.Quotation.id == id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quote

@app.post("/api/quotations/{id}/lines", response_model=schemas.QuoteLineResponse, tags=["Quotations"])
def add_quote_line(id: int, line: schemas.QuoteLineCreate, db: Session = Depends(get_db)):
    quote = db.query(models.Quotation).filter(models.Quotation.id == id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    line_total = float(line.quantity) * float(line.unit_price) * (1 - float(line.discount_percent) / 100.0)
    db_line = models.QuoteLine(
        quotation_id=id,
        line_total=line_total,
        **line.model_dump()
    )
    db.add(db_line)
    
    quote.subtotal = float(quote.subtotal or 0) + (float(line.quantity) * float(line.unit_price))
    quote.discount_total = float(quote.discount_total or 0) + (float(line.quantity) * float(line.unit_price) * (float(line.discount_percent) / 100.0))
    quote.grand_total = float(quote.grand_total or 0) + line_total
    
    db.commit()
    db.refresh(db_line)
    return db_line

@app.post("/api/quotations/{id}/evaluate-discount", response_model=schemas.DiscountEvaluationResponse, tags=["Quotations"])
def evaluate_discount_endpoint(id: int, db: Session = Depends(get_db)):
    quote = db.query(models.Quotation).filter(models.Quotation.id == id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    try:
        res = evaluate_quotation_discount(db, quote)
        db.commit()
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/quotations/{id}/submit-approval", response_model=schemas.SubmitApprovalResponse, tags=["Quotations"])
def submit_approval_endpoint(id: int, req: schemas.SubmitApprovalRequest, db: Session = Depends(get_db)):
    quote = db.query(models.Quotation).filter(models.Quotation.id == id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    user = db.query(models.User).filter(models.User.id == req.requested_by_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    try:
        approval = submit_for_approval(db, quote, user)
        db.commit()
        db.refresh(quote)
        if approval:
            db.refresh(approval)
        return {"quotation": quote, "approval": approval}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/approvals/{id}/action", response_model=schemas.QuotationResponse, tags=["Approvals"])
def process_approval_endpoint(id: int, req: schemas.ApprovalActionRequest, db: Session = Depends(get_db)):
    approval = db.query(models.Approval).filter(models.Approval.id == id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
        
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    try:
        process_approval(db, approval, user, req.action, req.reason)
        db.commit()
        db.refresh(approval.quotation)
        return approval.quotation
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        db.rollback()
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


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
# FULFILLMENT
# ==========================================

from services.fulfillment_service import fulfill_order

@app.post("/api/orders/{order_id}/fulfillment/preview", response_model=schemas.FulfillmentPreviewResponse, tags=["Fulfillment"])
def preview_fulfillment(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    try:
        res = fulfill_order(db, order)
        db.rollback() 
        return res
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/orders/{order_id}/fulfillment", response_model=schemas.FulfillmentStatusResponse, tags=["Fulfillment"])
def confirm_fulfillment(order_id: int, req: schemas.ConfirmFulfillmentRequest = None, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    manual_allocations = []
    if req and req.manual_allocations:
        manual_allocations = [m.model_dump() for m in req.manual_allocations]
        
    try:
        res = fulfill_order(db, order, manual_allocations)
        db.commit()
        db.refresh(order)
        
        return {
            "total_fulfilled_quantity": res["total_fulfilled_quantity"],
            "shipment_count": res["shipment_count"],
            "estimated_shipping_cost": res["estimated_shipping_cost"],
            "fulfillments": order.fulfillments,
            "backorders": order.backorders
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/{order_id}/fulfillment", response_model=schemas.FulfillmentStatusResponse, tags=["Fulfillment"])
def get_fulfillment_status(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    fulfillments = db.query(models.Fulfillment).filter(models.Fulfillment.order_id == order_id).all()
    backorders = db.query(models.Backorder).filter(models.Backorder.order_id == order_id).all()
    
    total_fulfilled = sum(f.quantity for f in fulfillments)
    warehouses_used = set(f.warehouse_id for f in fulfillments)
    
    return {
        "total_fulfilled_quantity": total_fulfilled,
        "shipment_count": len(warehouses_used),
        "estimated_shipping_cost": 0.0,
        "fulfillments": fulfillments,
        "backorders": backorders
    }

# ==========================================
# BILLING
# ==========================================
from services.billing_service import generate_initial_billing, update_subscription_quantity

@app.post("/api/orders/{order_id}/billing", response_model=schemas.BillingStatusResponse, tags=["Billing"])
def generate_billing(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    try:
        generate_initial_billing(db, order)
        db.commit()
        db.refresh(order)
        
        invoices = db.query(models.Invoice).filter_by(order_id=order.id).order_by(models.Invoice.id.asc()).all()
        subscriptions = db.query(models.Subscription).filter_by(order_id=order.id).all()
        
        return {
            "order_id": order.id,
            "order_payment_status": order.payment_status,
            "invoices": invoices,
            "subscriptions": subscriptions
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/orders/{order_id}/billing", response_model=schemas.BillingStatusResponse, tags=["Billing"])
def get_billing_status(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    invoices = db.query(models.Invoice).filter_by(order_id=order.id).order_by(models.Invoice.id.asc()).all()
    subscriptions = db.query(models.Subscription).filter_by(order_id=order.id).all()
    
    return {
        "order_id": order.id,
        "order_payment_status": order.payment_status,
        "invoices": invoices,
        "subscriptions": subscriptions
    }

@app.patch("/api/subscriptions/{subscription_id}/quantity", response_model=schemas.SubscriptionQuantityUpdateResponse, tags=["Billing"])
def update_sub_quantity(subscription_id: int, req: schemas.SubscriptionQuantityUpdate, db: Session = Depends(get_db)):
    sub = db.query(models.Subscription).filter_by(id=subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    try:
        invoice = update_subscription_quantity(db, sub, req.new_quantity)
        db.commit()
        db.refresh(sub)
        return {
            "subscription": sub,
            "prorated_invoice": invoice
        }
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# CUSTOMER PORTAL
# ==========================================
from fastapi import Header
from services.negotiation_service import submit_customer_counteroffer, get_negotiation_history

def get_portal_customer_id(x_customer_id: int = Header(..., description="Mock Customer Identity")):
    return x_customer_id

def map_portal_quotation(quote: models.Quotation):
    lines = []
    for line in quote.lines:
        lines.append({
            "id": line.id,
            "product_name": line.product.name,
            "quantity": line.quantity,
            "unit_price": float(line.unit_price),
            "discount_percent": float(line.discount_percent),
            "line_total": float(line.line_total)
        })
    return {
        "id": quote.id,
        "quotation_number": quote.quotation_number,
        "status": quote.status,
        "subtotal": float(quote.subtotal),
        "tax_total": float(quote.tax_total),
        "grand_total": float(quote.grand_total),
        "lines": lines,
        "negotiation_comments": quote.negotiation_comments
    }

@app.get("/api/portal/quotations", response_model=list[schemas.PortalQuotationResponse], tags=["Portal"])
def portal_list_quotations(customer_id: int = Depends(get_portal_customer_id), db: Session = Depends(get_db)):
    quotations = db.query(models.Quotation).filter(models.Quotation.customer_id == customer_id).all()
    return [map_portal_quotation(q) for q in quotations]

@app.get("/api/portal/quotations/{quotation_id}", response_model=schemas.PortalQuotationResponse, tags=["Portal"])
def portal_get_quotation(quotation_id: int, customer_id: int = Depends(get_portal_customer_id), db: Session = Depends(get_db)):
    quote = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if quote.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this quotation")
    return map_portal_quotation(quote)

@app.get("/api/portal/quotations/{quotation_id}/negotiations", response_model=list[schemas.PortalNegotiationCommentResponse], tags=["Portal"])
def portal_get_negotiations(quotation_id: int, customer_id: int = Depends(get_portal_customer_id), db: Session = Depends(get_db)):
    quote = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if quote.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this quotation")
    
    return get_negotiation_history(db, quotation_id)

@app.post("/api/portal/quotations/{quotation_id}/negotiate", response_model=schemas.PortalQuotationResponse, tags=["Portal"])
def portal_submit_negotiation(
    quotation_id: int, 
    req: schemas.PortalNegotiationRequest, 
    customer_id: int = Depends(get_portal_customer_id), 
    db: Session = Depends(get_db)
):
    quote = db.query(models.Quotation).filter(models.Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if quote.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this quotation")
        
    try:
        submit_customer_counteroffer(
            db=db,
            quotation=quote,
            customer_id=customer_id,
            comment=req.comment,
            proposed_discount_percent=req.proposed_discount_percent
        )
        db.commit()
        db.refresh(quote)
        return map_portal_quotation(quote)
    except PermissionError as e:
        db.rollback()
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

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