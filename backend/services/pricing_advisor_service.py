import json
import os
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from openai import OpenAI
from models import Quotation
from services.discount_service import get_discount_limit, evaluate_quotation_discount
from services.recommendation_service import get_similar_deals

def get_discount_recommendation(db: Session, quotation_id: int) -> Dict[str, Any]:
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quotation:
        raise LookupError("Quotation not found")

    if not quotation.lines:
        raise ValueError("Quotation has no lines")

    tier = quotation.customer.tier if quotation.customer else "standard"
    
    # Calculate current states
    subtotal = 0.0
    total_cost = 0.0
    current_discount_value = 0.0
    allowed_limits = []

    for line in quotation.lines:
        if not line.product:
            continue
        line_subtotal = line.quantity * float(line.unit_price)
        subtotal += line_subtotal
        total_cost += line.quantity * float(line.product.unit_cost)
        current_discount_value += line_subtotal * (float(line.discount_percent) / 100.0)
        
        limit = get_discount_limit(db, tier, line.product.category)
        allowed_limits.append(limit)

    if not allowed_limits:
        raise ValueError("No valid products in quotation")

    # Strictest limit to avoid any approval
    max_allowed_discount_percent = min(allowed_limits)
    current_discount_percent = (current_discount_value / subtotal * 100.0) if subtotal > 0 else 0.0

    # Get similar deals context
    similar_deals = get_similar_deals(db, quotation_id).get("similar_deals", [])
    approved_similar = [d for d in similar_deals if d["status"] == "approved"]
    
    similar_discounts_str = "No similar approved deals found."
    if approved_similar:
        discounts = [(d["discount_total"] / d["grand_total"] * 100) if d["grand_total"] > 0 else 0 for d in approved_similar]
        min_sim = min(discounts)
        max_sim = max(discounts)
        similar_discounts_str = f"Similar approved deals had discounts ranging from {min_sim:.1f}% to {max_sim:.1f}%."

    # Current margin
    current_revenue = subtotal - current_discount_value
    current_margin_percent = ((current_revenue - total_cost) / current_revenue * 100) if current_revenue > 0 else 0.0

    # Call OpenAI
    api_key = os.environ.get("OPENAI_API_KEY")
    ai_response = None
    
    if api_key:
        try:
            client = OpenAI(api_key=api_key)
            prompt = f"""
You are an AI Pricing Advisor for a B2B Sales platform.
Recommend a commercially reasonable discount percentage for the following quotation.

Quotation Data:
- Subtotal: ${subtotal:.2f}
- Current Discount: {current_discount_percent:.1f}%
- Policy Maximum Discount (without needing manager approval): {max_allowed_discount_percent:.1f}%
- Total Cost: ${total_cost:.2f}
- Current Margin: {current_margin_percent:.1f}%
- Historical Context: {similar_discounts_str}

Rules:
1. Provide a single 'recommended_discount_percent'.
2. It MUST NOT exceed the Policy Maximum Discount ({max_allowed_discount_percent:.1f}%).
3. The discount should ideally be within the historical range if it is below the policy maximum.
4. Keep margins healthy (aim for > 20% if possible).

Output strictly in this JSON format:
{{
  "recommended_discount_percent": 5.0,
  "reason": "Clear, professional explanation",
  "recommendation_strength": "high|medium|low",
  "supporting_factors": ["factor 1", "factor 2"]
}}
"""
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a helpful JSON API that responds exactly as requested."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.0
            )
            ai_response = json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"OpenAI error: {e}")
            ai_response = None

    # Fallback / Validation
    if ai_response:
        rec_discount = float(ai_response.get("recommended_discount_percent", 0.0))
        # CLAMP to bounds
        rec_discount = max(0.0, min(rec_discount, max_allowed_discount_percent))
        reason = ai_response.get("reason", "AI recommendation applied and constrained by policy limits.")
        strength = ai_response.get("recommendation_strength", "medium")
        factors = ai_response.get("supporting_factors", [])
    else:
        # Graceful fallback
        rec_discount = max_allowed_discount_percent if max_allowed_discount_percent > 0 else 0.0
        reason = "AI pricing advice temporarily unavailable. Fallback to maximum allowed policy limit."
        strength = "low"
        factors = ["Fallback to deterministic policy limits due to AI unavailability."]

    # Calculate expected margin at recommended discount
    expected_revenue = subtotal * (1 - (rec_discount / 100.0))
    expected_margin_percent = ((expected_revenue - total_cost) / expected_revenue * 100.0) if expected_revenue > 0 else 0.0

    return {
        "quotation_id": quotation_id,
        "current_discount_percent": round(current_discount_percent, 2),
        "allowed_discount_percent": round(max_allowed_discount_percent, 2),
        "recommended_discount_percent": round(rec_discount, 2),
        "expected_margin_percent": round(expected_margin_percent, 2),
        "approval_required": False,  # We explicitly clamp to avoid approval
        "recommendation_strength": strength,
        "reason": reason,
        "supporting_factors": factors
    }
