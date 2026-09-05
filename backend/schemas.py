from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class QuoteLineCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    discount_percent: float = 0.0
    tax_rate: float = 0.0
    unit_cost: float = 0.0

class QuotationCreate(BaseModel):
    customer_id: int
    sales_rep_id: int
    quotation_number: str

class QuoteLineResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    discount_percent: float
    tax_rate: float
    line_total: float
    unit_cost: float
    model_config = ConfigDict(from_attributes=True)

class QuotationResponse(BaseModel):
    id: int
    quotation_number: str
    customer_id: int
    sales_rep_id: int
    status: str
    subtotal: float
    discount_total: float
    tax_total: float
    grand_total: float
    risk_score: float
    lines: List[QuoteLineResponse] = []
    model_config = ConfigDict(from_attributes=True)

class DiscountEvaluationResponse(BaseModel):
    risk_score: float
    approval_level: str
    explanation: str

class SubmitApprovalRequest(BaseModel):
    requested_by_user_id: int

class ApprovalActionRequest(BaseModel):
    user_id: int
    action: str
    reason: str = ""

class ApprovalResponse(BaseModel):
    id: int
    quotation_id: int
    status: str
    approval_level: str
    reason: Optional[str]
    model_config = ConfigDict(from_attributes=True)

class SubmitApprovalResponse(BaseModel):
    quotation: QuotationResponse
    approval: Optional[ApprovalResponse]
