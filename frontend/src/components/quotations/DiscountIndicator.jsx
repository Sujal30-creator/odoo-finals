import React from "react";
import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

export const DiscountIndicator = ({ status, governanceMessage, effectiveDiscountPct, tierCap, approvalPreview }) => {
  let bg = "rgba(16, 185, 129, 0.12)";
  let text = "#34d399";
  let border = "rgba(16, 185, 129, 0.3)";
  let Icon = CheckCircle2;

  if (status === "EXCEEDS_LIMIT_WARNING") {
    bg = "rgba(245, 158, 11, 0.12)";
    text = "#fbbf24";
    border = "rgba(245, 158, 11, 0.3)";
    Icon = AlertTriangle;
  } else if (status === "EXCEEDS_LIMIT_CRITICAL") {
    bg = "rgba(239, 68, 68, 0.12)";
    text = "#f87171";
    border = "rgba(239, 68, 68, 0.3)";
    Icon = ShieldAlert;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        style={{
          padding: "12px 14px",
          borderRadius: "8px",
          backgroundColor: bg,
          border: `1px solid ${border}`,
          display: "flex",
          alignItems: "flex-start",
          gap: "10px"
        }}
      >
        <Icon size={18} style={{ color: text, flexShrink: 0, marginTop: "2px" }} />
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: text }}>
            {governanceMessage}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: "1.5" }}>
            Applied Discount: <strong style={{ color: "var(--text-primary)" }}>{effectiveDiscountPct}%</strong>&nbsp;•&nbsp;
            Customer Tier Limit: <strong style={{ color: "var(--text-primary)" }}>{tierCap}%</strong>&nbsp;•&nbsp;
            Required Approval: <strong style={{ color: text }}>{approvalPreview?.requiredRole || "None"}</strong>
          </div>
        </div>
      </div>

      {/* Show explicit reason if approval needed */}
      {approvalPreview?.requiredRole !== "AUTO_APPROVED" && approvalPreview?.reason && (
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", padding: "8px 12px", borderRadius: "6px", backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Reason: </strong>{approvalPreview.reason}
        </div>
      )}
    </div>
  );
};
