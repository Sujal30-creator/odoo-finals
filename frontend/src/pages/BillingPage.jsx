import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../services/adapters';
import { Card, MetricCard } from '../components/Card';
import { StatusBadge } from '../components/Badge';
import { 
  Receipt, 
  CreditCard, 
  Repeat, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  RefreshCw
} from 'lucide-react';

export default function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(searchParams.get('orderId') || '');
  const [billingData, setBillingData] = useState(null);
  const [products, setProducts] = useState({});

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Seat update states
  const [seatInputs, setSeatInputs] = useState({});
  const [proratedResult, setProratedResult] = useState(null);

  // 1. Initial Load: orders and products
  useEffect(() => {
    async function loadInit() {
      try {
        const [ordersData, prodsData] = await Promise.all([
          api.getOrders(),
          api.getProducts(),
        ]);
        setOrders(ordersData || []);

        const pMap = {};
        (prodsData || []).forEach((p) => {
          pMap[p.id] = p.name;
        });
        setProducts(pMap);

        const initialId = searchParams.get('orderId') || (ordersData && ordersData.length > 0 ? String(ordersData[0].id) : '');
        if (initialId) {
          setSelectedOrderId(initialId);
        }
      } catch (err) {
        setError(err.formattedMessage || 'Failed to initialize billing data');
      } finally {
        setLoading(false);
      }
    }
    loadInit();
  }, []);

  // 2. Fetch billing for selected order
  const fetchBilling = async (orderId) => {
    if (!orderId) return;
    setError(null);
    try {
      const data = await api.getBillingStatus(orderId);
      setBillingData(data);
      // Initialize seat inputs
      const initialSeats = {};
      (data.subscriptions || []).forEach((s) => {
        initialSeats[s.id] = s.quantity;
      });
      setSeatInputs(initialSeats);
    } catch (err) {
      setError(err.formattedMessage || `Failed to fetch billing status for order #${orderId}`);
      setBillingData(null);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      fetchBilling(selectedOrderId);
      setSearchParams({ orderId: selectedOrderId });
    }
  }, [selectedOrderId]);

  // Generate initial billing
  const handleGenerateBilling = async () => {
    if (!selectedOrderId) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.generateBilling(selectedOrderId);
      setBillingData(res);
      setSuccessMsg('Initial billing generated! Invoices and recurring subscriptions created.');
    } catch (err) {
      setError(err.formattedMessage || 'Billing generation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Update subscription seats / proration
  const handleUpdateQuantity = async (subscriptionId) => {
    const newQty = Number(seatInputs[subscriptionId]);
    if (!newQty || newQty <= 0) {
      setError('Please enter a valid seat quantity (> 0).');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    setProratedResult(null);
    try {
      const res = await api.updateSubscriptionQuantity(subscriptionId, newQty);
      setProratedResult(res.prorated_invoice);
      setSuccessMsg(`Subscription updated to ${newQty} seats with mid-cycle proration.`);
      // Refresh billing data
      await fetchBilling(selectedOrderId);
    } catch (err) {
      setError(err.formattedMessage || 'Failed to update subscription quantity');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Billing &amp; Subscription Operations
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Automated invoice generation, payment reconciliation, and subscription seat proration
          </p>
        </div>

        {/* Order Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select Order:</span>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 220 }}
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            disabled={loading}
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} (Total: {formatCurrency(o.total_amount)})
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchBilling(selectedOrderId)}
            className="btn btn-secondary"
            title="Refresh"
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

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <div>{successMsg}</div>
        </div>
      )}

      {selectedOrderId && (
        <>
          {/* Summary Row */}
          <div className="grid-3">
            <MetricCard
              label="Order Payment Status"
              value={billingData?.order_payment_status || 'UNBILLED'}
              subtext={`Order ID #${selectedOrderId}`}
              color={billingData?.order_payment_status === 'PAID' ? 'emerald' : 'rose'}
              icon={CreditCard}
            />
            <MetricCard
              label="Generated Invoices"
              value={billingData?.invoices?.length || 0}
              subtext="One-time &amp; recurring initial billing"
              icon={Receipt}
            />
            <MetricCard
              label="Active Subscriptions"
              value={billingData?.subscriptions?.length || 0}
              subtext="Recurring services"
              color="amber"
              icon={Repeat}
            />
          </div>

          {/* Action Card */}
          <Card title="Billing Engine Control">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Initial Billing Pipeline</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Separates one-time product lines from recurring contracts, schedules monthly cycles, and produces initial invoices.
                </div>
              </div>

              <button
                onClick={handleGenerateBilling}
                disabled={actionLoading}
                className="btn btn-primary"
              >
                <Play size={15} />
                <span>{actionLoading ? 'Generating...' : 'Generate Initial Billing'}</span>
              </button>
            </div>
          </Card>

          {/* Invoices Table */}
          <Card title={`Invoices (${billingData?.invoices?.length || 0})`}>
            {billingData?.invoices && billingData.invoices.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Amount</th>
                      <th>Payment Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          INV-#{inv.id}
                        </td>
                        <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(inv.amount)}
                        </td>
                        <td>
                          <StatusBadge status={inv.status} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Generated from Order #{inv.order_id}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                No invoices generated yet. Click "Generate Initial Billing" above.
              </div>
            )}
          </Card>

          {/* Proration Alert if triggered */}
          {proratedResult && (
            <div className="alert alert-info">
              <CreditCard size={18} />
              <div>
                <strong>Prorated Invoice Created: </strong>
                Invoice #{proratedResult.id} for {formatCurrency(proratedResult.amount)} generated for seat adjustment.
              </div>
            </div>
          )}

          {/* Subscriptions Table */}
          <Card title={`Recurring Subscriptions (${billingData?.subscriptions?.length || 0})`}>
            {billingData?.subscriptions && billingData.subscriptions.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Interval</th>
                      <th>Seats / Qty</th>
                      <th>Unit Amount</th>
                      <th>Next Billing Date</th>
                      <th style={{ width: 220, textAlign: 'right' }}>Modify Seats &amp; Prorate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingData.subscriptions.map((sub) => (
                      <tr key={sub.id}>
                        <td style={{ fontWeight: 600 }}>
                          {products[sub.product_id] || `Product #${sub.product_id}`}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{sub.billing_interval}</td>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {sub.quantity}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(sub.amount)}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {formatDate(sub.next_billing_date)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number"
                              min="1"
                              style={{ width: 70 }}
                              className="form-input"
                              value={seatInputs[sub.id] ?? sub.quantity}
                              onChange={(e) =>
                                setSeatInputs({ ...seatInputs, [sub.id]: e.target.value })
                              }
                            />
                            <button
                              onClick={() => handleUpdateQuantity(sub.id)}
                              disabled={actionLoading}
                              className="btn btn-secondary btn-sm"
                              title="Update seats and generate prorated invoice"
                            >
                              <span>Update</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                No recurring subscription products associated with this order.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
