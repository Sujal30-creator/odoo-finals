import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency, formatPercent } from '../services/adapters';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/Badge';
import RecommendationsPanel from '../components/RecommendationsPanel';
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Activity, 
  MessageSquare, 
  AlertTriangle,
  FileCheck
} from 'lucide-react';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [dealHealth, setDealHealth] = useState(null);
  const [productsMap, setProductsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const quoteData = await api.getQuotation(id);
      setQuote(quoteData);

      // Concurrently fetch customer, deal health, and products
      const [custData, healthData, prodsData] = await Promise.all([
        quoteData.customer_id ? api.getCustomer(quoteData.customer_id).catch(() => null) : null,
        api.getDealHealth(id).catch(() => null),
        api.getProducts().catch(() => []),
      ]);

      setCustomer(custData);
      setDealHealth(healthData);

      const pMap = {};
      (prodsData || []).forEach((p) => {
        pMap[p.id] = p.name;
      });
      setProductsMap(pMap);
    } catch (err) {
      setError(err.formattedMessage || 'Failed to fetch quotation details from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  const handleSubmitForApproval = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await api.submitApproval(id, quote.sales_rep_id || 1);
      setSuccessMsg('Quotation submitted for approval!');
      await fetchDetails();
    } catch (err) {
      setError(err.formattedMessage || 'Failed to submit quotation for approval');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const order = await api.confirmQuotation(id);
      setSuccessMsg(`Quotation converted to Order ${order.order_number}!`);
      // Navigate to fulfillment page with order selected
      navigate(`/fulfillment?orderId=${order.id}`);
    } catch (err) {
      setError(err.formattedMessage || 'Failed to confirm quotation to order');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
        <div>Loading quotation #{id}...</div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="empty-state">
        <p>Quotation #{id} not found.</p>
        <Link to="/" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {quote.quotation_number || `QT-${quote.id}`}
              </h1>
              <StatusBadge status={quote.status} />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Created for {customer?.name || `Customer #${quote.customer_id}`} (Tier: {customer?.tier || 'Standard'})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(`/deal-health?id=${quote.id}`)}
            className="btn btn-secondary"
          >
            <Activity size={16} />
            <span>Deal Health</span>
          </button>

          <button
            onClick={() => navigate(`/portal?id=${quote.id}&customerId=${quote.customer_id}`)}
            className="btn btn-secondary"
          >
            <MessageSquare size={16} />
            <span>Customer Portal</span>
          </button>

          {quote.status === 'draft' && (
            <button
              onClick={handleSubmitForApproval}
              disabled={actionLoading}
              className="btn btn-primary"
            >
              <Send size={16} />
              <span>{actionLoading ? 'Submitting...' : 'Submit for Approval'}</span>
            </button>
          )}

          {quote.status === 'pending_approval' && (
            <button
              onClick={() => navigate('/approvals')}
              className="btn btn-secondary"
              style={{ borderColor: 'var(--amber)', color: '#fbbf24' }}
            >
              <FileCheck size={16} />
              <span>Review in Approval Center</span>
            </button>
          )}

          {quote.status === 'approved' && (
            <button
              onClick={handleConfirmOrder}
              disabled={actionLoading}
              className="btn btn-success"
            >
              <CheckCircle2 size={16} />
              <span>{actionLoading ? 'Converting...' : 'Confirm Order & Fulfill'}</span>
            </button>
          )}
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

      {/* Summary Cards */}
      <div className="grid-3">
        <Card title="Financial Overview">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
              <span>Discount Total:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>-{formatCurrency(quote.discount_total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tax Total:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(quote.tax_total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '1.2rem' }}>
              <span>Grand Total:</span>
              <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{formatCurrency(quote.grand_total)}</span>
            </div>
          </div>
        </Card>

        <Card title="Governance & Risk Score">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Risk Score:</span>
              <span style={{ 
                fontSize: '1.5rem', 
                fontWeight: 800, 
                fontFamily: 'var(--font-mono)',
                color: Number(quote.risk_score) > 10 ? '#f87171' : Number(quote.risk_score) > 0 ? '#fbbf24' : '#34d399'
              }}>
                {Number(quote.risk_score || 0).toFixed(1)}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {Number(quote.risk_score) > 10 ? (
                <span style={{ color: '#f87171' }}>Critical risk: exceeds manager auto-approval threshold.</span>
              ) : Number(quote.risk_score) > 0 ? (
                <span style={{ color: '#fbbf24' }}>Moderate risk: requires standard manager review.</span>
              ) : (
                <span style={{ color: '#34d399' }}>Low risk: within standard pricing parameters.</span>
              )}
            </div>
          </div>
        </Card>

        <Card title="Real-time Deal Health">
          {dealHealth ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={dealHealth.health_status} type="health" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {dealHealth.anomalies?.length || 0} active anomalies
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {dealHealth.anomalies?.length > 0 ? (
                  dealHealth.anomalies[0].message
                ) : (
                  'No deal risks detected by backend governance.'
                )}
              </div>
              <button
                onClick={() => navigate(`/deal-health?id=${quote.id}`)}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 6 }}
              >
                Inspect Health Details
              </button>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Health status pending.</div>
          )}
        </Card>
      </div>

      {/* Line Items Table */}
      <Card title={`Products in Quotation (${quote.lines?.length || 0})`}>
        {quote.lines && quote.lines.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Discount %</th>
                  <th>Unit Cost</th>
                  <th style={{ textAlign: 'right' }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((line) => (
                  <tr key={line.id}>
                    <td style={{ fontWeight: 600 }}>
                      {productsMap[line.product_id] || `Product #${line.product_id}`}
                    </td>
                    <td>{line.quantity}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(line.unit_price)}</td>
                    <td>
                      <span style={{ color: Number(line.discount_percent) > 0 ? '#fbbf24' : 'inherit' }}>
                        {formatPercent(line.discount_percent)}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {formatCurrency(line.unit_cost)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(line.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No line items in this quotation.</div>
        )}
      </Card>

      {/* AI Recommendations — only rendered when quotation has an ID */}
      {quote?.id && (
        <RecommendationsPanel
          quotationId={quote.id}
          onAddLine={async (productId, unitPrice) => {
            await api.addQuoteLine(quote.id, {
              product_id: productId,
              quantity: 1,
              unit_price: unitPrice,
              discount_percent: 0,
              tax_rate: 0,
              unit_cost: 0,
            });
            await fetchDetails();
          }}
        />
      )}
    </div>
  );
}
