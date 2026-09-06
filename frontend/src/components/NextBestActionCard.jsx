import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bot, AlertTriangle, AlertCircle, Info,
  CheckCircle2, ArrowRight, RefreshCw, Send,
  FileCheck, MessageSquare, TrendingDown, Truck,
} from 'lucide-react';

/**
 * NextBestActionCard
 * ------------------
 * Displays the highest-priority recommended action for a quotation.
 * NEVER rendered for customer-role users (enforced here + in parent).
 *
 * Props:
 *   quotationId  – id of the quotation
 *   quotation    – quotation object (for action button routing)
 */
export default function NextBestActionCard({ quotationId, quotation }) {
  const { isCustomer, isSalesRep, isManager, isFinance, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Never show to customers
  if (isCustomer) return null;

  const fetchNBA = async () => {
    if (!quotationId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getNextBestAction(quotationId);
      setData(result);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.formattedMessage ||
        'Could not load next best action.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNBA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  // -------------------------------------------------------------------------
  // Priority styling
  // -------------------------------------------------------------------------
  const priorityConfig = {
    critical: {
      border:  'rgba(239,68,68,0.4)',
      bg:      'rgba(239,68,68,0.06)',
      badgeBg: 'rgba(239,68,68,0.15)',
      color:   '#f87171',
      icon:    <AlertTriangle size={16} />,
      label:   'CRITICAL',
    },
    warning: {
      border:  'rgba(251,191,36,0.4)',
      bg:      'rgba(251,191,36,0.04)',
      badgeBg: 'rgba(251,191,36,0.15)',
      color:   '#fbbf24',
      icon:    <AlertCircle size={16} />,
      label:   'WARNING',
    },
    normal: {
      border:  'rgba(52,211,153,0.4)',
      bg:      'rgba(52,211,153,0.04)',
      badgeBg: 'rgba(52,211,153,0.15)',
      color:   '#34d399',
      icon:    <CheckCircle2 size={16} />,
      label:   'ON TRACK',
    },
  };

  // -------------------------------------------------------------------------
  // Action button wiring – only surfaces actions that have real routes
  // -------------------------------------------------------------------------
  const buildActionButtons = (nba) => {
    const buttons = [];
    const qt = quotation;

    switch (nba.action_type) {
      case 'review_discount':
        if (qt?.status === 'draft') {
          buttons.push({
            label: 'Submit for Approval',
            icon:  <Send size={14} />,
            onClick: () => navigate(`/quotation/${quotationId}`),
          });
        }
        break;

      case 'resolve_approval':
        buttons.push({
          label: 'Open Approval Center',
          icon:  <FileCheck size={14} />,
          onClick: () => navigate('/approvals'),
        });
        break;

      case 'review_fulfillment':
        if (qt?.orders?.length > 0) {
          buttons.push({
            label: 'Go to Fulfillment',
            icon:  <Truck size={14} />,
            onClick: () => navigate(`/fulfillment?orderId=${qt.orders[0].id}`),
          });
        }
        break;

      case 'chase_payment':
        if (qt?.orders?.length > 0) {
          buttons.push({
            label: 'View Billing',
            icon:  <TrendingDown size={14} />,
            onClick: () => navigate(`/billing?orderId=${qt.orders[0].id}`),
          });
        }
        break;

      case 'respond_to_customer':
      case 'follow_up_customer':
        buttons.push({
          label: 'Open Customer Portal',
          icon:  <MessageSquare size={14} />,
          onClick: () =>
            navigate(`/portal?id=${quotationId}&customerId=${qt?.customer_id}`),
        });
        break;

      case 'review_approval_history':
        buttons.push({
          label: 'Approval Center',
          icon:  <FileCheck size={14} />,
          onClick: () => navigate('/approvals'),
        });
        break;

      default:
        break;
    }

    // Always surface Deal Health for non-normal states
    if (nba.priority !== 'normal') {
      buttons.push({
        label: 'Deal Health',
        icon:  <AlertTriangle size={14} />,
        onClick: () => navigate(`/deal-health?id=${quotationId}`),
        secondary: true,
      });
    }

    return buttons;
  };

  const cfg = data ? (priorityConfig[data.priority] || priorityConfig.normal) : null;

  return (
    <div
      id="nba-card"
      style={{
        border: `1px solid ${cfg?.border || 'var(--border-subtle)'}`,
        background: cfg?.bg || 'var(--bg-card)',
        borderRadius: 16,
        padding: '20px 24px',
        marginBottom: 24,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={16} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
              Next Best Action
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
              Rule-based · Deterministic · Explainable
            </p>
          </div>
        </div>
        <button
          onClick={fetchNBA}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          <span style={{ fontSize: '0.85rem' }}>Analysing deal signals…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171', fontSize: '0.85rem' }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {data && !loading && !error && (() => {
        const buttons = buildActionButtons(data);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Priority badge + action */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: cfg.badgeBg,
                color: cfg.color,
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}>
                {cfg.icon}
                {cfg.label}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4 }}>
                {data.action}
              </div>
            </div>

            {/* Reason */}
            <div style={{
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              borderLeft: `3px solid ${cfg.color}`,
              paddingLeft: 10,
              fontStyle: 'italic',
            }}>
              <span style={{ fontWeight: 600, fontStyle: 'normal', color: 'var(--text-secondary)' }}>Why? </span>
              {data.reason}
            </div>

            {/* Source signals */}
            {data.source_signals?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.source_signals.map((sig) => (
                  <span key={sig} style={{
                    fontSize: '0.72rem',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 6,
                    padding: '2px 8px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {sig.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            {buttons.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {buttons.map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.onClick}
                    className={btn.secondary ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                    style={!btn.secondary ? {
                      background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}44)`,
                      borderColor: cfg.color,
                      color: cfg.color,
                    } : {}}
                  >
                    {btn.icon}
                    <span>{btn.label}</span>
                    {!btn.secondary && <ArrowRight size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
