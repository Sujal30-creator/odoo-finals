from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from models import Quotation, User, Approval
from services.discount_service import evaluate_quotation_discount

def submit_for_approval(db: Session, quotation: Quotation, requested_by: User) -> Approval:
    """
    Evaluates discount risk and submits the quotation for approval if necessary.
    Creates the first required Approval record (sales_manager) if approval is needed.
    """
    if quotation.status not in ["draft", "negotiating"]:
        raise ValueError(f"Cannot submit quotation in status {quotation.status}.")

    res = evaluate_quotation_discount(db, quotation)
    level = res["approval_level"]
    explanation = res["explanation"]

    if level == "no_approval":
        quotation.status = "approved"
        return None

    # Both "sales_manager" and "finance" require "sales_manager" first in sequence
    quotation.status = "pending_approval"
    
    approval = Approval(
        quotation_id=quotation.id,
        requested_by=requested_by.id,
        reason=f"System routing based on risk. {explanation}",
        requested_discount=0,
        status="pending",
        approval_level="sales_manager"
    )
    db.add(approval)
    db.flush()
    return approval


def process_approval(db: Session, approval: Approval, user: User, action: str, reason: str = ""):
    """
    Process an approval action (approve, reject, return_for_revision).
    """
    if approval.status != "pending":
        raise ValueError("Invalid state transition: Approval is not pending.")
        
    if action not in ["approve", "reject", "return_for_revision"]:
        raise ValueError("Invalid action.")

    # Authorization
    if approval.approval_level == "sales_manager" and user.role not in ["sales_manager", "manager", "finance", "admin"]:
        raise PermissionError("Unauthorized: Need sales_manager, manager, or finance role.")
    if approval.approval_level == "finance" and user.role not in ["finance", "admin"]:
        raise PermissionError("Unauthorized: Need finance role.")

    quotation = approval.quotation
    
    # Audit trail
    approval.approver_id = user.id
    approval.decided_at = func.now()
    approval.reason = reason or action.capitalize()

    if action == "approve":
        approval.status = "approved"
        
        # Check if further approval is needed
        res = evaluate_quotation_discount(db, quotation)
        target_level = res["approval_level"]
        
        if target_level == "finance" and approval.approval_level == "sales_manager":
            # Proceed to finance sequence
            next_approval = Approval(
                quotation_id=quotation.id,
                requested_by=approval.requested_by,
                reason="Sales Manager approved. Proceeding to finance.",
                status="pending",
                approval_level="finance"
            )
            db.add(next_approval)
            db.flush()
            # Quotation stays pending_approval
        else:
            quotation.status = "approved"
            
    elif action == "reject":
        approval.status = "rejected"
        quotation.status = "lost"
        
    elif action == "return_for_revision":
        approval.status = "returned"
        quotation.status = "draft"
