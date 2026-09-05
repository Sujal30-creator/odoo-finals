import React from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";

export const QuotationLineItems = ({
  lines = [],
  onUpdateQty,
  onUpdateDiscount,
  onRemoveLine,
  onOpenProductModal
}) => {
  return (
    <Card
      title="2. Quotation Line Items & Discount Configuration"
      subtitle="Set quantities and line-level discount percentages — governance violations are highlighted in real-time"
      action={
        <Button variant="primary" size="sm" icon={Plus} onClick={onOpenProductModal}>
          Add Product
        </Button>
      }
    >
      {lines.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: "8px", color: "var(--text-muted)", marginTop: "8px" }}>
          No products added yet. Click <strong>+ Add Product</strong> to populate line items.
        </div>
      ) : (
        <table className="custom-table" style={{ marginTop: "8px" }}>
          <thead>
            <tr>
              <th>Product / SKU</th>
              <th>Category</th>
              <th style={{ width: "90px" }}>Qty</th>
              <th>Unit List Price</th>
              <th style={{ width: "130px" }}>Discount %</th>
              <th>Net Line Total</th>
              <th>Line Margin %</th>
              <th style={{ width: "50px" }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const exceedsCap = line.exceedsCategoryCap;
              return (
                <React.Fragment key={line.product.id}>
                  <tr>
                    <td>
                      <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{line.product.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        SKU: {line.product.sku} &nbsp;•&nbsp; Cap: {line.product.discountCap}%
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{line.product.category}</span>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => onUpdateQty(line.product.id, e.target.value)}
                        style={{
                          width: "65px",
                          padding: "6px 8px",
                          backgroundColor: "var(--bg-input)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "6px",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                          fontWeight: "600",
                          outline: "none"
                        }}
                      />
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>${line.product.price.toLocaleString()}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={line.discountPct}
                          onChange={(e) => onUpdateDiscount(line.product.id, e.target.value)}
                          style={{
                            width: "65px",
                            padding: "6px 8px",
                            backgroundColor: "var(--bg-input)",
                            border: `1px solid ${exceedsCap ? "rgba(239, 68, 68, 0.6)" : "var(--border-color)"}`,
                            borderRadius: "6px",
                            color: exceedsCap ? "#f87171" : "var(--text-primary)",
                            fontSize: "13px",
                            fontWeight: "600",
                            outline: "none"
                          }}
                        />
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>%</span>
                        {exceedsCap && <AlertCircle size={15} color="#f87171" />}
                      </div>
                    </td>
                    <td style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                      ${line.netPrice?.toLocaleString() || 0}
                    </td>
                    <td style={{ color: (line.lineMarginPct ?? 0) < 35 ? "#f87171" : "#34d399", fontWeight: "700" }}>
                      {line.lineMarginPct ?? 0}%
                    </td>
                    <td>
                      <button
                        onClick={() => onRemoveLine(line.product.id)}
                        style={{ color: "var(--text-muted)", padding: "4px" }}
                        title="Remove product"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>

                  {/* Explicit violation reason row */}
                  {exceedsCap && line.violationReason && (
                    <tr>
                      <td colSpan={8} style={{ padding: "4px 16px 8px", borderBottom: "none" }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          backgroundColor: "rgba(239, 68, 68, 0.08)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          fontSize: "11px",
                          color: "#f87171",
                          fontWeight: "600"
                        }}>
                          <AlertCircle size={13} />
                          {line.violationReason}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
};
