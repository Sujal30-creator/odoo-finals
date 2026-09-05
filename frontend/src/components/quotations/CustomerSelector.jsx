import React from "react";
import { Users, Building2, Mail, Phone, ShieldCheck, Award } from "lucide-react";
import { Card } from "../common/Card";

export const CustomerSelector = ({ customers = [], selectedCustomer, onSelectCustomer }) => {
  return (
    <Card title="1. Customer Selection" subtitle="Select target account to apply customer tier pricing and governance rules">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Customer Select Dropdown */}
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: "600" }}>
            Account Name:
          </label>
          <select
            value={selectedCustomer?.id || ""}
            onChange={(e) => {
              const cust = customers.find((c) => c.id === e.target.value);
              if (cust) onSelectCustomer(cust);
            }}
            style={{
              width: "100%",
              padding: "10px 14px",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontWeight: "600",
              outline: "none"
            }}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.tier} ({c.industry})
              </option>
            ))}
          </select>
        </div>

        {/* Selected Customer Info Box */}
        {selectedCustomer && (
          <div
            style={{
              padding: "14px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-color)",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px"
            }}
          >
            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", fontWeight: "600" }}>
                TIER & DISCOUNT CAP
              </span>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#38bdf8", marginTop: "2px" }}>
                {selectedCustomer.tier.split(" ")[0]} ({selectedCustomer.tierDiscountCap}% Max)
              </div>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", fontWeight: "600" }}>
                PRIMARY CONTACT
              </span>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
                {selectedCustomer.contactName}
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{selectedCustomer.contactEmail}</span>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", fontWeight: "600" }}>
                CREDIT RATING
              </span>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#34d399", marginTop: "2px" }}>
                Rating {selectedCustomer.creditRating}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", fontWeight: "600" }}>
                ACCOUNT LTV
              </span>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-primary)", marginTop: "2px" }}>
                {selectedCustomer.lifetimeValue}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
