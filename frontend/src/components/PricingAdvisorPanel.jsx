import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, AlertCircle, Percent } from 'lucide-react';
import { api } from '../services/api';

export default function PricingAdvisorPanel({ quotationId, onDiscountApplied }) {
  const [advisor, setAdvisor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!quotationId) return;
    let isMounted = true;
    
    const fetchAdvisor = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getPricingAdvisor(quotationId);
        if (isMounted) setAdvisor(data);
      } catch (err) {
        if (isMounted) {
          setError(err.formattedMessage || 'AI pricing advice temporarily unavailable. Existing discount governance remains active.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchAdvisor();
    return () => { isMounted = false; };
  }, [quotationId]);

  const handleApply = async () => {
    if (!advisor) return;
    try {
      setApplying(true);
      await api.applyQuotationDiscount(quotationId, advisor.recommended_discount_percent);
      if (onDiscountApplied) {
        await onDiscountApplied();
      }
    } catch (err) {
      alert("Failed to apply discount: " + (err.formattedMessage || err.message));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 16, background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', animation: 'pulse 2s infinite' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8b5cf6', fontWeight: 600 }}>
          <Sparkles size={16} />
          <span>Generating AI Pricing Advice...</span>
        </div>
      </div>
    );
  }

  if (error) {
    if (error.toLowerCase().includes('not found') || error.toLowerCase().includes('no valid products')) {
      return null;
    }
    return (
      <div style={{ padding: 16, background: 'var(--bg-surface-elevated)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', gap: 8 }}>
        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: '0.9rem' }}>{error}</span>
      </div>
    );
  }

  if (!advisor) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(to bottom right, rgba(139, 92, 246, 0.05), rgba(79, 70, 229, 0.05))',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: 'var(--radius-md)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: '#8b5cf6', color: 'white', padding: 6, borderRadius: 8, display: 'flex' }}>
          <Sparkles size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#4c1d95' }}>AI Pricing Advisor</div>
          <div style={{ fontSize: '0.8rem', color: '#6d28d9' }}>Data-driven discount recommendation</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, background: 'rgba(255, 255, 255, 0.6)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current Discount</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{advisor.current_discount_percent.toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Policy Limit</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{advisor.allowed_discount_percent.toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#8b5cf6', textTransform: 'uppercase', fontWeight: 700 }}>AI Recommended</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>{advisor.recommended_discount_percent.toFixed(1)}%</div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Margin</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{advisor.expected_margin_percent.toFixed(1)}%</div>
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6, color: 'var(--text-main)' }}>Why?</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: 8 }}>
          {advisor.reason}
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {advisor.supporting_factors.map((factor, idx) => (
            <li key={idx}>{factor}</li>
          ))}
        </ul>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#059669', fontWeight: 600, background: '#d1fae5', padding: '4px 10px', borderRadius: 12 }}>
          <ShieldCheck size={16} />
          <span>No additional approval required</span>
        </div>

        <button
          onClick={handleApply}
          disabled={applying}
          className="btn btn-primary"
          style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
        >
          <Percent size={15} />
          <span>{applying ? 'Applying...' : 'Apply AI Recommendation'}</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
