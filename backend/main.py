from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class Role(str, Enum):
    SALES_REP = "Sales Rep"
    SALES_MANAGER = "Sales Manager"
    FINANCE = "Finance / Operations"
    CUSTOMER = "Customer"
    ADMIN = "Admin"

class QuoteStatus(str, Enum):
    DRAFT = "Draft"
    PENDING_APPROVAL = "Pending Approval"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    CONVERTED = "Converted to Order"

class OrderStatus(str, Enum):
    PROCESSING = "Processing"
    FULFILLED = "Fulfilled"
    SHIPPED = "Shipped"

# ==========================================
# 2. PYDANTIC MODELS (Data Layer / MongoDB Schema Validation)
# ==========================================

# -- User & Customer Models --
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    role: Role

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: str
    created_at: datetime

class CustomerModel(BaseModel):
    id: Optional[str] = None
    name: str
    contact_email: EmailStr
    phone: Optional[str] = None
    company_name: str
    portal_access: bool = False

# -- Product & Pricing Models --
class ProductModel(BaseModel):
    id: Optional[str] = None
    name: str
    category: str
    base_price: float = Field(..., gt=0)
    sku: str
    in_stock: bool = True

# -- Quotation Models --
class QuoteItem(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    unit_price: float
    discount_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    
    @property
    def total(self) -> float:
        return (self.quantity * self.unit_price) * (1 - (self.discount_percentage / 100))

class QuotationModel(BaseModel):
    id: Optional[str] = None
    customer_id: str
    sales_rep_id: str
    items: List[QuoteItem]
    status: QuoteStatus = QuoteStatus.DRAFT
    total_amount: float
    created_at: datetime = datetime.utcnow()

# -- Approval Models --
class ApprovalRequest(BaseModel):
    quote_id: str
    approver_id: str
    status: QuoteStatus
    rejection_reason: Optional[str] = None
    margin_impact: Optional[float] = None

# -- Order & Fulfillment Models --
class OrderModel(BaseModel):
    id: Optional[str] = None
    quote_id: str
    customer_id: str
    total_amount: float
    status: OrderStatus = OrderStatus.PROCESSING
    created_at: datetime = datetime.utcnow()

# -- Deal Health (AI/ML Integration Hook) --
class DealHealthScore(BaseModel):
    quote_id: str
    win_probability_score: float = Field(..., ge=0.0, le=100.0)
    risk_factors: List[str]
    recommendation: str

# ==========================================
# 3. FASTAPI APPLICATION SETUP
# ==========================================

app = FastAPI(
    title="DealFlow360 API",
    description="Intelligent, Self-Governing Sales Operations Platform Backend",
    version="1.0.0"
)

@app.get('/')
def homePage():
    return {'message':'Home Page'}

# Mock Database for rapid prototyping before connecting Motor (Async MongoDB)
db = {
    "users": [],
    "customers": [],
    "products": [],
    "quotations": [],
    "orders": []
}

# ==========================================
# 4. API ROUTES (Microservice Endpoints)
# ==========================================

# --- Auth & User Service ---
@app.post("/auth/register", response_model=UserResponse, tags=["Auth"])
async def register_user(user: UserCreate):
    # Hash password in production
    new_user = {**user.dict(), "id": f"usr_{len(db['users'])+1}", "created_at": datetime.utcnow()}
    db["users"].append(new_user)
    return new_user

# --- Quotation Builder Service ---
@app.post("/quotations/", response_model=QuotationModel, tags=["Quotations"])
async def create_quotation(quote: QuotationModel):
    quote.id = f"qt_{len(db['quotations'])+1}"
    db["quotations"].append(quote.dict())
    return quote

@app.get("/quotations/{quote_id}", response_model=QuotationModel, tags=["Quotations"])
async def get_quotation(quote_id: str):
    for q in db["quotations"]:
        if q["id"] == quote_id:
            return q
    raise HTTPException(status_code=404, detail="Quotation not found")

# --- Approvals Center ---
@app.post("/approvals/process", tags=["Approvals"])
async def process_approval(approval: ApprovalRequest):
    for q in db["quotations"]:
        if q["id"] == approval.quote_id:
            q["status"] = approval.status
            return {"message": f"Quote {approval.quote_id} status updated to {approval.status.value}"}
    raise HTTPException(status_code=404, detail="Quotation not found")

# --- Order & Fulfillment Service ---
@app.post("/orders/convert/{quote_id}", response_model=OrderModel, tags=["Orders"])
async def convert_quote_to_order(quote_id: str):
    quote = next((q for q in db["quotations"] if q["id"] == quote_id), None)
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if quote["status"] != QuoteStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Only approved quotes can be converted to orders")
    
    new_order = OrderModel(
        id=f"ord_{len(db['orders'])+1}",
        quote_id=quote_id,
        customer_id=quote["customer_id"],
        total_amount=quote["total_amount"]
    )
    db["orders"].append(new_order.dict())
    quote["status"] = QuoteStatus.CONVERTED
    return new_order

# --- Deal Health Dashboard (Prediction Hook) ---
@app.get("/deal-health/{quote_id}", response_model=DealHealthScore, tags=["Deal Health"])
async def get_deal_health(quote_id: str):
    # Hook for Python ML models (e.g., XGBoost prediction logic)
    return DealHealthScore(
        quote_id=quote_id,
        win_probability_score=85.5,
        risk_factors=["High discount requested", "New customer"],
        recommendation="Proceed with manager approval for discount."
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)