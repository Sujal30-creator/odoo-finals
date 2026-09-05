import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { MetricCard } from '../components/common/MetricCard';
import { Card } from '../components/common/Card';

export const ManagerDashboardPage = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    apiService.getDashboardSummary().then(setSummary);
  }, []);

  if (!summary) return <div>Loading manager dashboard...</div>;

  const { totalDeals, totalQuotationValue, avgMarginPct, pendingApprovalsQueue, atRiskDealsWithReasons, stalledDeals, pipelineByStage, recentQuotations, dealIntelligence, myWork, actionRequired } = summary;

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px' }}>Manager Dashboard</h1>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <MetricCard title="Total Deals" value={totalDeals} />
        <MetricCard title="Total Quotation Value" value={`$${totalQuotationValue.toLocaleString()}`} />
        <MetricCard title="Avg. Margin %" value={`${avgMarginPct}%`} />
        <MetricCard title="Pending Approvals" value={pendingApprovalsQueue.length} />
        <MetricCard title="At‑Risk Deals" value={atRiskDealsWithReasons.length} />
        <MetricCard title="Stalled Deals" value={stalledDeals.length} />
      </div>

      <section style={{ marginTop: '32px' }}>
        <h2>Pending Approvals</h2>
        {pendingApprovalsQueue.map((a) => (
          <Card key={a.id} style={{ marginBottom: '8px' }}>
            <div><strong>{a.dealTitle}</strong> – {a.customerName}</div>
            <div>Requested Discount: {a.requestedDiscount}% (Tier limit: {a.tierLimit}%)</div>
            <div>Status: {a.status}</div>
          </Card>
        ))}
      </section>

      <section style={{ marginTop: '32px' }}>
        <h2>Deal Intelligence</h2>
        {dealIntelligence.map((d) => (
          <Card key={d.id} style={{ marginBottom: '8px' }}>
            <div><strong>{d.title}</strong> – {d.severity}</div>
            <div>{d.detail}</div>
            <div>Recommended: {d.recommendedAction}</div>
          </Card>
        ))}
      </section>
    </div>
  );
};
