"""
Tests for services/recommendation_service.py
=============================================
All OpenAI API calls are mocked – no real API key required.
"""
import math
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models import User, Customer, Product, Quotation, QuoteLine
from services import recommendation_service as svc


# ---------------------------------------------------------------------------
# Helpers to build deterministic unit-length embeddings
# ---------------------------------------------------------------------------

def _unit_vec(values):
    """Normalise a list of floats to a unit vector."""
    norm = math.sqrt(sum(v * v for v in values))
    return [v / norm for v in values] if norm else values


# ---------------------------------------------------------------------------
# SQLite in-memory fixture (matches pattern of existing tests)
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_embedding_cache():
    """Ensure embedding cache is empty before every test."""
    svc._embedding_cache.clear()
    yield
    svc._embedding_cache.clear()


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    yield session
    session.close()


def _seed_base(db):
    rep  = User(name="Rep", email="rep@ex.com", password_hash="h", role="sales_rep")
    cust = Customer(name="Acme", tier="basic")
    db.add_all([rep, cust])
    db.commit()
    return rep, cust


def _add_product(db, *, name, sku, category="Software", product_type="one-time",
                 price=1000, unit_cost=500, is_active=True, billing_interval=None):
    p = Product(
        name=name, sku=sku, category=category,
        price=price, unit_cost=unit_cost,
        product_type=product_type, is_active=is_active,
        billing_interval=billing_interval,
    )
    db.add(p)
    db.commit()
    return p


def _add_quotation(db, rep, cust, products_with_price):
    """Create a quotation and add QuoteLines for each (product, price) pair."""
    q = Quotation(
        quotation_number=f"QT-{rep.id}-{cust.id}-{id(products_with_price)}",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
    )
    db.add(q)
    db.commit()

    for product, unit_price in products_with_price:
        line = QuoteLine(
            quotation_id=q.id,
            product_id=product.id,
            quantity=1,
            unit_price=unit_price,
            discount_percent=0,
            tax_rate=0,
            line_total=unit_price,
            unit_cost=product.unit_cost,
        )
        db.add(line)
    db.commit()
    return q


# ---------------------------------------------------------------------------
# 1. Quotation with products → returns recommendations
# ---------------------------------------------------------------------------

def test_returns_recommendations(db):
    rep, cust = _seed_base(db)
    p_in_quote = _add_product(db, name="Storage A", sku="S1", category="Storage")
    p_candidate = _add_product(db, name="Storage B", sku="S2", category="Storage")

    q = _add_quotation(db, rep, cust, [(p_in_quote, 1000)])

    # Both embeddings identical → similarity = 1.0
    mock_emb = _unit_vec([1, 0, 0])

    with patch.object(svc, "_get_embedding", return_value=mock_emb):
        result = svc.get_recommendations(db, q.id)

    assert result["quotation_id"] == q.id
    assert len(result["recommendations"]) >= 1
    rec = result["recommendations"][0]
    assert rec["product_id"] == p_candidate.id
    assert rec["product_name"] == "Storage B"
    assert "similarity_score" in rec
    assert "reason" in rec
    assert "margin" in rec


# ---------------------------------------------------------------------------
# 2. Products already in quotation are excluded
# ---------------------------------------------------------------------------

def test_products_in_quotation_excluded(db):
    rep, cust = _seed_base(db)
    p1 = _add_product(db, name="Widget A", sku="W1")
    p2 = _add_product(db, name="Widget B", sku="W2")

    q = _add_quotation(db, rep, cust, [(p1, 500), (p2, 600)])

    mock_emb = _unit_vec([1, 2, 3])

    with patch.object(svc, "_get_embedding", return_value=mock_emb):
        result = svc.get_recommendations(db, q.id)

    returned_ids = {r["product_id"] for r in result["recommendations"]}
    assert p1.id not in returned_ids
    assert p2.id not in returned_ids


# ---------------------------------------------------------------------------
# 3. Top recommendations sorted descending by similarity
# ---------------------------------------------------------------------------

def test_sorted_by_similarity_descending(db):
    rep, cust = _seed_base(db)
    p_in = _add_product(db, name="Base",    sku="B0")
    p_a  = _add_product(db, name="Alpha",   sku="A1", price=2000, unit_cost=800)
    p_b  = _add_product(db, name="Beta",    sku="B1", price=3000, unit_cost=1200)
    p_c  = _add_product(db, name="Gamma",   sku="C1", price=4000, unit_cost=2000)

    q = _add_quotation(db, rep, cust, [(p_in, 1000)])

    query_emb  = _unit_vec([1, 0, 0])
    # Assign different similarities: A=0.9, B=0.7, C=0.5
    emb_a = _unit_vec([1, 0.1, 0])   # close to query
    emb_b = _unit_vec([1, 0.6, 0])   # moderate
    emb_c = _unit_vec([1, 1.2, 0])   # further

    emb_map = {
        svc._fingerprint(svc._product_text(p_a)): emb_a,
        svc._fingerprint(svc._product_text(p_b)): emb_b,
        svc._fingerprint(svc._product_text(p_c)): emb_c,
    }

    def mock_get_embedding(text):
        fp = svc._fingerprint(text)
        # Return query embedding for the query text
        if "Customer is currently evaluating" in text:
            return query_emb
        return emb_map.get(fp, _unit_vec([0, 0, 1]))

    with patch.object(svc, "_get_embedding", side_effect=mock_get_embedding):
        result = svc.get_recommendations(db, q.id, top_n=3)

    recs = result["recommendations"]
    scores = [r["similarity_score"] for r in recs]
    assert scores == sorted(scores, reverse=True)


# ---------------------------------------------------------------------------
# 4. Non-existent quotation → LookupError
# ---------------------------------------------------------------------------

def test_nonexistent_quotation_raises_lookup_error(db):
    with pytest.raises(LookupError, match="not found"):
        svc.get_recommendations(db, quotation_id=99999)


# ---------------------------------------------------------------------------
# 5. Quotation with no lines → empty recommendations + message
# ---------------------------------------------------------------------------

def test_empty_quotation_returns_message(db):
    rep, cust = _seed_base(db)
    q = Quotation(
        quotation_number="QT-EMPTY",
        customer_id=cust.id,
        sales_rep_id=rep.id,
        status="draft",
    )
    db.add(q)
    db.commit()

    result = svc.get_recommendations(db, q.id)
    assert result["recommendations"] == []
    assert "message" in result
    assert result["message"]


# ---------------------------------------------------------------------------
# 6. Inactive products are excluded
# ---------------------------------------------------------------------------

def test_inactive_products_excluded(db):
    rep, cust = _seed_base(db)
    p_active   = _add_product(db, name="Active",   sku="AC1", is_active=True)
    p_inactive = _add_product(db, name="Inactive", sku="IN1", is_active=False)
    p_in_quote = _add_product(db, name="InQuote",  sku="IQ1")

    q = _add_quotation(db, rep, cust, [(p_in_quote, 1000)])

    mock_emb = _unit_vec([1, 0, 0])

    with patch.object(svc, "_get_embedding", return_value=mock_emb):
        result = svc.get_recommendations(db, q.id)

    returned_ids = {r["product_id"] for r in result["recommendations"]}
    assert p_inactive.id not in returned_ids


# ---------------------------------------------------------------------------
# 7. Margin calculation is correct
# ---------------------------------------------------------------------------

def test_margin_calculation(db):
    rep, cust = _seed_base(db)
    p_in   = _add_product(db, name="Base",  sku="BA1", price=1000, unit_cost=400)
    p_cand = _add_product(db, name="Cand",  sku="CA1", price=5000, unit_cost=2000)

    q = _add_quotation(db, rep, cust, [(p_in, 1000)])

    mock_emb = _unit_vec([1, 0, 0])

    with patch.object(svc, "_get_embedding", return_value=mock_emb):
        result = svc.get_recommendations(db, q.id)

    rec = next(r for r in result["recommendations"] if r["product_id"] == p_cand.id)
    assert rec["price"]         == 5000.0
    assert rec["unit_cost"]     == 2000.0
    assert rec["margin"]        == 3000.0
    assert rec["margin_percent"] == 60.0


# ---------------------------------------------------------------------------
# 8. Embedding cache avoids duplicate API calls
# ---------------------------------------------------------------------------

def test_embedding_cache(db):
    rep, cust = _seed_base(db)
    p_in   = _add_product(db, name="Base",  sku="BC1")
    p_cand = _add_product(db, name="Cand",  sku="CC1")
    q = _add_quotation(db, rep, cust, [(p_in, 1000)])

    call_count = 0
    def counting_embedding(text):
        nonlocal call_count
        call_count += 1
        return _unit_vec([1, 0, 0])

    with patch.object(svc, "_get_embedding", side_effect=counting_embedding):
        svc.get_recommendations(db, q.id)
        first_call_count = call_count
        svc.get_recommendations(db, q.id)  # second call

    # Second call should not have triggered additional product embeddings
    # (only query embedding is always recomputed; product embeddings are cached)
    # call_count should only grow by 1 (for the query) on the second call
    assert call_count == first_call_count + 1


# ---------------------------------------------------------------------------
# Similar Deals Tests
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_quotation_embedding_cache():
    svc._quotation_embedding_cache.clear()
    yield
    svc._quotation_embedding_cache.clear()


def test_similar_deals_nonexistent_quotation(db):
    with pytest.raises(LookupError):
        svc.get_similar_deals(db, 9999)


def test_similar_deals_empty_if_no_others(db):
    rep, cust = _seed_base(db)
    p = _add_product(db, sku="1", name="Product 1")
    q = _add_quotation(db, rep, cust, [(p, 10)])

    res = svc.get_similar_deals(db, q.id)
    assert res["quotation_id"] == q.id
    assert res["similar_deals"] == []


@patch.object(svc, "_get_embedding")
def test_similar_deals_ranking(mock_embed, db):
    rep, cust = _seed_base(db)
    p1 = _add_product(db, sku="1", name="Product 1")
    p2 = _add_product(db, sku="2", name="Product 2")

    # Q1: Target quotation
    list1 = [(p1, 100)]
    q1 = _add_quotation(db, rep, cust, list1)
    
    # Q2: Very similar (also has p1)
    list2 = [(p1, 100), (p2, 10)]
    q2 = _add_quotation(db, rep, cust, list2)
    q2.quotation_number = "Q2-Sim"
    q2.status = "approved"
    
    # Q3: Different (has p2)
    list3 = [(p2, 100)]
    q3 = _add_quotation(db, rep, cust, list3)
    q3.quotation_number = "Q3-Sim"

    db.commit()

    # Mock embeddings based on text content
    def mock_embedding_impl(text):
        if "Product 1" in text:
            return _unit_vec([1, 0, 0])
        elif "Product 2" in text:
            return _unit_vec([0, 1, 0])
        return _unit_vec([0, 0, 1])

    mock_embed.side_effect = mock_embedding_impl

    res = svc.get_similar_deals(db, q1.id)
    deals = res["similar_deals"]
    assert len(deals) == 2
    
    # Q2 should be most similar
    assert deals[0]["quotation_id"] == q2.id
    assert deals[0]["similarity_score"] > deals[1]["similarity_score"]
    
    # Check insight and fields
    assert "approved" in deals[0]["status"]
    assert "pricing_insight" in deals[0]
