import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  FileEdit,
  Sliders,
  MessageSquare,
  Send,
  ShieldAlert,
  Clock,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { apiService } from "../services/api";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";

export const DealDetailsPage = () => {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getDealById(id).then((res) => {
      setDeal(res);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        Loading Deal Workspace...
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        Deal not found.
      </div>
    );
  }

  const { customer, quotation, approval, activities, riskFactors, approvalChain } = deal;

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div style={{ marginBottom: "16px" }}>
        <Link to="/deals" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <ArrowLeft size={14} /> Back to Deals Pipeline
        </Link>
      </div>

      {/* Main Workspace Header */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "700", padding: "2px 8px", borderRadius: "4px", backgroundColor: "var(--bg-card-hover)", color: "var(--text-muted)" }}>
              ID: {deal.id}
            </span>
            <h1 className="page-title" style={{ fontSize: "22px" }}>{deal.title}</h1>
            <Badge status={deal.status} />
            <Badge status={deal.riskLevel} />
          </div>
          <p className="page-subtitle">
            Account: <strong style={{ color: "var(--text-primary)" }}>{customer.name}</strong> ({customer.tier}) • Owner: <strong>{deal.salesRep}</strong> • Target Close: <strong>{deal.closeDate}</strong> (Win Prob: {deal.winProbability}%)
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link to={`/simulator/${deal.id}`}>
            <Button variant="outline" icon={Sliders} size="sm">
              Simulator
            </Button>
          </Link>
          <Link to={`/negotiation/${deal.id}`}>
            <Button variant="outline" icon={MessageSquare} size="sm">
              Customer Portal
            </Button>
          </Link>
          <Link to="/quotations/new">
            <Button variant="secondary" icon={FileEdit} size="sm">
              Edit Quote
            </Button>
          </Link>
          <Button variant="primary" icon={Send} size="sm">
            Submit Approval
          </Button>
        </div>
      </div>

      {/* Recommended Next Action Banner */}
      <Card style={{ marginBottom: "24px", padding: "16px 20px", backgroundColor: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "var(--primary-glow)", color: "var(--primary)" }}>
            <Lightbulb size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              RECOMMENDED NEXT ACTION
            </span>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)", marginTop: "2px" }}>
              {deal.nextAction}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <Link to={`/simulator/${deal.id}`}>
                <Button variant="primary" size="sm" icon={Sliders}>
                  Run What-if Simulation
                </Button>
              </Link>
              <Link to="/quotations/new">
                <Button variant="secondary" size="sm">
                  Adjust Discount Level
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Overview Metrics Cards */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>
        <Card>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>TOTAL CONTRACT VALUE</span>
          <div style={{ fontSize: "22px", fontWeight: "800", marginTop: "4px", color: "#38bdf8" }}>
            ${deal.amount.toLocaleString()}
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            List Price: ${(quotation?.totalListPrice || deal.amount * 1.2).toLocaleString()}
          </span>
        </Card>

        <Card>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>APPLIED DISCOUNT</span>
          <div style={{ fontSize: "22px", fontWeight: "800", marginTop: "4px", color: deal.discountPct > customer.tierDiscountCap ? "#f87171" : "#fbbf24" }}>
            {deal.discountPct}%
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Customer Tier Limit: {customer.tierDiscountCap}%
          </span>
        </Card>

        <Card>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>COMMERCIAL GROSS MARGIN</span>
          <div style={{ fontSize: "22px", fontWeight: "800", marginTop: "4px", color: deal.marginPct < 35 ? "#f87171" : "#34d399" }}>
            {deal.marginPct}%
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Target: &gt;40% (Min threshold 35%)
          </span>
        </Card>

        <Card>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>DAYS STALLED IN STAGE</span>
          <div style={{ fontSize: "22px", fontWeight: "800", marginTop: "4px", color: deal.daysInStage > 7 ? "#fbbf24" : "var(--text-primary)" }}>
            {deal.daysInStage} Days
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Stage: {deal.status}
          </span>
        </Card>
      </div>

      {/* Grid: Commercial Health & Risk Factor Breakdown */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>
        {/* Commercial Health & Policy Audit */}
        <Card title="Commercial Health & Governance Policy" subtitle="Evaluation against customer tier and category discount thresholds">
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
            <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Gross Margin Status</span>
                <span style={{ fontWeight: "700", color: deal.marginPct < 35 ? "#f87171" : "#34d399" }}>
                  {deal.marginPct}% {deal.marginPct < 35 ? "🔴 (Needs Attention)" : "🟢 (On Track)"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginTop: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Customer Tier Limit ({customer.tier.split(" ")[0]})</span>
                <span style={{ fontWeight: "700" }}>{customer.tierDiscountCap}% Max</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginTop: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Category Discount Limits</span>
                <span style={{ fontWeight: "700" }}>Hardware 15% • Software 25% • Services 10%</span>
              </div>
            </div>

            {/* Billing Breakdown */}
            <div style={{ padding: "12px", borderRadius: "8px", backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600" }}>BILLING SCHEDULE STRUCTURE</span>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginTop: "4px" }}>
                {quotation?.billingType || "Hybrid (One-time Hardware + Annual Subscription)"}
              </div>
            </div>
          </div>
        </Card>

        {/* Explicit Deal Risk Factors Card */}
        <Card title={`Deal Risk Analysis (${deal.riskScore} / 100)`} subtitle="Explicit factors contributing to deal risk score">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            {riskFactors && riskFactors.length > 0 ? (
              riskFactors.map((factor, fIdx) => (
                <div
                  key={fIdx}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "12px",
                    color: "var(--text-primary)"
                  }}
                >
                  <AlertTriangle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>{factor}</span>
                </div>
              ))
            ) : (
              <div style={{ padding: "16px", borderRadius: "8px", backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", color: "#34d399", fontSize: "13px", fontWeight: "600" }}>
                🟢 No risk factors detected. Deal is healthy and within standard policy bounds.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Approval Routing Chain Visualizer */}
      <Card title="Approval Governance Routing Chain" subtitle="Multi-level approval state and sign-off progression" style={{ marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${approvalChain?.length || 4}, 1fr)`, gap: "16px", marginTop: "16px" }}>
          {approvalChain && approvalChain.map((step, sIdx) => {
            const isCompleted = step.status === "COMPLETED" || step.status === "AUTO_APPROVED";
            const isPending = step.status === "PENDING" || step.status === "DRAFT";
            const isSkipped = step.status === "SKIPPED" || step.status === "NOT_REQUIRED";

            let stepColor = "#34d399";
            let stepBg = "rgba(16, 185, 129, 0.1)";
            let stepBorder = "rgba(16, 185, 129, 0.3)";

            if (isPending) {
              stepColor = "#fbbf24";
              stepBg = "rgba(245, 158, 11, 0.1)";
              stepBorder = "rgba(245, 158, 11, 0.3)";
            } else if (isSkipped) {
              stepColor = "var(--text-muted)";
              stepBg = "var(--bg-input)";
              stepBorder = "var(--border-color)";
            }

            return (
              <div
                key={sIdx}
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  backgroundColor: stepBg,
                  border: `1px solid ${stepBorder}`,
                  position: "relative"
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: "700", color: stepColor, textTransform: "uppercase" }}>
                  Step {sIdx + 1}: {step.status}
                </div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginTop: "4px" }}>
                  {step.step}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {step.role}
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "6px" }}>
                  {step.date}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Main Grid: Line Items & Activity Timeline */}
      <div className="grid-3" style={{ marginBottom: "24px", gridTemplateColumns: "2fr 1fr" }}>
        {/* Line Items Table */}
        <Card title="Quotation Line Items (v2)" subtitle="Product, SKU, pricing, and discount details">
          {quotation?.lines ? (
            <table className="custom-table" style={{ marginTop: "12px" }}>
              <thead>
                <tr>
                  <th>Product / SKU</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>List Price</th>
                  <th>Disc %</th>
                  <th>Net Price</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {quotation.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: "600" }}>{line.product.name}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{line.product.sku}</div>
                    </td>
                    <td style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{line.product.category}</td>
                    <td style={{ fontWeight: "600" }}>{line.qty}</td>
                    <td style={{ color: "var(--text-muted)" }}>${line.listPrice.toLocaleString()}</td>
                    <td style={{ color: line.discountPct > line.product.discountCap ? "#f87171" : "inherit" }}>
                      {line.discountPct}%
                    </td>
                    <td style={{ fontWeight: "700" }}>${line.netPrice.toLocaleString()}</td>
                    <td style={{ color: line.marginPct < 30 ? "#f87171" : "#34d399", fontWeight: "600" }}>
                      {line.marginPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "20px", color: "var(--text-muted)" }}>No line details available.</div>
          )}
        </Card>

        {/* Activity Timeline */}
        <Card title="Deal Activity Timeline" subtitle="Audit log of discount modifications, submissions, and approvals">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            {activities && activities.length > 0 ? (
              activities.map((act) => (
                <div key={act.id} style={{ display: "flex", gap: "10px", padding: "10px", borderRadius: "8px", backgroundColor: "var(--bg-input)" }}>
                  <div style={{ padding: "6px", borderRadius: "50%", backgroundColor: "var(--primary-glow)", color: "var(--primary)", height: "fit-content" }}>
                    <Clock size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{act.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{act.description}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{act.timestamp}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Initial draft created on {deal.createdAt} by {deal.salesRep}.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
