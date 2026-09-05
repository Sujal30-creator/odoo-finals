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
  UserCheck,
  Building2,
  Mail,
  Phone,
  CreditCard,
  Tag,
  Hash,
  Calendar,
  Flag,
  ShieldCheck,
  Plus
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
          <Link to={`/quotations/new?dealId=${deal.id}${deal.quoteId ? `&quoteId=${deal.quoteId}` : ""}`}>
            <Button variant="primary" icon={Send} size="sm">
              {deal.quoteId ? "Open Quotation" : "Create Quotation"}
            </Button>
          </Link>
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

      {/* Customer Information Card */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>
        <Card title="Customer Information" subtitle="Account details, tier classification, and contact">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
            {[
              { icon: Building2, label: "Company", value: customer.name },
              { icon: Tag,       label: "Industry", value: customer.industry },
              { icon: CreditCard, label: "Tier",   value: customer.tier },
              { icon: Percent,   label: "Tier Discount Cap", value: `${customer.tierDiscountCap}%` },
              { icon: UserCheck, label: "Contact", value: customer.contactName },
              { icon: Mail,      label: "Email",   value: customer.contactEmail },
              { icon: Phone,     label: "Phone",   value: customer.phone },
              { icon: TrendingUp, label: "Lifetime Value", value: customer.lifetimeValue }
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-color)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                  <Icon size={13} color="var(--primary)" />
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {label}
                  </span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                  {value || "—"}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Approval Status & Risk Score summary card */}
        <Card title="Approval Status & Risk Score" subtitle="Current approval stage and composite deal risk evaluation">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
            {/* Approval status */}
            <div style={{
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-color)"
            }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                Approval Status
              </div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>
                {deal.approvalStatus}
              </div>
              <div style={{ marginTop: "6px" }}>
                <Badge status={deal.status} />
              </div>
            </div>

            {/* Risk score gauge */}
            <div style={{
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: deal.riskScore >= 70
                ? "rgba(239,68,68,0.08)"
                : deal.riskScore >= 40
                  ? "rgba(245,158,11,0.08)"
                  : "rgba(16,185,129,0.08)",
              border: `1px solid ${deal.riskScore >= 70 ? "rgba(239,68,68,0.3)" : deal.riskScore >= 40 ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`
            }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
                Risk Score
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  fontSize: "32px", fontWeight: "900",
                  color: deal.riskScore >= 70 ? "#f87171" : deal.riskScore >= 40 ? "#fbbf24" : "#34d399"
                }}>
                  {deal.riskScore}
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-muted)" }}>/100</span>
                </div>
                <div>
                  <Badge status={deal.riskLevel} />
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    {deal.riskScore >= 70 ? "Requires Finance VP sign-off"
                      : deal.riskScore >= 40 ? "Requires Sales Manager review"
                      : "Within standard policy limits"}
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div style={{ marginTop: "10px", height: "6px", borderRadius: "3px", backgroundColor: "var(--border-color)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${deal.riskScore}%`,
                  borderRadius: "3px",
                  backgroundColor: deal.riskScore >= 70 ? "#f87171" : deal.riskScore >= 40 ? "#fbbf24" : "#34d399",
                  transition: "width 0.4s ease"
                }} />
              </div>
            </div>

            {/* Win probability */}
            <div style={{
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-color)"
            }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                Win Probability
              </div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--primary)" }}>
                {deal.winProbability}%
              </div>
              <div style={{ marginTop: "6px", height: "6px", borderRadius: "3px", backgroundColor: "var(--border-color)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${deal.winProbability}%`,
                  borderRadius: "3px",
                  backgroundColor: "var(--primary)",
                  transition: "width 0.4s ease"
                }} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 4 Overview Metrics Cards */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>

        {/* Deal Information Panel */}
        <Card title="Deal Information" subtitle="Core deal attributes and ownership" style={{ gridColumn: "1 / -1", marginBottom: "0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginTop: "8px" }}>
            {[
              { icon: Hash,      label: "Deal ID",          value: deal.id },
              { icon: Flag,      label: "Stage",            value: deal.status },
              { icon: UserCheck, label: "Owner",            value: deal.salesRep },
              { icon: Tag,       label: "Priority",         value: deal.priority || "Medium" },
              { icon: Calendar,  label: "Created",          value: deal.createdAt },
              { icon: Calendar,  label: "Expected Close",   value: deal.closeDate },
              { icon: DollarSign,label: "Deal Value",       value: `$${deal.amount.toLocaleString()}` },
              { icon: Percent,   label: "Win Probability",  value: `${deal.winProbability}%` }
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ padding: "10px 12px", borderRadius: "8px", backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                  <Icon size={12} color="var(--primary)" />
                  <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
                </div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{value || "—"}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Financials + Governance panels */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>

        {/* Financials */}
        <Card title="Financials" subtitle="Deal pricing breakdown including tax and margin">
          <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginTop: "12px", fontSize: "13px" }}>
            {[
              { label: "List Price (Subtotal)",      value: `$${(quotation?.totalListPrice || deal.amount * 1.2).toLocaleString()}`,  muted: true },
              { label: `Discount (${deal.discountPct}%)`, value: `-$${Math.round((quotation?.totalListPrice || deal.amount * 1.2) * deal.discountPct / 100).toLocaleString()}`, color: "#f87171" },
              { label: "Net Price",                  value: `$${deal.amount.toLocaleString()}` },
              { label: "Tax (18% est.)",             value: `+$${Math.round(deal.amount * 0.18).toLocaleString()}`, muted: true },
              { label: "Final Total",                value: `$${Math.round(deal.amount * 1.18).toLocaleString()}`, bold: true, color: "#38bdf8" },
              { label: "Blended Margin",             value: `${deal.marginPct}%`, color: deal.marginPct < 35 ? "#f87171" : "#34d399", bold: true }
            ].map(({ label, value, muted, color, bold }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ color: muted ? "var(--text-muted)" : "var(--text-secondary)" }}>{label}</span>
                <span style={{ fontWeight: bold ? "800" : "600", color: color || "var(--text-primary)" }}>{value}</span>
              </div>
            ))}
          </div>
          {deal.quoteId && (
            <div style={{ marginTop: "12px" }}>
              <Link to={`/quotations/new?quoteId=${deal.quoteId}&dealId=${deal.id}`}>
                <Button variant="secondary" size="sm" icon={FileEdit} style={{ width: "100%" }}>
                  Open in Quotation Builder
                </Button>
              </Link>
            </div>
          )}
          {!deal.quoteId && (
            <div style={{ marginTop: "12px" }}>
              <Link to={`/quotations/new?dealId=${deal.id}`}>
                <Button variant="primary" size="sm" icon={Plus} style={{ width: "100%" }}>
                  Create Quotation
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Governance */}
        <Card title="Discount Governance" subtitle="Applied discount vs allowed limit, approval routing, and risk level">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            {/* Allowed / Applied / Difference */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { label: "Allowed",    value: `${customer.tierDiscountCap}%`, color: "#34d399" },
                { label: "Applied",    value: `${deal.discountPct}%`,         color: deal.discountPct > customer.tierDiscountCap ? "#f87171" : "#34d399" },
                { label: "Difference", value: deal.discountPct > customer.tierDiscountCap ? `+${deal.discountPct - customer.tierDiscountCap}%` : "0%", color: deal.discountPct > customer.tierDiscountCap ? "#f87171" : "#34d399" }
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)", textAlign: "center" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color, marginTop: "4px" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Discount status */}
            <div style={{
              padding: "10px 12px", borderRadius: "8px",
              backgroundColor: deal.discountPct > customer.tierDiscountCap ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
              border: `1px solid ${deal.discountPct > customer.tierDiscountCap ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`,
              fontSize: "12px",
              color: deal.discountPct > customer.tierDiscountCap ? "#fbbf24" : "#34d399",
              fontWeight: "700"
            }}>
              {deal.discountPct > customer.tierDiscountCap
                ? `🟡 Discount exceeds ${customer.tier.split(" ")[0]} tier limit by ${deal.discountPct - customer.tierDiscountCap}%`
                : "🟢 Discount is within customer tier limits"}
            </div>

            {/* Required approval */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Required Approval</span>
                <span style={{ fontWeight: "700", color: deal.riskLevel === "High" || deal.riskLevel === "Critical" ? "#f87171" : "#fbbf24" }}>
                  {deal.approvalStatus?.includes("Finance") ? "Finance VP" : deal.approvalStatus?.includes("Manager") ? "Sales Manager" : "Auto-Approved"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Risk Level</span>
                <span style={{ fontWeight: "700" }}><Badge status={deal.riskLevel} /></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Current Status</span>
                <span style={{ fontWeight: "700" }}><Badge status={deal.status} /></span>
              </div>
            </div>

            {/* Governance explanation */}
            {deal.riskFactors?.length > 0 && (
              <div style={{
                padding: "10px 12px", borderRadius: "8px",
                backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                fontSize: "11px", color: "var(--text-secondary)"
              }}>
                <div style={{ fontWeight: "700", color: "#f87171", marginBottom: "4px" }}>Why approval is required:</div>
                {deal.riskFactors.slice(0, 2).map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: "4px", marginTop: "3px" }}>
                    <span style={{ color: "#f87171" }}>•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

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
        <Card title="Quotation Line Items" subtitle="Product, SKU, pricing, discount limits, net price, and per-line margin">
          {quotation?.lines ? (
            <table className="custom-table" style={{ marginTop: "12px" }}>
              <thead>
                <tr>
                  <th>Product / SKU</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>List Price</th>
                  <th>Disc %</th>
                  <th>Disc Limit</th>
                  <th>Net Price</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {quotation.lines.map((line, idx) => {
                  const exceedsLimit = line.discountPct > line.product.discountCap;
                  return (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: "600" }}>{line.product.name}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{line.product.sku}</div>
                      </td>
                      <td style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{line.product.category}</td>
                      <td style={{ fontWeight: "600" }}>{line.qty}</td>
                      <td style={{ color: "var(--text-muted)" }}>${line.listPrice.toLocaleString()}</td>
                      <td>
                        <span style={{
                          fontWeight: "700",
                          color: exceedsLimit ? "#f87171" : "inherit",
                          display: "flex", alignItems: "center", gap: "4px"
                        }}>
                          {exceedsLimit && <AlertTriangle size={12} color="#f87171" />}
                          {line.discountPct}%
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: "2px 7px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "700",
                          backgroundColor: exceedsLimit ? "rgba(239,68,68,0.12)" : "var(--bg-input)",
                          color: exceedsLimit ? "#f87171" : "var(--text-secondary)",
                          border: `1px solid ${exceedsLimit ? "rgba(239,68,68,0.3)" : "var(--border-color)"}`
                        }}>
                          {line.product.discountCap}% max
                        </span>
                      </td>
                      <td style={{ fontWeight: "700" }}>${line.netPrice.toLocaleString()}</td>
                      <td style={{ color: line.marginPct < 30 ? "#f87171" : "#34d399", fontWeight: "600" }}>
                        {line.marginPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border-color)" }}>
                  <td colSpan={3} style={{ fontWeight: "700", color: "var(--text-primary)", paddingTop: "10px" }}>
                    Totals
                  </td>
                  <td style={{ fontWeight: "700", color: "var(--text-muted)", paddingTop: "10px" }}>
                    ${(quotation.totalListPrice || 0).toLocaleString()}
                  </td>
                  <td colSpan={2} style={{ fontWeight: "700", color: "#fbbf24", paddingTop: "10px" }}>
                    Blended {deal.discountPct}%
                  </td>
                  <td style={{ fontWeight: "800", color: "var(--text-primary)", paddingTop: "10px" }}>
                    ${(quotation.netTotal || deal.amount).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: "800", paddingTop: "10px", color: deal.marginPct < 35 ? "#f87171" : "#34d399" }}>
                    {deal.marginPct}%
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div style={{ padding: "20px", color: "var(--text-muted)" }}>No line details available.</div>
          )}
        </Card>

        {/* Activity Timeline */}
        <Card title="Deal Activity Timeline" subtitle="Complete audit log: deal creation, quote events, discount changes, approvals">
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            {activities && activities.length > 0 ? (
              [...activities].reverse().map((act) => {
                const typeColors = {
                  deal_created: "#818cf8", customer_selected: "#60a5fa",
                  quote_created: "#34d399", quote_saved: "#34d399", quote_updated: "#34d399",
                  discount_changed: "#fbbf24", submitted: "#a855f7",
                  approved: "#34d399", rejected: "#f87171",
                  changes_requested: "#fb923c", negotiation: "#fb923c",
                  risk: "#f87171", approval: "#fbbf24"
                };
                const dotColor = typeColors[act.type] || "var(--primary)";
                return (
                  <div key={act.id} style={{ display: "flex", gap: "10px", padding: "10px", borderRadius: "8px", backgroundColor: "var(--bg-input)" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0, marginTop: "5px" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{act.title}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{act.description}</div>
                      {act.quoteId && (
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                          Quote: {act.quoteId}
                        </div>
                      )}
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px" }}>{act.timestamp}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Initial draft created on {deal.createdAt} by {deal.salesRep}.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
