from pydantic import BaseModel, ConfigDict, Field
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

class ManualAllocation(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int = Field(gt=0)

class ConfirmFulfillmentRequest(BaseModel):
    manual_allocations: Optional[List[ManualAllocation]] = None

class FulfillmentPreviewResponse(BaseModel):
    total_fulfilled_quantity: int
    shipment_count: int
    estimated_shipping_cost: float

class FulfillmentRecordSchema(BaseModel):
    id: int
    order_id: int
    product_id: int
    warehouse_id: int
    quantity: int
    model_config = ConfigDict(from_attributes=True)

class BackorderRecordSchema(BaseModel):
    id: int
    order_id: int
    product_id: int
    remaining_quantity: int
    model_config = ConfigDict(from_attributes=True)

class FulfillmentStatusResponse(BaseModel):
    total_fulfilled_quantity: int
    shipment_count: int
    estimated_shipping_cost: float
    fulfillments: List[FulfillmentRecordSchema]
    backorders: List[BackorderRecordSchema]

# Billing Schemas
class InvoiceResponse(BaseModel):
    id: int
    order_id: int
    amount: float
    status: str
    model_config = ConfigDict(from_attributes=True)

class SubscriptionResponse(BaseModel):
    id: int
    customer_id: int
    product_id: int
    order_id: int
    status: str
    billing_interval: str
    quantity: int
    amount: float
    start_date: datetime
    next_billing_date: datetime
    model_config = ConfigDict(from_attributes=True)

class BillingStatusResponse(BaseModel):
    order_id: int
    order_payment_status: str
    invoices: List[InvoiceResponse]
    subscriptions: List[SubscriptionResponse]

class SubscriptionQuantityUpdate(BaseModel):
    new_quantity: int = Field(gt=0)

class SubscriptionQuantityUpdateResponse(BaseModel):
    subscription: SubscriptionResponse
    prorated_invoice: Optional[InvoiceResponse]

# ==========================================
# PORTAL SCHEMAS
# ==========================================

class PortalNegotiationCommentResponse(BaseModel):
    id: int
    comment: str
    proposed_discount_percent: Optional[float] = None
    created_at: datetime
    # Exposing generic authorship so customer knows if it's their comment or a reply
    customer_id: Optional[int] = None
    user_id: Optional[int] = None

class PortalQuoteLineResponse(BaseModel):
    id: int
    product_name: str
    quantity: int
    unit_price: float
    discount_percent: float
    line_total: float

class PortalQuotationResponse(BaseModel):
    id: int
    quotation_number: str
    status: str
    subtotal: float
    tax_total: float
    grand_total: float
    lines: List[PortalQuoteLineResponse] = []
    negotiation_comments: List[PortalNegotiationCommentResponse] = []

class PortalNegotiationRequest(BaseModel):
    comment: str = Field(..., min_length=1)
    proposed_discount_percent: Optional[float] = Field(None, ge=0, le=100)
