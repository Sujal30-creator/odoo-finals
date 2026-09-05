import React from "react";
import { Save, Send, ShieldCheck } from "lucide-react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { DiscountIndicator } from "./DiscountIndicator";

export const QuotationSummary = ({ totals, onSaveDraft, onSubmitApproval }) => {
  const {
    totalListPrice,
    totalDiscountAmount,
    totalNetPrice,
    totalTaxAmount,
    finalTotal,
    blendedMarginPct,
    effectiveDiscountPct,
    tierCap,
    commercialHealth,
    healthLabel,
    governanceStatus,
    governanceMessage,
    approvalPreview
  } = totals;

  // Health indicator colors
  const healthColors = {
    HEALTHY:    { bg: "rgba(16, 185, 129, 0.12)", text: "#34d399",  border: "rgba(16, 185, 129, 0.3)" },
    ATTENTION:  { bg: "rgba(245, 158, 11, 0.12)", text: "#fbbf24",  border: "rgba(245, 158, 11, 0.3)" },
    HIGH_RISK:  { bg: "rgba(239, 68, 68, 0.12)",  text: "#f87171",  border: "rgba(239, 68, 68, 0.3)"  }
  };
  const hc = healthColors[commercialHealth] || healthColors.HEALTHY;

  // Approval row colors
  const approvalColor =
    approvalPreview?.riskLevel === "High"   ? "#f87171" :
    approvalPreview?.riskLevel === "Medium" ? "#fbbf24" : "#34d399";

  return (
    <Card title="Live Quotation Summary" subtitle="Calculated dynamically from active line items and discount settings">
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Financial Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "9px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>List Price (Subtotal)</span>
            <span style={{ fontWeight: "600" }}>${totalListPrice.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              Total Discount ({effectiveDiscountPct}%)
            </span>
            <span style={{ fontWeight: "600", color: totalDiscountAmount > 0 ? "#f87171" : "inherit" }}>
              -${totalDiscountAmount.toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Net Price</span>
            <span style={{ fontWeight: "600" }}>${totalNetPrice.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>Tax (18% est.)</span>
            <span style={{ fontWeight: "600" }}>+${totalTaxAmount.toLocaleString()}</span>
          </div>
          <div style={{ borderBottom: "1px solid var(--border-color)", margin: "2px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "800" }}>
            <span>Final Total</span>
            <span style={{ color: "#38bdf8" }}>${finalTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Commercial Health Indicator */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "8px",
            backgroundColor: hc.bg,
            border: `1px solid ${hc.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: hc.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Commercial Health
            </div>
            <div style={{ fontSize: "13px", fontWeight: "800", color: hc.text, marginTop: "2px" }}>
              {healthLabel}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "22px", fontWeight: "800", color: hc.text }}>
              {blendedMarginPct}%
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Gross Margin</div>
          </div>
        </div>

        {/* Governance Indicator */}
        <DiscountIndicator
          status={governanceStatus}
          governanceMessage={governanceMessage}
          effectiveDiscountPct={effectiveDiscountPct}
          tierCap={tierCap}
          approvalPreview={approvalPreview}
        />

        {/* Approval Preview Section */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "8px",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-color)"
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
            Approval Preview (Before Submitting)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Required Approval</span>
              <div style={{ fontWeight: "700", color: approvalColor, marginTop: "2px" }}>
                {approvalPreview?.requiredRole || "None"}
              </div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Risk Level</span>
              <div style={{ fontWeight: "700", color: approvalColor, marginTop: "2px" }}>
                {approvalPreview?.riskLevel || "Low"}
              </div>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <span style={{ color: "var(--text-muted)" }}>Reason</span>
              <div style={{ fontWeight: "600", color: "var(--text-secondary)", marginTop: "2px", lineHeight: "1.4" }}>
                {approvalPreview?.reason || "All policy thresholds met."}
              </div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Expected Margin</span>
              <div style={{ fontWeight: "700", color: blendedMarginPct < 35 ? "#f87171" : "#34d399", marginTop: "2px" }}>
                {approvalPreview?.expectedMargin || `${blendedMarginPct}%`}
              </div>
            </div>
          </div>
        </div>

        {/* Approval Routing */}
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldCheck size={16} color="var(--primary)" />
          <span>
            Routing to: <strong style={{ color: "var(--text-primary)" }}>{approvalPreview?.requiredRole || "Auto-Approved"}</strong>
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          <Button variant="secondary" icon={Save} onClick={onSaveDraft} style={{ flex: 1 }}>
            Save Draft
          </Button>
          <Button variant="primary" icon={Send} onClick={onSubmitApproval} style={{ flex: 1 }}>
            Submit for Approval
          </Button>
        </div>
      </div>
    </Card>
  );
};
