import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency } from '../services/adapters';
import { Card, MetricCard } from '../components/Card';
import { 
  Truck, 
  Package, 
  Warehouse, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Receipt,
  Eye
} from 'lucide-react';

export default function FulfillmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(searchParams.get('orderId') || '');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [warehouses, setWarehouses] = useState({});
  const [products, setProducts] = useState({});

  // Fulfillment status data
  const [previewData, setPreviewData] = useState(null);
  const [statusData, setStatusData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. Initial Load: orders, warehouses, products
  useEffect(() => {
    async function loadInit() {
      try {
        const [ordersData, whData, prodData] = await Promise.all([
          api.getOrders(),
          api.getWarehouses(),
          api.getProducts(),
        ]);

        setOrders(ordersData || []);

        const whMap = {};
        (whData || []).forEach((w) => {
          whMap[w.id] = w.name;
        });
        setWarehouses(whMap);

        const pMap = {};
        (prodData || []).forEach((p) => {
          pMap[p.id] = p.name;
        });
        setProducts(pMap);

        const initialId = searchParams.get('orderId') || (ordersData && ordersData.length > 0 ? String(ordersData[0].id) : '');
        if (initialId) {
          setSelectedOrderId(initialId);
        }
      } catch (err) {
        setError(err.formattedMessage || 'Failed to initialize fulfillment data');
      } finally {
        setLoading(false);
      }
    }
    loadInit();
  }, []);

  // 2. Fetch order and fulfillment records on order change
  const fetchOrderFulfillment = async (orderId) => {
    if (!orderId) return;
    setError(null);
    setPreviewData(null);
    try {
      const [orderData, fulfillData] = await Promise.all([
        api.getOrder(orderId),
        api.getFulfillmentStatus(orderId).catch(() => null),
      ]);
      setSelectedOrder(orderData);
      setStatusData(fulfillData);
    } catch (err) {
      setError(err.formattedMessage || `Failed to fetch status for order #${orderId}`);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderFulfillment(selectedOrderId);
      setSearchParams({ orderId: selectedOrderId });
    }
  }, [selectedOrderId]);

  // Preview allocation
  const handlePreview = async () => {
    if (!selectedOrderId) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.previewFulfillment(selectedOrderId);
      setPreviewData(res);
    } catch (err) {
      setError(err.formattedMessage || 'Fulfillment preview failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm and fulfill
  const handleConfirmFulfillment = async () => {
    if (!selectedOrderId) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.confirmFulfillment(selectedOrderId);
      setStatusData(res);
      setSuccessMsg('Fulfillment successfully allocated across warehouses!');
      await fetchOrderFulfillment(selectedOrderId);
    } catch (err) {
      setError(err.formattedMessage || 'Fulfillment confirmation failed');
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
            Warehouse Fulfillment &amp; Splitting
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Automated multi-warehouse inventory allocation, shipment consolidation, and backorder routing
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
            onClick={() => fetchOrderFulfillment(selectedOrderId)}
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

      {selectedOrder ? (
        <>
          {/* Order Info Card */}
          <div className="grid-3">
            <MetricCard
              label="Order Number"
              value={selectedOrder.order_number}
              subtext={`Status: ${selectedOrder.status} | Payment: ${selectedOrder.payment_status}`}
              icon={Package}
            />
            <MetricCard
              label="Order Amount"
              value={formatCurrency(selectedOrder.total_amount)}
              subtext={`Customer ID: #${selectedOrder.customer_id}`}
              color="emerald"
              icon={Warehouse}
            />
            <MetricCard
              label="Shipments Allocated"
              value={statusData?.shipment_count ?? 0}
              subtext={`Total Fulfilled Units: ${statusData?.total_fulfilled_quantity ?? 0}`}
              color="amber"
              icon={Truck}
            />
          </div>

          {/* Action Card */}
          <Card title="Fulfillment Execution Engine">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Automated Stock Allocation</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Evaluates active warehouse stocks, optimizes shipment splits, and creates backorders for stock deficiencies.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handlePreview}
                  disabled={actionLoading}
                  className="btn btn-secondary"
                >
                  <Eye size={15} />
                  <span>Preview Allocation</span>
                </button>

                <button
                  onClick={handleConfirmFulfillment}
                  disabled={actionLoading}
                  className="btn btn-primary"
                >
                  <Play size={15} />
                  <span>{actionLoading ? 'Processing...' : 'Execute Fulfillment'}</span>
                </button>

                <Link
                  to={`/billing?orderId=${selectedOrder.id}`}
                  className="btn btn-secondary"
                  title="Go to billing"
                >
                  <Receipt size={15} />
                  <span>Billing</span>
                </Link>
              </div>
            </div>

            {/* Preview Banner */}
            {previewData && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(79, 70, 229, 0.3)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 6, fontSize: '0.9rem' }}>
                  Preview Simulation Results:
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.85rem' }}>
                  <div>
                    Fulfilled Quantity: <strong>{previewData.total_fulfilled_quantity} units</strong>
                  </div>
                  <div>
                    Shipment Count: <strong>{previewData.shipment_count} warehouse shipment(s)</strong>
                  </div>
                  <div>
                    Est. Shipping Cost: <strong>{formatCurrency(previewData.estimated_shipping_cost)}</strong>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Real Warehouse Allocations */}
          <Card title={`Warehouse Allocations (${statusData?.fulfillments?.length || 0})`}>
            {statusData?.fulfillments && statusData.fulfillments.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Fulfillment Warehouse</th>
                      <th>Allocated Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusData.fulfillments.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>
                          {products[item.product_id] || `Product #${item.product_id}`}
                        </td>
                        <td>
                          {warehouses[item.warehouse_id] || `Warehouse #${item.warehouse_id}`}
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {item.quantity} units
                        </td>
                        <td>
                          <span className="badge badge-green">Allocated</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                No active fulfillments allocated yet. Click "Execute Fulfillment" above.
              </div>
            )}
          </Card>

          {/* Backorders Section */}
          <Card title={`Backorders & Pending Stock (${statusData?.backorders?.length || 0})`}>
            {statusData?.backorders && statusData.backorders.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Backorder Quantity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusData.backorders.map((bo) => (
                      <tr key={bo.id}>
                        <td style={{ fontWeight: 600 }}>
                          {products[bo.product_id] || `Product #${bo.product_id}`}
                        </td>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f87171' }}>
                          {bo.remaining_quantity} units
                        </td>
                        <td>
                          <span className="badge badge-yellow">Awaiting Restock</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                No backorders for this order. Complete inventory was available in warehouses!
              </div>
            )}
          </Card>
        </>
      ) : (
        <div className="empty-state">
          <p>No orders found. Confirm a quotation first to create an order.</p>
          <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
            Go to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
