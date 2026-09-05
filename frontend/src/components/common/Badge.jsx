import React from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, FileEdit, Award, XCircle } from "lucide-react";

export const Badge = ({ status, type = "status" }) => {
  let bg = "var(--status-info-bg)";
  let color = "var(--status-info-text)";
  let border = "var(--status-info-border)";
  let Icon = Clock;

  const s = String(status).toLowerCase();

  if (s.includes("low") || s.includes("approved") || s.includes("won") || s.includes("confirmed")) {
    bg = "var(--status-success-bg)";
    color = "var(--status-success-text)";
    border = "var(--status-success-border)";
    Icon = CheckCircle2;
  } else if (s.includes("medium") || s.includes("pending") || s.includes("negotiation") || s.includes("draft")) {
    bg = "var(--status-warning-bg)";
    color = "var(--status-warning-text)";
    border = "var(--status-warning-border)";
    Icon = s.includes("draft") ? FileEdit : Clock;
  } else if (s.includes("high") || s.includes("critical") || s.includes("stalled") || s.includes("rejected") || s.includes("lost")) {
    bg = "var(--status-danger-bg)";
    color = "var(--status-danger-text)";
    border = "var(--status-danger-border)";
    Icon = s.includes("critical") ? ShieldAlert : AlertTriangle;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600",
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`
      }}
    >
      <Icon size={13} />
      {status}
    </span>
  );
};
