import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency, formatPercent } from '../services/adapters';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/Badge';
import RecommendationsPanel from '../components/RecommendationsPanel';
import SimilarDealsPanel from '../components/SimilarDealsPanel';
import PricingAdvisorPanel from '../components/PricingAdvisorPanel';
import NextBestActionCard from '../components/NextBestActionCard';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Activity, 
  MessageSquare, 
  AlertTriangle,
  FileCheck,
  Plus,
  Minus
} from 'lucide-react';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCustomer } = useAuth();

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

  const handleQuantityChange = async (lineId, newQuantity) => {
    if (newQuantity < 1) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.updateQuoteLine(id, lineId, { quantity: newQuantity });
      await fetchDetails();
    } catch (err) {
      setError(err.formattedMessage || 'Failed to update quantity');
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

      {/* Next Best Action — only for internal users */}
      {!isCustomer && quote?.id && (
        <NextBestActionCard quotationId={quote.id} quotation={quote} />
      )}

      {/* Summary Cards */}

      {/* Unified Dashboard Summary Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 24,
        background: 'linear-gradient(145deg, rgba(30,41,59,0.4) 0%, rgba(15,23,42,0.6) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Financial Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Financial Overview</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{formatCurrency(quote.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#f87171' }}>
            <span>Discount Total</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>-{formatCurrency(quote.discount_total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Tax Total</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{formatCurrency(quote.tax_total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: 800, fontSize: '1.3rem' }}>
            <span style={{ color: 'var(--text-main)' }}>Grand Total</span>
            <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', textShadow: '0 0 10px rgba(56, 189, 248, 0.3)' }}>{formatCurrency(quote.grand_total)}</span>
          </div>
        </div>

        {/* Governance & Risk */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 24 }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Governance & Risk</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ 
              fontSize: '2.5rem', 
              fontWeight: 800, 
              lineHeight: 1,
              fontFamily: 'var(--font-mono)',
              color: Number(quote.risk_score) > 10 ? '#f87171' : Number(quote.risk_score) > 0 ? '#fbbf24' : '#34d399',
              textShadow: '0 0 15px rgba(0,0,0,0.5)'
            }}>
              {Number(quote.risk_score || 0).toFixed(1)}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Risk Score</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 'auto', lineHeight: 1.4 }}>
            {Number(quote.risk_score) > 10 ? (
              <span style={{ color: '#fca5a5', display: 'flex', gap: 6, alignItems: 'flex-start' }}><AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} /> Critical risk: exceeds manager auto-approval threshold.</span>
            ) : Number(quote.risk_score) > 0 ? (
              <span style={{ color: '#fcd34d', display: 'flex', gap: 6, alignItems: 'flex-start' }}><AlertTriangle size={14} style={{ marginTop: 2, flexShrink: 0 }} /> Moderate risk: requires standard manager review.</span>
            ) : (
              <span style={{ color: '#6ee7b7', display: 'flex', gap: 6, alignItems: 'flex-start' }}><CheckCircle2 size={14} style={{ marginTop: 2, flexShrink: 0 }} /> Low risk: within standard pricing parameters.</span>
            )}
          </div>
        </div>

        {/* Deal Health */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 24 }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Real-time Deal Health</h3>
          {dealHealth ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={dealHealth.health_status} type="health" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                  {dealHealth.anomalies?.length || 0} active anomalies
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {dealHealth.anomalies?.length > 0 ? (
                  dealHealth.anomalies[0].message
                ) : (
                  'No deal risks detected by backend governance.'
                )}
              </div>
              <button
                onClick={() => navigate(`/deal-health?id=${quote.id}`)}
                className="btn btn-sm"
                style={{ marginTop: 'auto', alignSelf: 'flex-start', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              >
                Inspect Health Details
              </button>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="spinner" style={{ width: 14, height: 14 }}></div>
              Health status pending...
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.5) 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(10px)',
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 16, background: '#38bdf8', borderRadius: 2 }}></div>
          Products in Quotation ({quote.lines?.length || 0})
        </h3>
        {quote.lines && quote.lines.length > 0 ? (
          <div className="table-container" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <table className="data-table">
              <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                <tr>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Product</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Quantity</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Unit Price</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Discount %</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Unit Cost</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'right' }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map((line) => (
                  <tr key={line.id} style={{ transition: 'background 0.2s', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '16px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '14px' }}>📦</span>
                        </div>
                        {productsMap[line.product_id] || `Product #${line.product_id}`}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button 
                          onClick={() => handleQuantityChange(line.id, line.quantity - 1)}
                          disabled={line.quantity <= 1 || actionLoading}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: line.quantity <= 1 ? 'not-allowed' : 'pointer', color: 'var(--text-muted)' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ width: 20, textAlign: 'center' }}>{line.quantity}</span>
                        <button 
                          onClick={() => handleQuantityChange(line.id, line.quantity + 1)}
                          disabled={actionLoading}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'var(--font-mono)' }}>{formatCurrency(line.unit_price)}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        background: Number(line.discount_percent) > 0 ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                        color: Number(line.discount_percent) > 0 ? '#fbbf24' : 'inherit',
                        padding: Number(line.discount_percent) > 0 ? '4px 8px' : '0',
                        borderRadius: 4,
                        fontWeight: 600
                      }}>
                        {formatPercent(line.discount_percent)}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {formatCurrency(line.unit_cost)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                      {formatCurrency(line.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', borderRadius: 12 }}>
            No products added to this quotation yet.
          </div>
        )}
      </div>

      {quote?.id && quote.lines?.length > 0 && (
         <div style={{ marginBottom: 24 }}>
           <PricingAdvisorPanel quotationId={quote.id} onDiscountApplied={fetchDetails} />
         </div>
      )}

      {/* AI Recommendations — only rendered when quotation has an ID */}
      {quote?.id && (
        <>
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
          <SimilarDealsPanel quotationId={quote.id} />
        </>
      )}
    </div>
  );
}
