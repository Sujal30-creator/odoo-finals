from sqlalchemy.orm import Session
from models import Quotation, DiscountRule

def get_discount_limit(db: Session, tier: str, category: str) -> float:
    """
    Determine the applicable discount limit using customer tier and product category.
    Highest priority: exact match on tier AND category.
    Fallback 1: match on tier only.
    Fallback 2: match on category only.
    Fallback 3: default limit (0%).
    """
    rule = db.query(DiscountRule).filter(
        DiscountRule.tier == tier,
        DiscountRule.category == category
    ).first()
    if rule:
        return float(rule.max_discount_percent)

    rule = db.query(DiscountRule).filter(
        DiscountRule.tier == tier,
        DiscountRule.category.is_(None)
    ).first()
    if rule:
        return float(rule.max_discount_percent)

    rule = db.query(DiscountRule).filter(
        DiscountRule.tier.is_(None),
        DiscountRule.category == category
    ).first()
    if rule:
        return float(rule.max_discount_percent)

    return 0.0

def evaluate_quotation_discount(db: Session, quotation: Quotation) -> dict:
    """
    Evaluates the discount risk for a quotation.
    Returns a dictionary with risk_score, required_approval_level, and explanation.
    Also updates quotation.risk_score in the database session.
    """
    if not quotation.customer:
        raise ValueError("Quotation must have an associated customer.")

    tier = quotation.customer.tier
    total_risk = 0.0
    line_explanations = []

    for line in quotation.lines:
        if not line.product:
            continue
            
        category = line.product.category
        allowed = get_discount_limit(db, tier, category)
        actual = float(line.discount_percent)
        
        excess = max(0.0, actual - allowed)
        total_risk += excess
        
        if excess > 0:
            line_explanations.append(
                f"[{line.product.name}] requested {actual}% vs allowed {allowed}%"
            )
            
    quotation.risk_score = total_risk
    
    if total_risk == 0:
        approval_level = "no_approval"
        explanation = "Discounts within limits."
    elif total_risk <= 10.0:
        approval_level = "sales_manager"
        explanation = "Manager approval needed: " + "; ".join(line_explanations)
    else:
        approval_level = "finance"
        explanation = "Finance approval needed (risk > 10): " + "; ".join(line_explanations)
        
    return {
        "risk_score": total_risk,
        "approval_level": approval_level,
        "explanation": explanation
    }
