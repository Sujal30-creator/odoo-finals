import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Card } from '../components/common/Card';
import { MetricCard } from '../components/common/MetricCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ArrowUpDown, Search, Check, X, Edit, Save } from 'lucide-react';

export const ManagerApprovalDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await apiService.getManagerApprovalById(id);
      setQuote(data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const handleApprove = async () => {
    const user = apiService.getCurrentUser?.();
    const managerName = user?.name || 'manager';
    await apiService.approveQuotation(id, managerName);
    navigate('/approvals');
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason');
    if (reason !== null) {
      const user = apiService.getCurrentUser?.();
      const managerName = user?.name || 'manager';
      await apiService.rejectQuotation(id, managerName, reason);
      navigate('/approvals');
    }
  };

  const handleRequestChanges = async () => {
    const comment = prompt('Enter change request comment');
    if (comment !== null) {
      const user = apiService.getCurrentUser?.();
      const managerName = user?.name || 'manager';
      await apiService.requestQuotationChanges(id, managerName, comment);
      navigate('/approvals');
    }
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading quotation...</div>;
  if (!quote) return <div style={{ padding: '24px' }}>Quotation not found.</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px' }}>Quotation Review – #{quote.quoteId}</h1>
      <Card style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <MetricCard title="Customer" value={quote.customerName} />
          <MetricCard title="Sales Rep" value={quote.salesRep} />
          <MetricCard title="Deal Value" value={`$${quote.dealValue?.toLocaleString() ?? 0}`} />
          <MetricCard title="Requested Discount" value={`${quote.requestedDiscount?.toFixed(1) ?? 0}%`} />
          <MetricCard title="Allowed Discount" value={`${quote.allowedDiscount?.toFixed(1) ?? 0}%`} />
          <MetricCard title="Risk Level" value={<Badge status={quote.riskLevel} />} />
          <MetricCard title="Required Approval" value={quote.requiredApproval} />
          <MetricCard title="Submitted" value={new Date(quote.submissionDate).toLocaleDateString()} />
          <MetricCard title="Status" value={quote.status} />
        </div>
      </Card>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Button variant="success" size="lg" icon={Check} onClick={handleApprove}>Approve</Button>
        <Button variant="danger" size="lg" icon={X} onClick={handleReject}>Reject</Button>
        <Button variant="warning" size="lg" icon={Edit} onClick={handleRequestChanges}>Request Changes</Button>
        <Button variant="secondary" size="lg" icon={ArrowUpDown} onClick={() => navigate('/approvals')}>Back to List</Button>
      </div>
    </div>
  );
};
