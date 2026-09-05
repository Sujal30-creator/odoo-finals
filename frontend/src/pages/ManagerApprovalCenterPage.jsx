import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ArrowUpDown, Search, Check, X, Edit } from 'lucide-react';

export const ManagerApprovalCenterPage = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('submissionDate');
  const [sortAsc, setSortAsc] = useState(false);

  
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await apiService.getManagerApprovals();
      setApprovals(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const navigate = useNavigate();

  // ... inside table row render replace Review button onClick
  <Button variant="secondary" size="sm" icon={Edit} onClick={() => navigate(`/manager/approval/${a.id}`)}>Review</Button>


  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const filtered = approvals.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.quoteId?.toString().toLowerCase().includes(q) ||
      a.customerName?.toLowerCase().includes(q) ||
      a.salesRep?.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (sortField === 'submissionDate') {
      const da = new Date(valA);
      const db = new Date(valB);
      return sortAsc ? da - db : db - da;
    }
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Summary KPI calculations
  const pendingCount = approvals.length;
  const totalValue = approvals.reduce((sum, a) => sum + (a.dealValue || 0), 0);
  const highRiskCount = approvals.filter((a) => a.riskLevel === 'High' || a.riskLevel === 'Critical').length;

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px' }}>Approval Center</h1>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <MetricCard title="Pending Approvals" value={pendingCount} />
        <MetricCard title="Total Quotation Value" value={`$${totalValue.toLocaleString()}`} />
        <MetricCard title="High‑Risk Approvals" value={highRiskCount} />
      </div>
      <Card style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search Quote ID, Customer, Rep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '8px 12px 8px 36px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
          />
        </div>
      </Card>
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>Loading approvals...</div>
      ) : (
        <Card>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Customer</th>
                <th>Sales Rep</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('dealValue')}>
                  Deal Value <ArrowUpDown size={12} />
                </th>
                <th>Discount %</th>
                <th>Allowed %</th>
                <th>Diff %</th>
                <th>Required Approval</th>
                <th>Risk</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('submissionDate')}>
                  Submitted <ArrowUpDown size={12} />
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id}>
                  <td>{a.quoteId}</td>
                  <td>{a.customerName}</td>
                  <td>{a.salesRep}</td>
                  <td>${a.dealValue?.toLocaleString() ?? 0}</td>
                  <td>{a.requestedDiscount?.toFixed(1)}%</td>
                  <td>{a.allowedDiscount?.toFixed(1)}%</td>
                  <td>{(a.requestedDiscount - a.allowedDiscount).toFixed(1)}%</td>
                  <td>{a.requiredApproval}</td>
                  <td><Badge status={a.riskLevel} /></td>
                  <td>{new Date(a.submissionDate).toLocaleDateString()}</td>
                  <td>{a.status}</td>
                  <td style={{ display: 'flex', gap: '4px' }}>
                    <Button variant="secondary" size="sm" icon={Edit}>Review</Button>
                    <Button variant="success" size="sm" icon={Check}>Approve</Button>
                    <Button variant="danger" size="sm" icon={X}>Reject</Button>
                    <Button variant="warning" size="sm" icon={Edit}>Request Change</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
