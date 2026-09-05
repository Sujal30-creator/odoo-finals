import React from "react";
import { X, Plus, Package, Check } from "lucide-react";
import { Button } from "../common/Button";

export const ProductSelectorModal = ({ isOpen, onClose, products = [], onAddProduct, existingProductIds = [] }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div
        style={{
          width: "650px",
          maxWidth: "90vw",
          maxHeight: "85vh",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Add Products to Quotation</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
              Select hardware, software subscriptions, or services from catalog
            </p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>

        {/* Catalog List */}
        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
          {products.map((prod) => {
            const isAdded = existingProductIds.includes(prod.id);
            return (
              <div
                key={prod.id}
                style={{
                  padding: "14px",
                  borderRadius: "8px",
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>{prod.name}</span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                      {prod.category}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    SKU: {prod.sku} • List Price: <strong style={{ color: "var(--text-primary)" }}>${prod.price.toLocaleString()}</strong> • Max Disc Cap: {prod.discountCap}%
                  </div>
                </div>

                <Button
                  variant={isAdded ? "secondary" : "primary"}
                  size="sm"
                  disabled={isAdded}
                  icon={isAdded ? Check : Plus}
                  onClick={() => {
                    onAddProduct(prod);
                  }}
                >
                  {isAdded ? "Added" : "Add to Quote"}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border-color)", textAlign: "right" }}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
