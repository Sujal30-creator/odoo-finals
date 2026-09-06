import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Sparkles, TrendingUp, AlertCircle, RefreshCw, Plus } from 'lucide-react';

/**
 * RecommendationsPanel
 * ---------------------
 * Displays AI-powered upsell/cross-sell recommendations for a quotation.
 * All semantic scoring happens on the backend; this component only renders
 * the data returned by GET /api/quotations/{id}/recommendations.
 *
 * Props:
 *   quotationId  – the quotation ID to fetch recommendations for
 *   onAddLine    – optional async function(productId, price) to add a line
 */
export default function RecommendationsPanel({ quotationId, onAddLine }) {
  const [data, setData]       = useState(null);   // { quotation_id, recommendations, message? }
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [adding, setAdding]   = useState({});     // { [productId]: bool }

  const fetchRecommendations = async () => {
    if (!quotationId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getRecommendations(quotationId);
      setData(result);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.formattedMessage ||
        'Failed to fetch recommendations.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  const handleAdd = async (rec) => {
    if (!onAddLine) return;
    setAdding((prev) => ({ ...prev, [rec.product_id]: true }));
    try {
      await onAddLine(rec.product_id, rec.price);
    } finally {
      setAdding((prev) => ({ ...prev, [rec.product_id]: false }));
    }
  };

  const scoreColor = (score) => {
    if (score >= 0.85) return '#34d399';
    if (score >= 0.7)  return '#fbbf24';
    return '#94a3b8';
  };

  const marginColor = (pct) => {
    if (pct >= 40) return '#34d399';
    if (pct >= 20) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.05) 100%)',
      border: '1px solid rgba(99,102,241,0.25)',
      borderRadius: 16,
      padding: '20px 24px',
      marginTop: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              AI Upsell &amp; Cross-Sell Recommendations
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Semantic similarity · text-embedding-3-small · top 3
            </p>
          </div>
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          title="Refresh recommendations"
          style={{ padding: '6px 10px' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* States */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', padding: '8px 0' }}>
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          <span style={{ fontSize: '0.85rem' }}>Generating semantic recommendations…</span>
        </div>
      )}

      {error && !loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: '#f87171', fontSize: '0.85rem', padding: '8px 0',
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && data?.message && data.recommendations.length === 0 && (
        <div style={{
          color: 'var(--text-muted)', fontSize: '0.85rem',
          padding: '12px 0', fontStyle: 'italic',
        }}>
          {data.message}
        </div>
      )}

      {!loading && !error && data?.recommendations?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.recommendations.map((rec) => (
            <div
              key={rec.product_id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Top row: name + similarity */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{rec.product_name}</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(99,102,241,0.12)',
                  borderRadius: 20,
                  padding: '3px 10px',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  color: scoreColor(rec.similarity_score),
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  <Sparkles size={11} />
                  {(rec.similarity_score * 100).toFixed(1)}% match
                </div>
              </div>

              {/* Financials row */}
              <div style={{ display: 'flex', gap: 16, fontSize: '0.82rem', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Price: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    ${rec.price.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Cost: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    ${rec.unit_cost.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <TrendingUp size={13} color={marginColor(rec.margin_percent)} />
                  <span style={{ color: 'var(--text-muted)' }}>Margin: </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: marginColor(rec.margin_percent),
                  }}>
                    {rec.margin_percent.toFixed(1)}%
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    (${rec.margin.toLocaleString()})
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                lineHeight: 1.5,
                borderLeft: '2px solid rgba(99,102,241,0.4)',
                paddingLeft: 8,
              }}>
                {rec.reason}
              </div>

              {/* Add to quotation button */}
              {onAddLine && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleAdd(rec)}
                    disabled={adding[rec.product_id]}
                    className="btn btn-secondary btn-sm"
                    style={{
                      fontSize: '0.78rem',
                      borderColor: 'rgba(99,102,241,0.5)',
                      color: '#a5b4fc',
                    }}
                  >
                    <Plus size={13} />
                    <span>{adding[rec.product_id] ? 'Adding…' : 'Add to Quotation'}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
