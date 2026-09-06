import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatCurrency, formatPercent, formatDate } from '../services/adapters';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/Badge';
import { 
  MessageSquare, 
  Send, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Percent,
  Clock
} from 'lucide-react';

export default function NegotiationPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  
  // Default to authenticated customer's ID if customer role
  const defaultCustId = user?.role === 'customer' 
    ? String(user.customer_id || user.id || '1')
    : searchParams.get('customerId') || '1';

  const [currentCustomerId, setCurrentCustomerId] = useState(defaultCustId);
  const [portalQuotes, setPortalQuotes] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState(searchParams.get('id') || '');
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [negotiations, setNegotiations] = useState([]);

  // Counter offer form
  const [commentText, setCommentText] = useState('');
  const [proposedDiscount, setProposedDiscount] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. Initial Load Customers
  useEffect(() => {
    async function loadCustomers() {
      try {
        const custData = await api.getCustomers();
        setCustomers(custData || []);
        if (user?.role === 'customer') {
          setCurrentCustomerId(String(user.customer_id || user.id || '1'));
        } else if (custData && custData.length > 0 && !searchParams.get('customerId')) {
          setCurrentCustomerId(String(custData[0].id));
        }
      } catch (err) {
        setError(err.formattedMessage || 'Failed to load customers');
      }
    }
    loadCustomers();
  }, [user]);

  // 2. Fetch Customer Quotations when customer changes
  const fetchPortalQuotations = async (custCustId) => {
    if (!custCustId) return;
    setError(null);
    try {
      const quotes = await api.getPortalQuotations(custCustId);
      setPortalQuotes(quotes || []);

      const targetId = searchParams.get('id') || (quotes && quotes.length > 0 ? String(quotes[0].id) : '');
      if (targetId && quotes.some((q) => String(q.id) === String(targetId))) {
        setSelectedQuoteId(targetId);
      } else if (quotes && quotes.length > 0) {
        setSelectedQuoteId(String(quotes[0].id));
      } else {
        setSelectedQuoteId('');
        setSelectedQuote(null);
        setNegotiations([]);
      }
    } catch (err) {
      setError(err.formattedMessage || 'Failed to fetch customer quotations');
    }
  };

  useEffect(() => {
    if (currentCustomerId) {
      fetchPortalQuotations(currentCustomerId);
    }
  }, [currentCustomerId]);

  // 3. Fetch Quotation Details and Negotiations when selectedQuoteId changes
  const fetchQuoteAndNegotiations = async (quoteId, custId) => {
    if (!quoteId || !custId) return;
    setError(null);
    try {
      const [quoteData, negData] = await Promise.all([
        api.getPortalQuotation(quoteId, custId),
        api.getPortalNegotiations(quoteId, custId),
      ]);
      setSelectedQuote(quoteData);
      setNegotiations(negData || []);
    } catch (err) {
      setError(err.formattedMessage || `Failed to fetch portal quote #${quoteId}`);
    }
  };

  useEffect(() => {
    if (selectedQuoteId && currentCustomerId) {
      fetchQuoteAndNegotiations(selectedQuoteId, currentCustomerId);
      setSearchParams({ id: selectedQuoteId, customerId: currentCustomerId });
    }
  }, [selectedQuoteId, currentCustomerId]);

  // 4. Submit Counter-Offer
  const handleNegotiate = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setError('Please enter a comment or justification for your counter-offer.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updatedQuote = await api.submitPortalNegotiation(
        selectedQuoteId,
        currentCustomerId,
        {
          comment: commentText,
          proposed_discount_percent: proposedDiscount !== '' ? Number(proposedDiscount) : null,
        }
      );

      setSelectedQuote(updatedQuote);
      setSuccessMsg('Counter-offer and comment submitted to sales team! Quotation reset to Draft.');
      setCommentText('');
      setProposedDiscount('');

      // Refresh negotiations history
      const negData = await api.getPortalNegotiations(selectedQuoteId, currentCustomerId);
      setNegotiations(negData || []);
    } catch (err) {
      setError(err.formattedMessage || 'Failed to submit counter-offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header with Customer Identity Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Customer Portal &amp; Negotiation
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Customer-facing quotation review, transparent terms, and collaborative counter-offers
          </p>
        </div>

        {/* Mock Customer Identity Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <Building2 size={16} style={{ color: '#06b6d4' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Customer Login:</span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
            value={currentCustomerId}
            onChange={(e) => setCurrentCustomerId(e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (ID: #{c.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Select Quotation Tab */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Customer Quotation:</span>
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 260 }}
          value={selectedQuoteId}
          onChange={(e) => setSelectedQuoteId(e.target.value)}
          disabled={portalQuotes.length === 0}
        >
          {portalQuotes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.quotation_number || `QT-${q.id}`} - {formatCurrency(q.grand_total)} ({q.status})
            </option>
          ))}
        </select>
        <button
          onClick={() => fetchQuoteAndNegotiations(selectedQuoteId, currentCustomerId)}
          className="btn btn-secondary"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {selectedQuote ? (
        <div className="grid-2">
          {/* Left: Quotation Details as viewed by Customer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{selectedQuote.quotation_number || `QT-${selectedQuote.id}`}</span>
                  <StatusBadge status={selectedQuote.status} />
                </div>
              }
            >
              <div className="table-container" style={{ marginBottom: 16 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedQuote.lines || []).map((l) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600 }}>{l.product_name}</td>
                        <td>{l.quantity}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(l.unit_price)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(l.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div style={{ background: 'var(--bg-surface-elevated)', padding: 16, borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tax:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(selectedQuote.tax_total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontWeight: 800, fontSize: '1.15rem' }}>
                  <span>Grand Total:</span>
                  <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{formatCurrency(selectedQuote.grand_total)}</span>
                </div>
              </div>
            </Card>

            {/* Counter-offer input form */}
            <Card title="Submit Counter-Offer or Feedback">
              <form onSubmit={handleNegotiate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Proposed Target Discount (%) [Optional]</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      placeholder="e.g. 20"
                      className="form-input"
                      value={proposedDiscount}
                      onChange={(e) => setProposedDiscount(e.target.value)}
                    />
                    <Percent size={15} style={{ position: 'absolute', right: 12, top: 12, color: 'var(--text-subtle)' }} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Customer Comment / Negotiation Rationale *</label>
                  <textarea
                    rows="3"
                    placeholder="Provide justification for requested terms (e.g. volume commitment, annual upfront payment, competitor matching)..."
                    className="form-textarea"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Send size={15} />
                  <span>{submitting ? 'Submitting...' : 'Send Counter-Offer to Sales Rep'}</span>
                </button>
              </form>
            </Card>
          </div>

          {/* Right: Negotiation History Timeline */}
          <Card title={`Negotiation History (${negotiations.length})`}>
            {negotiations.length === 0 ? (
              <div className="empty-state">
                <MessageSquare size={32} style={{ margin: '0 auto 12px', color: 'var(--text-subtle)' }} />
                <p>No negotiation comments or counter-offers yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {negotiations.map((item) => {
                  const isCustomer = item.customer_id !== null;
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 14,
                        borderLeft: `3px solid ${isCustomer ? '#06b6d4' : '#818cf8'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isCustomer ? '#38bdf8' : '#a5b4fc' }}>
                          {isCustomer ? 'Customer Request' : 'Sales Team Note'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} />
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      {item.proposed_discount_percent !== null && item.proposed_discount_percent !== undefined && (
                        <div style={{ marginBottom: 6 }}>
                          <span className="badge badge-yellow">
                            Proposed Discount: {formatPercent(item.proposed_discount_percent)}
                          </span>
                        </div>
                      )}

                      <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                        {item.comment}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="empty-state">
          <p>No quotations found for Customer #{currentCustomerId}.</p>
        </div>
      )}
    </div>
  );
}
