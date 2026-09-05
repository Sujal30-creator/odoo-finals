from sqlalchemy.orm import Session
from decimal import Decimal
from models import Quotation, NegotiationComment

def submit_customer_counteroffer(
    db: Session,
    quotation: Quotation,
    customer_id: int,
    comment: str,
    proposed_discount_percent: float = None
) -> NegotiationComment:
    """
    Submit a counteroffer from a customer for a quotation.
    """
    if quotation.customer_id != customer_id:
        raise PermissionError("Customer is not authorized to access this quotation.")
        
    if quotation.status == "lost":
        raise ValueError("Cannot negotiate a lost quotation.")
        
    if quotation.orders:
        raise ValueError("Cannot negotiate a quotation that has already been converted into an order.")

    if not comment or not comment.strip():
        raise ValueError("Comment cannot be empty.")

    if proposed_discount_percent is not None:
        if proposed_discount_percent < 0 or proposed_discount_percent > 100:
            raise ValueError("Proposed discount must be between 0 and 100.")

    # A counteroffer resets the status to "draft" for Sales Rep review
    quotation.status = "draft"

    # Create the comment
    nc = NegotiationComment(
        quotation_id=quotation.id,
        customer_id=customer_id,
        comment=comment.strip(),
        proposed_discount_percent=Decimal(str(proposed_discount_percent)) if proposed_discount_percent is not None else None
    )

    db.add(nc)
    db.flush()
    return nc

def get_negotiation_history(db: Session, quotation_id: int):
    """
    Retrieve the negotiation history for a quotation in deterministic chronological order.
    """
    return (
        db.query(NegotiationComment)
        .filter_by(quotation_id=quotation_id)
        .order_by(NegotiationComment.created_at.asc(), NegotiationComment.id.asc())
        .all()
    )
