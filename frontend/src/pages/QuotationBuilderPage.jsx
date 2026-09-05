import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiService } from "../services/api";
import { calculateQuotationTotals } from "../utils/calculations";
import { CustomerSelector } from "../components/quotations/CustomerSelector";
import { QuotationLineItems } from "../components/quotations/QuotationLineItems";
import { QuotationSummary } from "../components/quotations/QuotationSummary";
import { ProductSelectorModal } from "../components/quotations/ProductSelectorModal";
import { DealIntelligencePanel } from "../components/quotations/DealIntelligencePanel";
import { Button } from "../components/common/Button";

export const QuotationBuilderPage = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function loadData() {
      const [custRes, prodRes] = await Promise.all([
        apiService.getCustomers(),
        apiService.getProducts()
      ]);
      setCustomers(custRes);
      setProducts(prodRes);

      if (custRes.length > 0) {
        setSelectedCustomer(custRes[0]);
      }

      // Seed with two sample lines
      if (prodRes.length >= 3) {
        setLines([
          { product: prodRes[0], quantity: 2, discountPct: 10 },
          { product: prodRes[2], quantity: 1, discountPct: 15 }
        ]);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  const handleUpdateQty = (productId, newQty) => {
    setLines((prev) =>
      prev.map((line) =>
        line.product.id === productId
          ? { ...line, quantity: Math.max(1, Number(newQty) || 1) }
          : line
      )
    );
  };

  const handleUpdateDiscount = (productId, newDiscount) => {
    setLines((prev) =>
      prev.map((line) =>
        line.product.id === productId
          ? { ...line, discountPct: Math.min(100, Math.max(0, Number(newDiscount) || 0)) }
          : line
      )
    );
  };

  const handleAddProduct = (product) => {
    if (!lines.some((l) => l.product.id === product.id)) {
      setLines((prev) => [...prev, { product, quantity: 1, discountPct: 10 }]);
    }
    showToast(`Added "${product.name}" to quotation`);
  };

  const handleRemoveLine = (productId) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Central live calculation — reruns on every state change
  const totals = calculateQuotationTotals(lines, selectedCustomer);

  const handleSaveDraft = () => {
    showToast("Draft quotation saved successfully! (Ref: Q-DRAFT-2026)", "success");
  };

  const handleSubmitApproval = () => {
    const role = totals.approvalPreview?.requiredRole;
    if (!role || role === "AUTO_APPROVED") {
      showToast("Quotation auto-approved! Ready to send to customer.", "success");
    } else {
      showToast(`Quotation submitted to ${role} for approval.`, "warning");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        Loading Quotation Builder workspace...
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "16px" }}>
        <Link to="/deals" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          ← Back to Deals
        </Link>
      </div>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">Quotation Builder</h1>
          <p className="page-subtitle">
            Configure customer tier pricing, line items, and discount governance — see financial impact in real time
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            backgroundColor: toast.type === "warning" ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
            border: `1px solid ${toast.type === "warning" ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
            color: toast.type === "warning" ? "#fbbf24" : "#34d399",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            fontWeight: "600"
          }}
        >
          <CheckCircle2 size={18} />
          {toast.message}
        </div>
      )}

      {/* Main Two-Column Builder Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "24px",
          marginBottom: "32px",
          alignItems: "start"
        }}
      >
        {/* Left: Customer + Line Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <CustomerSelector
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={(c) => {
              setSelectedCustomer(c);
              showToast(`Account selected: ${c.name}`);
            }}
          />

          <QuotationLineItems
            lines={totals.processedLines}
            onUpdateQty={handleUpdateQty}
            onUpdateDiscount={handleUpdateDiscount}
            onRemoveLine={handleRemoveLine}
            onOpenProductModal={() => setIsModalOpen(true)}
          />
        </div>

        {/* Right: Live Summary + Deal Intelligence */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <QuotationSummary
            totals={totals}
            onSaveDraft={handleSaveDraft}
            onSubmitApproval={handleSubmitApproval}
          />

          <DealIntelligencePanel
            insights={totals.intelligenceInsights || []}
            dealId={null}
          />
        </div>
      </div>

      {/* Product Selector Modal */}
      <ProductSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        onAddProduct={handleAddProduct}
        existingProductIds={lines.map((l) => l.product.id)}
      />
    </div>
  );
};
