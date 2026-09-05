import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, Sliders, TrendingUp, MessageSquare, AlertTriangle, ShoppingCart, BarChart2, Lightbulb } from "lucide-react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";

const insightIcons = {
  margin_alert:   { Icon: AlertTriangle, color: "#f87171", bg: "rgba(239, 68, 68, 0.1)",   border: "rgba(239, 68, 68, 0.25)" },
  cross_sell:     { Icon: ShoppingCart,  color: "#60a5fa", bg: "rgba(59, 130, 246, 0.1)",  border: "rgba(59, 130, 246, 0.25)" },
  benchmark:      { Icon: BarChart2,     color: "#fbbf24", bg: "rgba(245, 158, 11, 0.1)",  border: "rgba(245, 158, 11, 0.25)" },
  recommendation: { Icon: Lightbulb,    color: "#34d399", bg: "rgba(16, 185, 129, 0.1)",  border: "rgba(16, 185, 129, 0.25)" }
};

export const DealIntelligencePanel = ({ insights = [], dealId }) => {
  return (
    <Card title="DEAL INTELLIGENCE" subtitle="Live deterministic insights based on current quote configuration">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Live Insights List */}
        {insights.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {insights.map((insight, idx) => {
              const { Icon, color, bg, border } = insightIcons[insight.type] || insightIcons.recommendation;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    backgroundColor: bg,
                    border: `1px solid ${border}`
                  }}
                >
                  <Icon size={16} style={{ color, flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color }}>
                      {insight.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: "1.5" }}>
                      {insight.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
            Add products to see deal intelligence insights.
          </div>
        )}

        {/* Quick Navigation to Future Intelligence Modules */}
        <div style={{ paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
            Intelligence Modules
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <Link to={dealId ? `/simulator/${dealId}` : "/simulator/new"}>
              <Button variant="outline" size="sm" icon={Sliders} style={{ width: "100%", justifyContent: "flex-start" }}>
                Simulate Deal
              </Button>
            </Link>
            <Link to={dealId ? `/negotiation/${dealId}` : "/negotiation/new"}>
              <Button variant="outline" size="sm" icon={MessageSquare} style={{ width: "100%", justifyContent: "flex-start" }}>
                Review Negotiation
              </Button>
            </Link>
            <Link to="/deal-health">
              <Button variant="outline" size="sm" icon={BarChart2} style={{ width: "100%", justifyContent: "flex-start" }}>
                Analyze Margin
              </Button>
            </Link>
            <Link to="/deal-health">
              <Button variant="outline" size="sm" icon={Sparkles} style={{ width: "100%", justifyContent: "flex-start" }}>
                View Recommendations
              </Button>
            </Link>
          </div>
        </div>

        <div style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>
          Insights generated from current quote data. AI engine integration available in next milestone.
        </div>
      </div>
    </Card>
  );
};
