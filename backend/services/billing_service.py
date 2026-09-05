from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from models import Order, Subscription, Invoice

def round_money(amount):
    """Round monetary values to 2 decimal places deterministically."""
    return Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def generate_initial_billing(db: Session, order: Order):
    """
    Generate initial billing for an approved order.
    Creates an Invoice and any necessary Subscription records.
    Idempotent: Returns the existing invoice if already billed.
    """
    if not order:
        raise ValueError("Invalid order.")
        
    if order.quotation.status != "approved":
        raise ValueError("Order's quotation must be approved before billing.")
    
    # Check idempotency
    existing_invoice = db.query(Invoice).filter_by(order_id=order.id).first()
    if existing_invoice:
        return existing_invoice
        
    initial_amount = Decimal(0)
    now = datetime.now(timezone.utc)
    
    for line in order.quotation.lines:
        line_qty = line.quantity
        line_total = Decimal(str(line.line_total))
        product = line.product
        
        if product.product_type == "recurring":
            interval = product.billing_interval or "monthly"
            if interval != "monthly":
                raise ValueError(f"Unsupported billing interval: {interval}")
                
            # For subscriptions, calculate unit amount
            sub_amount = round_money(line_total / Decimal(line_qty)) if line_qty > 0 else Decimal(0)
            
            sub = Subscription(
                customer_id=order.customer_id,
                product_id=product.id,
                order_id=order.id,
                status="active",
                billing_interval=product.billing_interval or "monthly",
                quantity=line_qty,
                amount=sub_amount,
                start_date=now,
                next_billing_date=now + timedelta(days=30)
            )
            db.add(sub)
            initial_amount += line_total
        else:
            initial_amount += line_total
            
    invoice = Invoice(
        order_id=order.id,
        amount=round_money(initial_amount),
        status="unpaid"
    )
    db.add(invoice)
    db.flush()
    return invoice

def update_subscription_quantity(db: Session, subscription: Subscription, new_quantity: int):
    """
    Update a subscription's quantity, generating a prorated charge or credit.
    """
    if new_quantity <= 0:
        raise ValueError("Quantity must be strictly greater than zero.")
        
    if new_quantity == subscription.quantity:
        return None
        
    if subscription.status == "cancelled":
        raise ValueError("Cannot update quantity for a cancelled subscription.")
        
    if not subscription.start_date or not subscription.next_billing_date:
        raise ValueError("Subscription is missing required billing dates.")
        
    if subscription.next_billing_date < subscription.start_date:
        raise ValueError("next_billing_date cannot be before start_date.")
        
    now = datetime.now(timezone.utc)
    next_billing = subscription.next_billing_date or now
    
    if next_billing.tzinfo is None:
        now = now.replace(tzinfo=None)
    
    # Enforce strict 30-day bounded proration logic
    affected_days = (next_billing - now).days
    if affected_days < 0:
        affected_days = 0
    if affected_days > 30:
        affected_days = 30
        
    daily_rate = Decimal(str(subscription.amount)) / Decimal("30")
    quantity_delta = Decimal(new_quantity - subscription.quantity)
    
    prorated_amount = daily_rate * Decimal(affected_days) * quantity_delta
    prorated_amount = round_money(prorated_amount)
    
    subscription.quantity = new_quantity
    
    invoice = Invoice(
        order_id=subscription.order_id,
        amount=prorated_amount,
        status="unpaid"
    )
    db.add(invoice)
    db.flush()
    return invoice

def cancel_subscription(db: Session, subscription: Subscription):
    """
    Cancel a subscription and generate a prorated credit for remaining days.
    """
    if subscription.status == "cancelled":
        raise ValueError("Subscription is already cancelled.")
        
    subscription.status = "cancelled"
    
    if not subscription.start_date or not subscription.next_billing_date:
        raise ValueError("Subscription is missing required billing dates.")
        
    if subscription.next_billing_date < subscription.start_date:
        raise ValueError("next_billing_date cannot be before start_date.")
    
    now = datetime.now(timezone.utc)
    next_billing = subscription.next_billing_date or now
    
    if next_billing.tzinfo is None:
        now = now.replace(tzinfo=None)
    
    affected_days = (next_billing - now).days
    if affected_days < 0:
        affected_days = 0
    if affected_days > 30:
        affected_days = 30
        
    daily_rate = Decimal(str(subscription.amount)) / Decimal("30")
    quantity_delta = Decimal(-subscription.quantity)
    
    prorated_amount = daily_rate * Decimal(affected_days) * quantity_delta
    prorated_amount = round_money(prorated_amount)
    
    invoice = Invoice(
        order_id=subscription.order_id,
        amount=prorated_amount,
        status="unpaid"
    )
    db.add(invoice)
    db.flush()
    return invoice
