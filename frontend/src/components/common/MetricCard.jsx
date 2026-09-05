import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "./Card";

export const MetricCard = ({ title, value, change, changeType = "positive", subtitle, icon: Icon, color = "var(--primary)" }) => {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500" }}>{title}</span>
          <div style={{ fontSize: "26px", fontWeight: "800", marginTop: "6px", color: "var(--text-primary)" }}>
            {value}
          </div>
          {(change || subtitle) && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "12px" }}>
              {change && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    fontWeight: "600",
                    color: changeType === "positive" ? "#34d399" : "#f87171"
                  }}
                >
                  {changeType === "positive" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {change}
                </span>
              )}
              {subtitle && <span style={{ color: "var(--text-muted)" }}>{subtitle}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div
            style={{
              padding: "10px",
              borderRadius: "10px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: color,
              border: "1px solid var(--border-color)"
            }}
          >
            <Icon size={22} />
          </div>
        )}
      </div>
    </Card>
  );
};
