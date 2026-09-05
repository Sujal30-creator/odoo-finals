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
  FileCheck,
  TrendingDown,
  Zap,
  ArrowUpRight,
  GitMerge,
  HeartPulse,
  Lightbulb,
  RefreshCw,
  X
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

// ─── Deal Intelligence icon/color map ───────────────────────────────────────
const intelConfig = {
  margin_leakage: {
    icon: TrendingDown,
    color: "#f87171",
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.25)",
    label: "Margin Leakage"
  },
  upsell: {
    icon: ArrowUpRight,
    color: "#34d399",
    bg: "rgba(16, 185, 129, 0.08)",
    border: "rgba(16, 185, 129, 0.25)",
    label: "Upsell Opportunity"
  },
  cross_sell: {
    icon: GitMerge,
    color: "#60a5fa",
    bg: "rgba(96, 165, 250, 0.08)",
    border: "rgba(96, 165, 250, 0.25)",
    label: "Cross-sell Opportunity"
  },
  deal_health: {
    icon: HeartPulse,
    color: "#fbbf24",
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.25)",
    label: "Deal Health"
  },
  recommended_action: {
    icon: Lightbulb,
    color: "#a855f7",
    bg: "rgba(168, 85, 247, 0.08)",
    border: "rgba(168, 85, 247, 0.25)",
    label: "Recommended Action"
  }
};

// ─── Approval status badge helper ───────────────────────────────────────────
const QuoteStatusPill = ({ status }) => {
  const s = (status || "").toLowerCase();
  let bg = "rgba(148,163,184,0.15)";
  let color = "#94a3b8";
  if (s.includes("approved") || s.includes("won") || s.includes("auto")) {
    bg = "rgba(16,185,129,0.15)"; color = "#34d399";
  } else if (s.includes("pending") || s.includes("re-approval") || s.includes("draft")) {
    bg = "rgba(245,158,11,0.15)"; color = "#fbbf24";
  } else if (s.includes("critical") || s.includes("rejected")) {
    bg = "rgba(239,68,68,0.15)"; color = "#f87171";
  }
  return (
    <span style={{
      padding: "3px 9px", borderRadius: "20px", fontSize: "11px",
      fontWeight: "700", backgroundColor: bg, color
    }}>
      {status}
    </span>
  );
};

export const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Pipeline summary filter state — clicking a stage card filters the recent-deals table
  const [activePipelineStage, setActivePipelineStage] = useState(null);
  // Deal Intelligence expanded card
  const [expandedIntel, setExpandedIntel] = useState(null);
  // Dismissed intel cards
  const [dismissedIntel, setDismissedIntel] = useState([]);

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

  // Filter recent deals by the clicked pipeline stage
  const filteredRecentDeals = activePipelineStage
    ? data.recentDeals.filter((d) => {
        const stage = activePipelineStage.stage;
        if (stage === "Negotiation") return d.status === "In Negotiation";
        if (stage === "Fulfillment") return d.status === "Confirmed";
        if (stage === "Completed") return d.status === "Won";
        return d.status === stage;
      })
    : data.recentDeals;

  // Visible intel cards (not dismissed)
  const visibleIntel = (data.dealIntelligence || []).filter(
    (item) => !dismissedIntel.includes(item.id)
  );

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Operations Dashboard</h1>
          <p className="page-subtitle">
            Real-time deal pipeline, governance exceptions, pending approvals, and stalled deal alerts
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/deals">
            <Button variant="outline" icon={Briefcase}>View Pipeline</Button>
          </Link>
          <Link to="/quotations/new">
            <Button variant="primary" icon={Plus}>Create Quotation</Button>
          </Link>
        </div>
      </div>

      {/* ── Action Required Banner ───────────────────────────────────────── */}
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
            <Button variant="secondary" size="sm" icon={ChevronRight}>Resolve Items</Button>
          </Link>
        </div>
      </Card>

      {/* ── Top Metric Cards ─────────────────────────────────────────────── */}
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

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — PIPELINE SUMMARY (6-stage interactive cards)
      ══════════════════════════════════════════════════════════════════ */}
      <Card
        title="Pipeline Summary"
        subtitle="Click a stage to filter the recent deals table below"
        style={{ marginBottom: "24px" }}
        action={
          activePipelineStage ? (
            <button
              onClick={() => setActivePipelineStage(null)}
              style={{
                fontSize: "12px", color: "var(--primary)", fontWeight: "600",
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "4px"
              }}
            >
              <RefreshCw size={12} /> Clear filter
            </button>
          ) : null
        }
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "12px",
          marginTop: "8px"
        }}>
          {data.pipelineSummary.map((stage) => {
            const isActive = activePipelineStage?.stage === stage.stage;
            return (
              <button
                key={stage.stage}
                onClick={() => setActivePipelineStage(isActive ? null : stage)}
                style={{
                  padding: "14px 10px",
                  borderRadius: "10px",
                  border: isActive
                    ? `2px solid ${stage.color}`
                    : "1px solid var(--border-color)",
                  backgroundColor: isActive
                    ? `${stage.color}18`
                    : "var(--bg-input)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.15s ease",
                  outline: "none"
                }}
              >
                {/* Stage name */}
                <div style={{
                  fontSize: "11px", fontWeight: "700",
                  color: isActive ? stage.color : "var(--text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                  marginBottom: "6px"
                }}>
                  {stage.stage}
                </div>
                {/* Deal count */}
                <div style={{
                  fontSize: "24px", fontWeight: "800",
                  color: isActive ? stage.color : "var(--text-primary)"
                }}>
                  {stage.count}
                </div>
                {/* Pipeline value */}
                <div style={{
                  fontSize: "11px", color: "var(--text-muted)",
                  marginTop: "4px"
                }}>
                  ${(stage.value / 1000).toFixed(0)}k
                </div>
                {/* Active indicator */}
                {isActive && (
                  <div style={{
                    marginTop: "6px", fontSize: "10px",
                    color: stage.color, fontWeight: "600"
                  }}>
                    ● Filtered
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — PENDING APPROVALS & AT-RISK DEALS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>

        {/* ── Pending Approvals Queue ─────────────────────────────────── */}
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
                  border: "1px solid var(--border-color)"
                }}
              >
                {/* Row 1: title + badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {appr.dealTitle}
                  </div>
                  <Badge status={appr.status} />
                </div>

                {/* Row 2: meta */}
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Customer: <strong>{appr.customerName}</strong>
                  {" • "}Value: <strong>${appr.amount.toLocaleString()}</strong>
                  {" • "}Discount: <span style={{ color: "#f87171", fontWeight: "700" }}>{appr.requestedDiscount}%</span>
                </div>

                {/* Row 3: approval level + reason */}
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Required Approval:{" "}
                  <span style={{ color: "#fbbf24", fontWeight: "700" }}>{appr.requiredRole}</span>
                  {" • "}Reason: {appr.categoryViolation}
                </div>

                {/* Quick View button */}
                <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                  <Link to={`/deals/${appr.dealId}`}>
                    <Button variant="primary" size="sm" icon={Eye}>
                      Quick View
                    </Button>
                  </Link>
                  <Link to="/approvals">
                    <Button variant="outline" size="sm">
                      Approvals Center
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── At-Risk Deals ───────────────────────────────────────────── */}
        <Card
          title="At-Risk Deals"
          subtitle="Deals exceeding discount caps, with margin drops, or requiring immediate action"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            {data.atRiskDeals.map((deal) => (
              <div
                key={deal.id}
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.25)"
                }}
              >
                {/* Row 1: name + risk badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Link to={`/deals/${deal.id}`} style={{ fontSize: "13px", fontWeight: "700", color: "#f87171" }}>
                    {deal.title}
                  </Link>
                  <Badge status={deal.riskLevel} />
                </div>

                {/* Row 2: customer + financials */}
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Customer: <strong>{deal.customer}</strong>
                  {" • "}Value: <strong>${deal.amount.toLocaleString()}</strong>
                  {" • "}Margin:{" "}
                  <strong style={{ color: deal.marginPct < 35 ? "#f87171" : "#34d399" }}>
                    {deal.marginPct}%
                  </strong>
                  {" • "}Discount: {deal.discountPct}%
                </div>

                {/* Risk reasons */}
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {deal.riskFactors.map((reason, rIdx) => (
                    <div key={rIdx} style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", alignItems: "flex-start", gap: "4px" }}>
                      <span style={{ color: "#f87171", flexShrink: 0 }}>•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                {/* Recommended action */}
                <div style={{
                  marginTop: "8px",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  fontSize: "11px",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "6px"
                }}>
                  <Lightbulb size={13} style={{ flexShrink: 0, marginTop: "1px" }} />
                  <span><strong>Recommended:</strong> {deal.recommendedAction}</span>
                </div>

                {/* Actions */}
                <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                  <Link to={`/deals/${deal.id}`}>
                    <Button variant="secondary" size="sm" icon={Eye}>Inspect Deal</Button>
                  </Link>
                  <Link to={`/simulator/${deal.id}`}>
                    <Button variant="outline" size="sm">Run Simulator</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — PIPELINE CHART & STALLED DEALS
      ══════════════════════════════════════════════════════════════════ */}
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

        {/* Stalled Deals */}
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
                    <Button variant="outline" size="sm">Review Deal</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — DEAL INTELLIGENCE PANEL
      ══════════════════════════════════════════════════════════════════ */}
      {visibleIntel.length > 0 && (
        <Card
          title="Deal Intelligence"
          subtitle="Rule-based insights: margin leakage, upsell/cross-sell opportunities, deal health, and recommended actions"
          style={{ marginBottom: "24px" }}
          action={
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {visibleIntel.length} active insight{visibleIntel.length !== 1 ? "s" : ""}
            </span>
          }
        >
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "14px",
            marginTop: "8px"
          }}>
            {visibleIntel.map((item) => {
              const cfg = intelConfig[item.type] || intelConfig.recommended_action;
              const IconComp = cfg.icon;
              const isExpanded = expandedIntel === item.id;

              return (
                <div
                  key={item.id}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    backgroundColor: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    position: "relative",
                    transition: "all 0.15s ease"
                  }}
                >
                  {/* Dismiss button */}
                  <button
                    onClick={() => setDismissedIntel((prev) => [...prev, item.id])}
                    style={{
                      position: "absolute", top: "10px", right: "10px",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-muted)", padding: "2px",
                      lineHeight: 1
                    }}
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>

                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", paddingRight: "20px" }}>
                    <div style={{
                      padding: "7px",
                      borderRadius: "8px",
                      backgroundColor: `${cfg.color}20`,
                      color: cfg.color,
                      flexShrink: 0
                    }}>
                      <IconComp size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      {/* Type label */}
                      <div style={{ fontSize: "10px", fontWeight: "700", color: cfg.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {cfg.label}
                      </div>
                      {/* Title */}
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginTop: "2px" }}>
                        {item.title}
                      </div>
                      {/* Customer + deal */}
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {item.customer} — <Link to={`/deals/${item.dealId}`} style={{ color: cfg.color, fontWeight: "600" }}>
                          {item.dealTitle.length > 38 ? item.dealTitle.slice(0, 38) + "…" : item.dealTitle}
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Impact chip */}
                  <div style={{
                    display: "inline-block",
                    marginTop: "10px",
                    padding: "3px 9px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: "700",
                    backgroundColor: `${cfg.color}20`,
                    color: cfg.color
                  }}>
                    {item.impact}
                  </div>

                  {/* Expand/collapse detail */}
                  <button
                    onClick={() => setExpandedIntel(isExpanded ? null : item.id)}
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: cfg.color,
                      fontWeight: "600",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    {isExpanded ? "Hide detail ▲" : "Show detail ▼"}
                  </button>

                  {isExpanded && (
                    <div style={{ marginTop: "10px" }}>
                      {/* Detail text */}
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                        {item.detail}
                      </p>
                      {/* Recommended action */}
                      <div style={{
                        marginTop: "10px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        backgroundColor: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.2)",
                        fontSize: "11px",
                        color: "var(--primary)"
                      }}>
                        <strong>Recommended:</strong> {item.recommendedAction}
                      </div>
                      {/* Quick action link */}
                      <div style={{ marginTop: "10px" }}>
                        <Link to={`/deals/${item.dealId}`}>
                          <Button variant="primary" size="sm" icon={ArrowRight}>
                            Go to Deal
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5 — RECENT QUOTATIONS TABLE
      ══════════════════════════════════════════════════════════════════ */}
      <Card
        title="Recent Quotations"
        subtitle="Latest quotations across all deals — approval status, margin, and discount at a glance"
        style={{ marginBottom: "24px" }}
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
              <th>Quote ID</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Discount</th>
              <th>Margin %</th>
              <th>Approval Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.recentQuotations.map((q) => (
              <tr key={q.id}>
                <td style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "700" }}>{q.id}</td>
                <td style={{ fontWeight: "600", color: "var(--text-primary)" }}>{q.customer}</td>
                <td style={{ fontWeight: "800" }}>${q.total.toLocaleString()}</td>
                <td style={{ color: q.discountPct > 20 ? "#f87171" : "inherit", fontWeight: "600" }}>
                  {q.discountPct}%
                </td>
                <td style={{ color: q.marginPct < 35 ? "#f87171" : "#34d399", fontWeight: "700" }}>
                  {q.marginPct}%
                </td>
                <td>
                  <QuoteStatusPill status={q.approvalStatus} />
                </td>
                <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{q.createdDate}</td>
                <td>
                  <Link to={`/deals/${q.dealId}`}>
                    <Button variant="secondary" size="sm" icon={Eye}>
                      Quick View
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 6 — RECENT DEALS TABLE (filtered by pipeline stage click)
      ══════════════════════════════════════════════════════════════════ */}
      <Card
        title={
          activePipelineStage
            ? `Deals in Stage: ${activePipelineStage.stage}`
            : "Recent Deals & Quotation Pipeline"
        }
        subtitle="Active deal pipeline ordered by latest update"
        action={
          <Link to="/deals">
            <Button variant="outline" size="sm" icon={ChevronRight}>
              Full Pipeline View
            </Button>
          </Link>
        }
      >
        {filteredRecentDeals.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            No deals in the <strong>{activePipelineStage?.stage}</strong> stage.
          </div>
        ) : (
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
              {filteredRecentDeals.map((deal) => (
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
                  <td><Badge status={deal.status} /></td>
                  <td><Badge status={deal.riskLevel} /></td>
                  <td>
                    <Link to={`/deals/${deal.id}`}>
                      <Button variant="secondary" size="sm">Inspect</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 7 — MY WORK
          "What do I need to do today?"
      ══════════════════════════════════════════════════════════════════ */}
      <Card
        title="My Work"
        subtitle="Your current workload at a glance — what needs attention today"
        style={{ marginBottom: "24px", marginTop: "24px" }}
        action={
          <Link to="/quotations" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600" }}>
            All Quotations →
          </Link>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "8px" }}>
          {[
            {
              label: "Draft Quotations",
              count: data.myWork?.draftQuotations?.count ?? 0,
              color: "#94a3b8",
              bg: "rgba(148,163,184,0.1)",
              border: "rgba(148,163,184,0.25)",
              link: "/quotations?status=Draft",
              hint: "Unsaved or in-progress quotes"
            },
            {
              label: "Pending Approvals",
              count: data.myWork?.pendingApprovals?.count ?? 0,
              color: "#fbbf24",
              bg: "rgba(245,158,11,0.1)",
              border: "rgba(245,158,11,0.25)",
              link: "/quotations?status=Pending+Approval",
              hint: "Submitted, awaiting manager/finance"
            },
            {
              label: "Approved Quotes",
              count: data.myWork?.approvedQuotes?.count ?? 0,
              color: "#34d399",
              bg: "rgba(16,185,129,0.1)",
              border: "rgba(16,185,129,0.25)",
              link: "/quotations?status=Approved",
              hint: "Ready to confirm with customer"
            },
            {
              label: "Changes Requested",
              count: data.myWork?.changesRequested?.count ?? 0,
              color: "#fb923c",
              bg: "rgba(251,146,60,0.1)",
              border: "rgba(251,146,60,0.25)",
              link: "/quotations?status=Changes+Requested",
              hint: "Manager returned for revision"
            },
            {
              label: "At-Risk Deals",
              count: data.myWork?.atRiskDeals?.count ?? 0,
              color: "#f87171",
              bg: "rgba(239,68,68,0.1)",
              border: "rgba(239,68,68,0.25)",
              link: "/deals",
              hint: "Deals with margin or discount issues"
            },
            {
              label: "Deals Closing Soon",
              count: data.myWork?.closingSoon?.count ?? 0,
              color: "#a855f7",
              bg: "rgba(168,85,247,0.1)",
              border: "rgba(168,85,247,0.25)",
              link: "/deals",
              hint: "Approved deals approaching close date"
            }
          ].map(({ label, count, color, bg, border, link, hint }) => (
            <Link key={label} to={link} style={{ textDecoration: "none" }}>
              <div style={{
                padding: "16px 14px", borderRadius: "10px",
                backgroundColor: bg, border: `1px solid ${border}`,
                transition: "all 0.15s ease", cursor: "pointer"
              }}>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
                  {label}
                </div>
                <div style={{ fontSize: "32px", fontWeight: "900", color, lineHeight: 1 }}>
                  {count}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px" }}>
                  {hint}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 8 — ACTION REQUIRED
          Individual items each rep needs to act on
      ══════════════════════════════════════════════════════════════════ */}
      {data.actionRequired && data.actionRequired.length > 0 && (
        <Card
          title="Action Required"
          subtitle="Items that need your attention — each has a direct action"
          style={{ marginBottom: "24px" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
            {data.actionRequired.map((item) => {
              // Severity → visual treatment
              const sevMap = {
                danger:  { icon: "🔴", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.22)",   color: "#f87171"  },
                warning: { icon: "🟡", bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.22)",  color: "#fbbf24"  },
                success: { icon: "🟢", bg: "rgba(16,185,129,0.07)",  border: "rgba(16,185,129,0.22)",  color: "#34d399"  },
                info:    { icon: "🔵", bg: "rgba(96,165,250,0.07)",  border: "rgba(96,165,250,0.22)",  color: "#60a5fa"  }
              };
              const sev = sevMap[item.severity] || sevMap.info;

              return (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 16px", borderRadius: "8px",
                    backgroundColor: sev.bg, border: `1px solid ${sev.border}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flex: 1 }}>
                    <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>{sev.icon}</span>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: sev.color }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {item.detail}
                      </div>
                    </div>
                  </div>
                  <Link to={item.actionPath} style={{ flexShrink: 0 }}>
                    <Button variant="secondary" size="sm" icon={Eye}>
                      {item.actionLabel}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
