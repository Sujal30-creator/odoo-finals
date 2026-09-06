import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatCurrency } from '../services/adapters';
import { Card, MetricCard } from '../components/Card';
import { StatusBadge } from '../components/Badge';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  Eye, 
  Activity,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [quotesData, approvalsData, customersData] = await Promise.all([
        api.getQuotations(),
        api.getApprovals(),
        api.getCustomers(),
      ]);

      setQuotations(quotesData || []);
      setApprovals(approvalsData || []);

      const custMap = {};
      (customersData || []).forEach((c) => {
        custMap[c.id] = c.name;
      });
      setCustomers(custMap);
    } catch (err) {
      setError(err.formattedMessage || 'Failed to load dashboard data from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute metrics from real data
  const totalQuotations = quotations.length;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;
  const approvedQuotations = quotations.filter((q) => q.status === 'approved').length;
  const totalPipelineValue = quotations.reduce((acc, q) => acc + (Number(q.grand_total) || 0), 0);
  const highRiskDeals = quotations.filter((q) => Number(q.risk_score) > 10.0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Sales Operations Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Real-time governance, approval routing, and deal health tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={fetchData} className="btn btn-secondary" title="Refresh data">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <Link to="/quotations/new" className="btn btn-primary">
            <PlusCircle size={16} />
            <span>Create Quotation</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid-4">
        <MetricCard
          label="Total Quotations"
          value={loading ? '...' : totalQuotations}
          subtext={`Pipeline: ${formatCurrency(totalPipelineValue)}`}
          icon={FileText}
        />
        <MetricCard
          label="Pending Approvals"
          value={loading ? '...' : pendingApprovals}
          subtext="Requires Manager/Finance"
          color="amber"
          icon={Clock}
        />
        <MetricCard
          label="Approved Quotations"
          value={loading ? '...' : approvedQuotations}
          subtext="Ready for fulfillment"
          color="emerald"
          icon={CheckCircle2}
        />
        <MetricCard
          label="High Risk Deals"
          value={loading ? '...' : highRiskDeals}
          subtext="Risk Score &gt; 10.0"
          color={highRiskDeals > 0 ? 'rose' : ''}
          icon={AlertTriangle}
        />
      </div>

      {/* Quick Flow Jump Card */}
      <Card title="Core Demo Workflow Quick Jump">
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
          Click any step to demonstrate the complete self-governing sales flow:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link to="/quotations/new" className="btn btn-secondary btn-sm">
            <span>1. Create Quote</span>
            <ArrowUpRight size={13} />
          </Link>
          <Link to="/approvals" className="btn btn-secondary btn-sm">
            <span>2. Approval Center ({pendingApprovals} Pending)</span>
            <ArrowUpRight size={13} />
          </Link>
          <Link to="/deal-health" className="btn btn-secondary btn-sm">
            <span>3. Deal Health Scanner</span>
            <ArrowUpRight size={13} />
          </Link>
          <Link to="/fulfillment" className="btn btn-secondary btn-sm">
            <span>4. Order Fulfillment</span>
            <ArrowUpRight size={13} />
          </Link>
          <Link to="/billing" className="btn btn-secondary btn-sm">
            <span>5. Billing &amp; Subscriptions</span>
            <ArrowUpRight size={13} />
          </Link>
          <Link to="/portal" className="btn btn-secondary btn-sm">
            <span>6. Customer Portal</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </Card>

      {/* Quotations List */}
      <Card
        title="Recent Quotations"
        action={
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {quotations.length} records
          </span>
        }
      >
        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
            <div>Loading live quotations from PostgreSQL...</div>
          </div>
        ) : quotations.length === 0 ? (
          <div className="empty-state">
            <p>No quotations created yet.</p>
            <Link to="/quotations/new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
              Create First Quotation
            </Link>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quotation #</th>
                  <th>Customer</th>
                  <th>Grand Total</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quote) => {
                  const custName = customers[quote.customer_id] || `Customer #${quote.customer_id}`;
                  const riskScore = Number(quote.risk_score || 0);
                  const isHighRisk = riskScore > 10.0;
                  return (
                    <tr key={quote.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        <Link to={`/quotations/${quote.id}`} style={{ color: '#818cf8' }}>
                          {quote.quotation_number || `QT-${quote.id}`}
                        </Link>
                      </td>
                      <td>{custName}</td>
                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(quote.grand_total)}
                      </td>
                      <td>
                        <span style={{ 
                          fontWeight: 700, 
                          fontFamily: 'var(--font-mono)',
                          color: isHighRisk ? '#f87171' : riskScore > 0 ? '#fbbf24' : '#34d399'
                        }}>
                          {riskScore.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={quote.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => navigate(`/quotations/${quote.id}`)}
                            className="btn btn-secondary btn-sm"
                            title="View quotation details"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => navigate(`/deal-health?id=${quote.id}`)}
                            className="btn btn-secondary btn-sm"
                            title="Inspect Deal Health"
                          >
                            <Activity size={13} />
                            <span>Health</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
