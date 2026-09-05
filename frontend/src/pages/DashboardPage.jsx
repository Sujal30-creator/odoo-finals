import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  Briefcase,
  Percent,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Clock,
  Plus,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileCheck
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { apiService } from "../services/api";
import { MetricCard } from "../components/common/MetricCard";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getDashboardSummary().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        Loading Sales Operations Workspace...
      </div>
    );
  }

  const stageColors = {
    Draft: "#94a3b8",
    "Pending Approval": "#fbbf24",
    "In Negotiation": "#60a5fa",
    Approved: "#34d399",
    Confirmed: "#818cf8",
    Won: "#10b981"
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Operations Dashboard</h1>
          <p className="page-subtitle">Real-time deal pipeline, governance exceptions, pending approvals, and stalled deal alerts</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/deals">
            <Button variant="outline" icon={Briefcase}>
              View Pipeline
            </Button>
          </Link>
          <Link to="/quotations/new">
            <Button variant="primary" icon={Plus}>
              Create Quotation
            </Button>
          </Link>
        </div>
      </div>

      {/* Action Required Banner */}
      <Card style={{ marginBottom: "24px", padding: "16px 20px", backgroundColor: "var(--bg-card)", borderLeft: "4px solid var(--primary)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Action Required Summary
            </span>
            <div style={{ display: "flex", gap: "20px", marginTop: "6px", flexWrap: "wrap" }}>
              {data.actionRequiredItems.map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text-primary)" }}>
                  <AlertTriangle size={14} color="#f87171" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <Link to="/deals">
            <Button variant="secondary" size="sm" icon={ChevronRight}>
              Resolve Items
            </Button>
          </Link>
        </div>
      </Card>

      {/* Top Metric Cards */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>
        <MetricCard
          title="TOTAL PIPELINE VALUE"
          value={`$${(data.totalQuotationValue || 0).toLocaleString()}`}
          change="+14.2%"
          changeType="positive"
          subtitle="vs last month"
          icon={DollarSign}
          color="#38bdf8"
        />
        <MetricCard
          title="ACTIVE DEALS"
          value={data.totalDeals}
          subtitle={`Win Rate: ${data.conversionWinRate}`}
          icon={Briefcase}
          color="#a855f7"
        />
        <MetricCard
          title="BLENDED GROSS MARGIN"
          value={`${data.avgMarginPct}%`}
          change="+2.4%"
          changeType="positive"
          subtitle="Target: >40%"
          icon={Percent}
          color="#34d399"
        />
        <MetricCard
          title="PENDING APPROVALS"
          value={data.pendingApprovalsQueue.length}
          subtitle="Sales Mgr & Finance VP"
          icon={FileCheck}
          color="#fbbf24"
        />
      </div>

      {/* Section: Pending Approvals & At-Risk Deals */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>
        {/* Pending Approvals Queue Card */}
        <Card
          title="Pending Quotation Approvals"
          subtitle="Quotation exceptions requiring managerial or finance sign-off"
          action={
            <Link to="/approvals" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600" }}>
              View Center
            </Link>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            {data.pendingApprovalsQueue.map((appr) => (
              <div
                key={appr.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {appr.dealTitle}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "3px" }}>
                    Customer: <strong>{appr.customerName}</strong> • Value: <strong>${appr.amount.toLocaleString()}</strong> • Disc: <span style={{ color: "#f87171", fontWeight: "600" }}>{appr.requestedDiscount}%</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Required: <span style={{ color: "#fbbf24", fontWeight: "600" }}>{appr.requiredRole}</span> • Reason: {appr.categoryViolation}
                  </div>
                </div>

                <Link to={`/deals/${appr.dealId}`}>
                  <Button variant="secondary" size="sm" icon={Eye}>
                    Inspect
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>

        {/* At-Risk Deals Widget with EXPLICIT REASONS */}
        <Card
          title="At-Risk Deals & Exception Reasons"
          subtitle="Deals exceeding discount caps or suffering margin drops"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            {data.atRiskDealsWithReasons.map((deal) => (
              <div
                key={deal.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Link to={`/deals/${deal.id}`} style={{ fontSize: "13px", fontWeight: "700", color: "#f87171" }}>
                    {deal.title}
                  </Link>
                  <Badge status={deal.riskLevel} />
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Val: <strong>${deal.amount.toLocaleString()}</strong> | Margin: <strong style={{ color: deal.marginPct < 35 ? "#f87171" : "#34d399" }}>{deal.marginPct}%</strong> | Disc: {deal.discountPct}%
                </div>
                {/* Explicit Reasons List */}
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {deal.riskFactors.map((reason, rIdx) => (
                    <div key={rIdx} style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ color: "#f87171" }}>•</span> {reason}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Grid: Pipeline Chart & Stalled Deals */}
      <div className="grid-3" style={{ marginBottom: "24px", gridTemplateColumns: "2fr 1fr" }}>
        {/* Pipeline Chart */}
        <Card title="Deal Pipeline Value by Stage" subtitle="Distribution of quotation values across governance stages">
          <div style={{ height: "260px", marginTop: "16px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.pipelineByStage} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="stage" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", borderRadius: "8px" }}
                  formatter={(value) => [`$${value.toLocaleString()}`, "Pipeline Value"]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.pipelineByStage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={stageColors[entry.stage] || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Stalled Deals Widget */}
        <Card title="Stalled Deals (>7 Days)" subtitle="Deals with no stage progression or customer response">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            {data.stalledDeals.map((deal) => (
              <div
                key={deal.id}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.25)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#fbbf24" }}>{deal.customer.name}</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}>
                    Stalled {deal.daysInStage} days
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  {deal.title}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                  Next: {deal.nextAction}
                </div>
                <div style={{ marginTop: "8px", textAlign: "right" }}>
                  <Link to={`/deals/${deal.id}`}>
                    <Button variant="outline" size="sm">
                      Review Deal
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity & Recent Deals */}
      <Card
        title="Recent Deals & Quotation Pipeline"
        subtitle="Active deal pipeline ordered by latest update"
        action={
          <Link to="/deals">
            <Button variant="outline" size="sm" icon={ChevronRight}>
              Full Pipeline View
            </Button>
          </Link>
        }
      >
        <table className="custom-table">
          <thead>
            <tr>
              <th>Deal ID</th>
              <th>Deal Title</th>
              <th>Customer</th>
              <th>Rep</th>
              <th>Amount</th>
              <th>Discount</th>
              <th>Margin</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.recentDeals.map((deal) => (
              <tr key={deal.id}>
                <td style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>{deal.id}</td>
                <td>
                  <Link to={`/deals/${deal.id}`} style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                    {deal.title}
                  </Link>
                </td>
                <td style={{ color: "var(--text-secondary)" }}>{deal.customer.name}</td>
                <td style={{ color: "var(--text-muted)" }}>{deal.salesRep}</td>
                <td style={{ fontWeight: "700" }}>${deal.amount.toLocaleString()}</td>
                <td style={{ color: deal.discountPct > 20 ? "#f87171" : "inherit" }}>{deal.discountPct}%</td>
                <td style={{ color: deal.marginPct < 35 ? "#f87171" : "#34d399", fontWeight: "600" }}>
                  {deal.marginPct}%
                </td>
                <td>
                  <Badge status={deal.status} />
                </td>
                <td>
                  <Badge status={deal.riskLevel} />
                </td>
                <td>
                  <Link to={`/deals/${deal.id}`}>
                    <Button variant="secondary" size="sm">
                      Inspect
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};
