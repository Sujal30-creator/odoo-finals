import React from "react";
import { Construction, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";

export const PlaceholderPage = ({ title, moduleName, description }) => {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Module: {moduleName}</p>
        </div>
        <Link to="/dashboard">
          <Button variant="outline" icon={ArrowLeft}>
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card style={{ padding: "48px 24px", textAlign: "center", maxWidth: "600px", margin: "40px auto" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            color: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px"
          }}
        >
          <Construction size={32} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
          {title} Module Foundation Ready
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
          {description || `The layout, routing, and data contract for ${moduleName} are configured. Full UI implementation is scheduled in the upcoming hackathon milestone.`}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link to="/deals">
            <Button variant="primary">Explore Deals Pipeline</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
