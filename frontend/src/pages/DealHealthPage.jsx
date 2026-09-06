import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { getDealHealthBadge, getSeverityBadge } from '../services/adapters';
import { Card } from '../components/Card';
import { 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  RefreshCw,
  Info
} from 'lucide-react';

export default function DealHealthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [quotations, setQuotations] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState(searchParams.get('id') || '');
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Fetch available quotations for dropdown
  useEffect(() => {
    async function loadQuotations() {
      try {
        const data = await api.getQuotations();
        setQuotations(data || []);
        if (!selectedQuoteId && data && data.length > 0) {
          setSelectedQuoteId(String(data[0].id));
          setSearchParams({ id: String(data[0].id) });
        }
      } catch (err) {
        setError(err.formattedMessage || 'Failed to load quotations list');
      } finally {
        setLoading(false);
      }
    }
    loadQuotations();
  }, []);

  // 2. Fetch deal health when selectedQuoteId changes
  const fetchHealth = async (quoteId) => {
    if (!quoteId) return;
    setHealthLoading(true);
    setError(null);
    try {
      const data = await api.getDealHealth(quoteId);
      setHealthData(data);
    } catch (err) {
      setError(err.formattedMessage || `Failed to fetch deal health for quotation #${quoteId}`);
      setHealthData(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    if (selectedQuoteId) {
      fetchHealth(selectedQuoteId);
    }
  }, [selectedQuoteId]);

  const handleSelectQuote = (e) => {
    const id = e.target.value;
    setSelectedQuoteId(id);
    setSearchParams({ id });
  };

  const healthStatus = healthData?.health_status?.toLowerCase() || 'green';
  const badgeInfo = getDealHealthBadge(healthStatus);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Deal Health &amp; Anomaly Scanner
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Deterministic risk detection for stalled deals, discount anomalies, and delivery slippage
          </p>
        </div>

        {/* Quotation Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select Deal:</span>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 220 }}
            value={selectedQuoteId}
            onChange={handleSelectQuote}
            disabled={loading}
          >
            {quotations.map((q) => (
              <option key={q.id} value={q.id}>
                {q.quotation_number || `QT-${q.id}`} (Status: {q.status})
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchHealth(selectedQuoteId)}
            className="btn btn-secondary"
            title="Refresh deal health"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Main Health Status Display */}
      {healthLoading ? (
        <div className="empty-state">
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <div>Evaluating deal health telemetry from backend service...</div>
        </div>
      ) : healthData ? (
        <>
          <div className={`health-box ${healthStatus}`}>
            <div className={`health-beacon ${healthStatus}`}>
              {healthStatus === 'green' && <CheckCircle2 size={32} />}
              {healthStatus === 'yellow' && <AlertTriangle size={32} />}
              {healthStatus === 'red' && <AlertCircle size={32} />}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  {badgeInfo.label} DEAL
                </span>
                <span className="badge badge-slate" style={{ fontFamily: 'var(--font-mono)' }}>
                  {healthData.quotation_number || `QT-${healthData.quotation_id}`}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                {healthStatus === 'green' &&
                  'All governance conditions satisfied. Margin, discount limits, and fulfillment SLAs are on schedule.'}
                {healthStatus === 'yellow' &&
                  'Potential friction detected. One non-critical warning requires attention.'}
                {healthStatus === 'red' &&
                  'Critical deal risk identified. Requires immediate managerial intervention or approval review.'}
              </p>
            </div>

            <Link
              to={`/quotations/${healthData.quotation_id}`}
              className="btn btn-secondary"
              style={{ alignSelf: 'center' }}
            >
              <Eye size={15} />
              <span>View Quotation</span>
            </Link>
          </div>

          {/* Anomalies List */}
          <Card
            title={`Detected Anomalies (${healthData.anomalies?.length || 0})`}
            action={
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Endpoint: GET /api/quotations/{healthData.quotation_id}/deal-health
              </span>
            }
          >
            {healthData.anomalies?.length === 0 ? (
              <div className="alert alert-success" style={{ marginBottom: 0 }}>
                <CheckCircle2 size={18} />
                <div>
                  <strong>Zero Anomalies:</strong> This quotation passed all health checks cleanly. No discount violations, stalled transitions, or unpaid fulfillment flags detected.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {healthData.anomalies.map((anomaly, idx) => {
                  const sevInfo = getSeverityBadge(anomaly.severity);
                  const isCritical = anomaly.severity === 'critical';

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 14,
                        padding: 16,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface-elevated)',
                        borderLeft: `4px solid ${isCritical ? 'var(--rose)' : 'var(--amber)'}`,
                      }}
                    >
                      <div style={{ marginTop: 2 }}>
                        {isCritical ? (
                          <AlertCircle size={20} color="var(--rose)" />
                        ) : (
                          <AlertTriangle size={20} color="var(--amber)" />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', textTransform: 'capitalize' }}>
                            {anomaly.type.replace(/_/g, ' ')}
                          </span>
                          <span className={`badge ${sevInfo.bg} ${sevInfo.text} ${sevInfo.border}`}>
                            {sevInfo.label}
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                          {anomaly.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Business Rules Info Box */}
          <Card title="Deal Health Governance Rules">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <Info size={16} style={{ color: '#818cf8', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>High Discount Risk (Critical):</strong> Triggered when blended risk score exceeds 10.0.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Info size={16} style={{ color: '#818cf8', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Stalled Quotation (Warning):</strong> Quotations in pending approval or draft for extended periods without action.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Info size={16} style={{ color: '#818cf8', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Payment Risk (Critical):</strong> Order has active warehouse fulfillments but payment status remains UNPAID.
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <div className="empty-state">Select a quotation to evaluate its deal health.</div>
      )}
    </div>
  );
}
