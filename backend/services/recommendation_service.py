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
