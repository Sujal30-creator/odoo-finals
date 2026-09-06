import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Search, AlertCircle, RefreshCw, ExternalLink, Info, TrendingUp } from 'lucide-react';

/**
 * SimilarDealsPanel
 * -----------------
 * Displays the top-3 historically similar quotations for the current deal.
 * All semantic scoring happens on the backend; this component only renders
 * data from GET /api/quotations/{id}/similar-deals.
 *
 * Props:
 *   quotationId  – the ID of the current quotation
 */
export default function SimilarDealsPanel({ quotationId }) {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchSimilarDeals = async () => {
    if (!quotationId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getSimilarDeals(quotationId);
      setData(result);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.formattedMessage ||
        'Failed to load similar deals.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimilarDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  const statusColor = (status) => {
    switch (status) {
      case 'approved':  return '#34d399';
      case 'pending_approval': return '#fbbf24';
      case 'draft':     return '#94a3b8';
      case 'lost':      return '#f87171';
      default:          return '#94a3b8';
    }
  };

  const scoreBar = (score) => {
    const pct = Math.round(score * 100);
    const color = pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#94a3b8';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: 1, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
        <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color, minWidth: 36 }}>
          {pct}%
        </span>
      </div>
    );
  };

  // Deduplicate pricing insight (same string for all deals in the batch)
  const insight = data?.similar_deals?.find(d => d.pricing_insight)?.pricing_insight;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(6,182,212,0.04) 0%, rgba(99,102,241,0.04) 100%)',
      border: '1px solid rgba(6,182,212,0.2)',
      borderRadius: 16,
      padding: '20px 24px',
      marginTop: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Search size={16} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Similar Historical Deals
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Semantic similarity · text-embedding-3-small · top 3
            </p>
          </div>
        </div>
        <button
          onClick={fetchSimilarDeals}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 10px' }}
          title="Refresh"
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', padding: '8px 0' }}>
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          <span style={{ fontSize: '0.85rem' }}>Finding semantically similar deals…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontSize: '0.85rem' }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Empty / message */}
      {!loading && !error && data?.message && (!data.similar_deals || data.similar_deals.length === 0) && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '8px 0' }}>
          {data.message}
        </div>
      )}

      {/* Results */}
      {!loading && !error && data?.similar_deals?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.similar_deals.map((deal) => (
            <div
              key={deal.quotation_id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Top row: number + status badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                  {deal.quotation_number}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  background: `${statusColor(deal.status)}22`,
                  color: statusColor(deal.status),
                  border: `1px solid ${statusColor(deal.status)}55`,
                  borderRadius: 20,
                  padding: '2px 10px',
                  fontWeight: 700,
                  textTransform: 'capitalize',
                }}>
                  {deal.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Similarity bar */}
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>Similarity</div>
                {scoreBar(deal.similarity_score)}
              </div>

              {/* Financial row */}
              <div style={{ display: 'flex', gap: 20, fontSize: '0.82rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Total: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    ${deal.grand_total.toLocaleString()}
                  </span>
                </div>
                {deal.discount_total > 0 && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Discount: </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
                      ${deal.discount_total.toLocaleString()}
                    </span>
                  </div>
                )}
                {deal.customer_tier && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Tier: </span>
                    <span style={{ textTransform: 'capitalize' }}>{deal.customer_tier}</span>
                  </div>
                )}
                {deal.risk_score > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TrendingUp size={12} color={deal.risk_score > 10 ? '#f87171' : '#fbbf24'} />
                    <span style={{ color: 'var(--text-muted)' }}>Risk: </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      color: deal.risk_score > 10 ? '#f87171' : '#fbbf24',
                    }}>
                      {deal.risk_score.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* View button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => navigate(`/quotation/${deal.quotation_id}`)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem', borderColor: 'rgba(6,182,212,0.4)', color: '#67e8f9' }}
                >
                  <ExternalLink size={12} />
                  <span>View Deal</span>
                </button>
              </div>
            </div>
          ))}

          {/* Pricing insight — observational only */}
          {insight && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: 'rgba(6,182,212,0.05)',
              border: '1px solid rgba(6,182,212,0.15)',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
            }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1, color: '#67e8f9' }} />
              <div>
                <span style={{ fontWeight: 600, color: '#67e8f9' }}>Pricing Context (Observational): </span>
                {insight}
                <span style={{ display: 'block', fontSize: '0.72rem', marginTop: 4, opacity: 0.7 }}>
                  This is historical context only. Discount governance and approval rules still apply.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
