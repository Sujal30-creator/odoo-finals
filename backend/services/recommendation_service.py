"""
Semantic Upsell / Cross-Sell Recommendation Service
=====================================================
Uses OpenAI text-embedding-3-small to compute semantic similarity between
products and the current quotation context.

Design:
- Embeddings cached in memory keyed by (product_id, text_fingerprint).
- No pgvector or DB migrations required.
- OPENAI_API_KEY read from environment only; never exposed via any endpoint.
- Cosine similarity as recommended by OpenAI embedding guidance.
"""

from __future__ import annotations

import hashlib
import math
import os
from typing import Dict, List, Tuple

from sqlalchemy.orm import Session

import models

# ---------------------------------------------------------------------------
# In-memory embedding cache
# key: (product_id, text_fingerprint)  value: List[float]
# ---------------------------------------------------------------------------
_embedding_cache: Dict[Tuple[int, str], List[float]] = {}


def _product_text(product: models.Product) -> str:
    """Build a deterministic text description from real Product fields only."""
    parts = [f"Product: {product.name}"]
    if product.category:
        parts.append(f"Category: {product.category}")
    if product.product_type:
        parts.append(f"Type: {product.product_type}")
    if product.billing_interval:
        parts.append(f"Billing: {product.billing_interval}")
    return "\n".join(parts)


def _fingerprint(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()


def _get_embedding(text: str) -> List[float]:
    """Call OpenAI Embeddings API. API key read from environment."""
    from openai import OpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set in the environment")

    client = OpenAI(api_key=api_key)
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


def _get_product_embedding(product: models.Product) -> List[float]:
    """Return cached embedding, fetching from OpenAI only on cache miss."""
    text = _product_text(product)
    fp = _fingerprint(text)
    cache_key = (product.id, fp)
    if cache_key not in _embedding_cache:
        _embedding_cache[cache_key] = _get_embedding(text)
    return _embedding_cache[cache_key]


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _build_query_text(lines: List[models.QuoteLine]) -> str:
    descriptions = []
    for line in lines:
        if line.product:
            descriptions.append(_product_text(line.product))
    if not descriptions:
        return ""
    return "Customer is currently evaluating:\n" + "\n---\n".join(descriptions)


def _generate_reason(
    candidate: models.Product,
    quotation_lines: List[models.QuoteLine],
) -> str:
    existing_categories = {
        line.product.category
        for line in quotation_lines
        if line.product and line.product.category
    }
    existing_types = {
        line.product.product_type
        for line in quotation_lines
        if line.product and line.product.product_type
    }

    reasons = []
    if candidate.category and candidate.category in existing_categories:
        reasons.append(f"same category ({candidate.category})")
    if candidate.product_type and candidate.product_type in existing_types:
        reasons.append(f"same product type ({candidate.product_type})")

    if reasons:
        return (
            f"Semantically related to the current quotation "
            f"— shares {' and '.join(reasons)} with existing line items."
        )

    line_names = [
        line.product.name for line in quotation_lines[:3] if line.product
    ]
    if line_names:
        joined = ", ".join(line_names)
        return (
            f"Semantically similar to the quotation's current products "
            f"({joined}) based on embedding similarity."
        )

    return "Semantically similar to the products in this quotation."


def get_recommendations(
    db: Session,
    quotation_id: int,
    top_n: int = 3,
) -> dict:
    """
    Return top-N upsell/cross-sell recommendations for a quotation.
    Raises LookupError if quotation not found.
    Returns dict with 'recommendations' list (may be empty with message).
    """
    quote = (
        db.query(models.Quotation)
        .filter(models.Quotation.id == quotation_id)
        .first()
    )
    if quote is None:
        raise LookupError(f"Quotation {quotation_id} not found")

    lines = (
        db.query(models.QuoteLine)
        .filter(models.QuoteLine.quotation_id == quotation_id)
        .all()
    )

    if not lines:
        return {
            "quotation_id": quotation_id,
            "recommendations": [],
            "message": "No line items in this quotation; add products first.",
        }

    for line in lines:
        _ = line.product  # force lazy load

    existing_product_ids = {line.product_id for line in lines}

    candidates: List[models.Product] = (
        db.query(models.Product)
        .filter(
            models.Product.is_active.is_(True),
            models.Product.id.notin_(existing_product_ids),
        )
        .all()
    )

    if not candidates:
        return {
            "quotation_id": quotation_id,
            "recommendations": [],
            "message": "No additional active products available to recommend.",
        }

    query_text = _build_query_text(lines)
    if not query_text:
        return {
            "quotation_id": quotation_id,
            "recommendations": [],
            "message": "Could not build a semantic query from the current quotation.",
        }

    query_embedding = _get_embedding(query_text)

    scored: List[Tuple[float, models.Product]] = []
    for candidate in candidates:
        try:
            candidate_embedding = _get_product_embedding(candidate)
            score = _cosine_similarity(query_embedding, candidate_embedding)
            scored.append((score, candidate))
        except Exception:
            continue

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_n]

    recommendations = []
    for score, product in top:
        price = float(product.price)
        unit_cost = float(product.unit_cost)
        margin = round(price - unit_cost, 2)
        margin_percent = round((margin / price * 100) if price > 0 else 0.0, 2)

        recommendations.append({
            "product_id": product.id,
            "product_name": product.name,
            "similarity_score": round(score, 4),
            "price": price,
            "unit_cost": unit_cost,
            "margin": margin,
            "margin_percent": margin_percent,
            "reason": _generate_reason(product, lines),
        })

    return {
        "quotation_id": quotation_id,
        "recommendations": recommendations,
    }


# ---------------------------------------------------------------------------
# Similar Historical Deal Finder
# ---------------------------------------------------------------------------
_quotation_embedding_cache: Dict[Tuple[int, str], List[float]] = {}


def _quotation_text(quotation: models.Quotation) -> str:
    """Build a deterministic text description from real Quotation/Customer fields."""
    parts = []
    if quotation.customer and quotation.customer.tier:
        parts.append(f"Customer Tier: {quotation.customer.tier}")
    
    product_summaries = []
    for line in quotation.lines:
        if line.product:
            desc = f"- {line.product.name}"
            if line.product.category:
                desc += f" ({line.product.category})"
            if line.product.product_type:
                desc += f" [{line.product.product_type}]"
            product_summaries.append(desc)
            
    if product_summaries:
        parts.append("Products Included:\n" + "\n".join(product_summaries))
        
    parts.append(f"Status: {quotation.status}")
    return "\n".join(parts)


def _get_quotation_embedding(quotation: models.Quotation) -> List[float]:
    """Return cached embedding for quotation, fetching from OpenAI on cache miss."""
    text = _quotation_text(quotation)
    fp = _fingerprint(text)
    cache_key = (quotation.id, fp)
    if cache_key not in _quotation_embedding_cache:
        _quotation_embedding_cache[cache_key] = _get_embedding(text)
    return _quotation_embedding_cache[cache_key]


def get_similar_deals(db: Session, quotation_id: int, top_n: int = 3) -> dict:
    """
    Return top-N similar historical deals for a quotation.
    Raises LookupError if quotation not found.
    Returns dict with 'similar_deals' list.
    """
    quote = (
        db.query(models.Quotation)
        .filter(models.Quotation.id == quotation_id)
        .first()
    )
    if quote is None:
        raise LookupError(f"Quotation {quotation_id} not found")

    try:
        query_embedding = _get_quotation_embedding(quote)
    except Exception:
        return {"quotation_id": quotation_id, "similar_deals": []}

    historical_quotes = (
        db.query(models.Quotation)
        .filter(models.Quotation.id != quotation_id)
        .order_by(models.Quotation.id.desc())
        .limit(10)
        .all()
    )
    
    scored = []
    for h_quote in historical_quotes:
        if not h_quote.lines:
            continue
        try:
            h_emb = _get_quotation_embedding(h_quote)
            score = _cosine_similarity(query_embedding, h_emb)
            scored.append((score, h_quote))
        except Exception:
            continue

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_n]

    similar_deals = []
    
    # Generate pricing insight from approved deals in top
    approved_deals = [h for _, h in top if h.status == "approved"]
    discounts = []
    for a in approved_deals:
        sub = float(a.subtotal) if a.subtotal else 0.0
        dt = float(a.discount_total) if a.discount_total else 0.0
        if sub > 0:
            discounts.append(dt / sub * 100)
    
    insight = None
    if discounts:
        min_d = round(min(discounts), 1)
        max_d = round(max(discounts), 1)
        if min_d == max_d:
            insight = f"Similar approved quotations used a discount of {min_d}%."
        else:
            insight = f"Similar approved quotations used discounts between {min_d}%–{max_d}%."

    for score, h_quote in top:
        similar_deals.append({
            "quotation_id": h_quote.id,
            "quotation_number": h_quote.quotation_number,
            "similarity_score": round(score, 4),
            "status": h_quote.status,
            "grand_total": float(h_quote.grand_total) if h_quote.grand_total else 0.0,
            "discount_total": float(h_quote.discount_total) if h_quote.discount_total else 0.0,
            "customer_tier": h_quote.customer.tier if h_quote.customer else "",
            "risk_score": float(h_quote.risk_score) if h_quote.risk_score else 0.0,
            "pricing_insight": insight,
        })

    return {
        "quotation_id": quotation_id,
        "similar_deals": similar_deals
    }
