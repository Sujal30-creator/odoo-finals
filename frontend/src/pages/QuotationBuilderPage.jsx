import React, { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  Send,
  Save,
  X,
  FileText,
  ChevronRight
} from "lucide-react";
import { apiService } from "../services/api";
import { calculateQuotationTotals } from "../utils/calculations";
import { CustomerSelector } from "../components/quotations/CustomerSelector";
import { QuotationLineItems } from "../components/quotations/QuotationLineItems";
import { QuotationSummary } from "../components/quotations/QuotationSummary";
import { ProductSelectorModal } from "../components/quotations/ProductSelectorModal";
import { DealIntelligencePanel } from "../components/quotations/DealIntelligencePanel";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";

// ─── Governance explanation component ─────────────────────────────────────────
const GovernanceBanner = ({ totals }) => {
  const { governanceStatus, effectiveDiscountPct, tierCap, approvalPreview } = totals;
  if (governanceStatus === "WITHIN_LIMIT") {
    return (
      <div style={{
        padding: "10px 14px", borderRadius: "8px", marginBottom: "16px",
        backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
        display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#34d399"
      }}>
        <CheckCircle2 size={15} />
        <span><strong>Within policy limits.</strong> {approvalPreview?.reason}</span>
      </div>
    );
  }

  const isCritical = governanceStatus === "EXCEEDS_LIMIT_CRITICAL";
  const bg    = isCritical ? "rgba(239,68,68,0.08)"   : "rgba(245,158,11,0.08)";
  const bdr   = isCritical ? "rgba(239,68,68,0.3)"    : "rgba(245,158,11,0.3)";
  const color = isCritical ? "#f87171"                 : "#fbbf24";
  const Icon  = isCritical ? AlertTriangle            : Clock;

  return (
    <div style={{
      padding: "12px 14px", borderRadius: "8px", marginBottom: "16px",
      backgroundColor: bg, border: `1px solid ${bdr}`
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <Icon size={15} color={color} />
        <span style={{ fontSize: "12px", fontWeight: "700", color }}>
          {isCritical ? "🔴 Finance VP Approval Required" : "🟡 Sales Manager Approval Required"}
        </span>
      </div>

      {/* Allowed / Applied / Difference table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "8px" }}>
        {[
          { label: "Allowed",    value: `${tierCap}%`,                           c: "#34d399" },
          { label: "Applied",    value: `${effectiveDiscountPct}%`,              c: color     },
          { label: "Difference", value: `+${(effectiveDiscountPct - tierCap).toFixed(1)}%`, c: color }
        ].map(({ label, value, c }) => (
          <div key={label} style={{
            padding: "8px 10px", borderRadius: "6px",
            backgroundColor: "rgba(0,0,0,0.15)", textAlign: "center"
          }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: "16px", fontWeight: "800", color: c, marginTop: "2px" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "8px", lineHeight: "1.5" }}>
        <strong>Reason:</strong> {approvalPreview?.reason}
      </div>
    </div>
  );
};

// ─── Submit confirmation modal ────────────────────────────────────────────────
const SubmitConfirmModal = ({ isOpen, onClose, onConfirm, totals, customer, quoteId, submitting }) => {
  if (!isOpen) return null;
  const { effectiveDiscountPct, tierCap, blendedMarginPct, finalTotal, approvalPreview } = totals;

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px"
    }}>
      <div style={{
        backgroundColor: "var(--bg-card)", borderRadius: "12px",
        border: "1px solid var(--border-color)", width: "100%", maxWidth: "480px",
        padding: "28px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>
              Submission Confirmation
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
              {quoteId || "New Quotation"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Summary rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
          {[
            { label: "Customer",        value: customer?.name || "—" },
            { label: "Total",           value: `$${(finalTotal || 0).toLocaleString()}` },
            { label: "Discount Applied", value: `${effectiveDiscountPct}%`,  warn: effectiveDiscountPct > tierCap },
            { label: "Allowed Discount", value: `${tierCap}%` },
            { label: "Blended Margin",  value: `${blendedMarginPct}%`,       warn: blendedMarginPct < 35 },
            { label: "Required Approval", value: approvalPreview?.requiredRole || "Auto-Approved" }
          ].map(({ label, value, warn }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 0", borderBottom: "1px solid var(--border-color)" }}>
              <span style={{ color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontWeight: "700", color: warn ? "#f87171" : "var(--text-primary)" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Status badge */}
        <div style={{
          padding: "10px 14px", borderRadius: "8px", marginBottom: "20px",
          backgroundColor: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
          fontSize: "12px", color: "#fbbf24", fontWeight: "600"
        }}>
          🟡 After submission, status will change to: <strong>Pending Approval</strong>
          <div style={{ fontWeight: "400", color: "var(--text-secondary)", marginTop: "4px", fontSize: "11px" }}>
            The Sales Rep cannot approve their own quotation. The assigned approver will be notified.
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="outline" onClick={onClose} style={{ flex: 1 }} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" icon={Send} onClick={onConfirm} style={{ flex: 1 }} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export const QuotationBuilderPage = () => {
  const [searchParams] = useSearchParams();
  const dealId  = searchParams.get("dealId")  || null;
  const quoteId = searchParams.get("quoteId") || null;

  const [customers, setCustomers]         = useState([]);
  const [products, setProducts]           = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [lines, setLines]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [toast, setToast]                 = useState(null);
  const [quoteStatus, setQuoteStatus]     = useState("Draft");   // 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Changes Requested'
  const [savedQuoteId, setSavedQuoteId]   = useState(quoteId);
  const [savedDealId, setSavedDealId]     = useState(dealId);
  const [quoteVersion, setQuoteVersion]   = useState(1);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [activityLog, setActivityLog]     = useState([]);
  const [notes, setNotes]                 = useState("");

  useEffect(() => {
    async function loadData() {
      const [custRes, prodRes] = await Promise.all([
        apiService.getCustomers(),
        apiService.getProducts()
      ]);
      setCustomers(custRes);
      setProducts(prodRes);

      // If quoteId provided, load existing quote
      if (quoteId) {
        const existingQuote = await apiService.getQuotationById(quoteId);
        if (existingQuote) {
          setQuoteStatus(existingQuote.status);
          setQuoteVersion(existingQuote.version || 1);
          setSavedQuoteId(existingQuote.id);
          setSavedDealId(existingQuote.dealId);
          setNotes(existingQuote.notes || "");

          const cust = custRes.find(c => c.id === existingQuote.customerId) || custRes[0];
          setSelectedCustomer(cust);

          // Reconstruct lines from saved quote
          if (existingQuote.lines && existingQuote.lines.length > 0) {
            const linesToSet = existingQuote.lines.map(l => ({
              product: l.product,
              quantity: l.qty || 1,
              discountPct: l.discountPct || 0
            }));
            setLines(linesToSet);
            setLoading(false);
            return;
          }
        }
      }

      // Default seed
      setSelectedCustomer(custRes[0] || null);
      if (prodRes.length >= 3) {
        setLines([
          { product: prodRes[0], quantity: 2, discountPct: 10 },
          { product: prodRes[2], quantity: 1, discountPct: 15 }
        ]);
      }
      setLoading(false);
    }
    loadData();
  }, [quoteId]);

  // Load activity if we have a deal
  useEffect(() => {
    if (savedDealId) {
      apiService.getActivityLogs(savedDealId).then(setActivityLog);
    }
  }, [savedDealId]);

  const handleUpdateQty = (productId, newQty) => {
    setLines(prev => prev.map(l =>
      l.product.id === productId ? { ...l, quantity: Math.max(1, Number(newQty) || 1) } : l
    ));
  };

  const handleUpdateDiscount = (productId, newDiscount) => {
    setLines(prev => prev.map(l =>
      l.product.id === productId
        ? { ...l, discountPct: Math.min(100, Math.max(0, Number(newDiscount) || 0)) }
        : l
    ));
  };

  const handleAddProduct = (product) => {
    if (!lines.some(l => l.product.id === product.id)) {
      setLines(prev => [...prev, { product, quantity: 1, discountPct: 10 }]);
    }
    showToast(`Added "${product.name}" to quotation`);
  };

  const handleRemoveLine = (productId) => {
    setLines(prev => prev.filter(l => l.product.id !== productId));
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Central live calculation
  const totals = calculateQuotationTotals(lines, selectedCustomer);

  // Build payload for api calls
  const buildPayload = useCallback(() => ({
    customerId:           selectedCustomer?.id,
    dealId:               savedDealId,
    dealTitle:            "",        // deal title resolved in api from dealId
    salesRep:             "Alexander Vance",
    totalListPrice:       totals.totalListPrice,
    totalDiscount:        totals.totalDiscountAmount,
    netTotal:             totals.totalNetPrice,
    taxAmount:            totals.totalTaxAmount,
    finalTotal:           totals.finalTotal,
    blendedMarginPct:     totals.blendedMarginPct,
    effectiveDiscountPct: totals.effectiveDiscountPct,
    approvalRequired:     totals.requiredApproval,
    notes,
    lines: lines.map(l => ({
      product:     l.product,
      qty:         l.quantity,
      listPrice:   l.product.price,
      discountPct: l.discountPct,
      netPrice:    Math.round(l.product.price * (1 - l.discountPct / 100)),
      totalNet:    Math.round(l.product.price * (1 - l.discountPct / 100) * l.quantity),
      marginPct:   l.product.marginPct
    })),
    categoryViolations: totals.processedLines
      .filter(pl => pl.exceedsCategoryCap)
      .map(pl => pl.violationReason)
  }), [selectedCustomer, savedDealId, totals, notes, lines]);

  const handleSaveDraft = async () => {
    const payload = buildPayload();
    const result = await apiService.saveQuotationDraft(savedQuoteId, payload);
    if (!savedQuoteId) setSavedQuoteId(result.id);
    if (!savedDealId && result.dealId) setSavedDealId(result.dealId);
    setQuoteStatus("Draft");
    // Refresh activity log
    if (result.dealId || savedDealId) {
      apiService.getActivityLogs(result.dealId || savedDealId).then(setActivityLog);
    }
    showToast(`Quotation saved as draft. (${result.id})`, "success");
  };

  const handleSubmitApproval = async () => {
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const { quote, governance } = await apiService.submitQuotationForApproval(savedQuoteId, payload);
      setSavedQuoteId(quote.id);
      setSavedDealId(quote.dealId || savedDealId);
      setQuoteStatus("Pending Approval");
      setQuoteVersion(v => v + 1);
      setShowConfirm(false);
      // Refresh activity log
      const dealForLogs = quote.dealId || savedDealId;
      if (dealForLogs) {
        apiService.getActivityLogs(dealForLogs).then(setActivityLog);
      }
      showToast(
        governance.requiredApproval === "AUTO_APPROVED"
          ? "Quotation auto-approved! Ready to send to customer."
          : `Quotation submitted to ${governance.requiredApproval} for approval.`,
        governance.requiredApproval === "AUTO_APPROVED" ? "success" : "warning"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        Loading Quotation Builder workspace…
      </div>
    );
  }

  // ── Guard: quote is locked for editing if Pending Approval ───────────────
  const isLocked = quoteStatus === "Pending Approval" || quoteStatus === "Approved" || quoteStatus === "Won";

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Link to="/deals" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <ArrowLeft size={14} /> Back to Deals
        </Link>
        {savedDealId && (
          <>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>/</span>
            <Link to={`/deals/${savedDealId}`} style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600" }}>
              Deal {savedDealId}
            </Link>
          </>
        )}
      </div>

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 className="page-title">Quotation Builder</h1>
            {savedQuoteId && (
              <span style={{ fontSize: "12px", fontWeight: "700", padding: "2px 8px", borderRadius: "4px", backgroundColor: "var(--bg-card-hover)", color: "var(--text-muted)" }}>
                {savedQuoteId} · v{quoteVersion}
              </span>
            )}
            <Badge status={quoteStatus} />
          </div>
          <p className="page-subtitle">
            Configure line items, apply discounts, and see real-time governance before submitting for approval
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link to="/quotations">
            <Button variant="outline" icon={FileText} size="sm">My Quotations</Button>
          </Link>
          {savedDealId && (
            <Link to={`/deals/${savedDealId}`}>
              <Button variant="outline" size="sm" icon={ChevronRight}>View Deal</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
          backgroundColor: toast.type === "warning" ? "rgba(245,158,11,0.15)" : toast.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
          border: `1px solid ${toast.type === "warning" ? "rgba(245,158,11,0.4)" : toast.type === "error" ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)"}`,
          color: toast.type === "warning" ? "#fbbf24" : toast.type === "error" ? "#f87171" : "#34d399",
          display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: "600"
        }}>
          <CheckCircle2 size={18} />
          {toast.message}
        </div>
      )}

      {/* Status banner — shown when quote is locked */}
      {isLocked && (
        <div style={{
          padding: "14px 18px", borderRadius: "8px", marginBottom: "20px",
          backgroundColor: quoteStatus === "Approved" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
          border: `1px solid ${quoteStatus === "Approved" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
          display: "flex", alignItems: "center", gap: "12px"
        }}>
          <Lock size={18} color={quoteStatus === "Approved" ? "#34d399" : "#fbbf24"} />
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: quoteStatus === "Approved" ? "#34d399" : "#fbbf24" }}>
              {quoteStatus === "Pending Approval"
                ? "This quotation is currently under approval."
                : `Quotation is ${quoteStatus}.`}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
              {quoteStatus === "Pending Approval"
                ? "Editing is disabled while approval is in progress. If changes are requested, the quote will be returned with status 'Changes Requested'."
                : quoteStatus === "Approved"
                  ? "This quotation has been approved. Contact your Sales Manager to re-open it."
                  : ""}
            </div>
          </div>
          {savedDealId && (
            <Link to={`/deals/${savedDealId}`} style={{ marginLeft: "auto" }}>
              <Button variant="outline" size="sm">View Deal</Button>
            </Link>
          )}
        </div>
      )}

      {/* Changes Requested banner */}
      {quoteStatus === "Changes Requested" && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px", marginBottom: "20px",
          backgroundColor: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.3)",
          fontSize: "13px", color: "#fb923c", fontWeight: "600",
          display: "flex", alignItems: "center", gap: "8px"
        }}>
          <AlertTriangle size={16} />
          Changes requested by approver — review their feedback and re-save before submitting again.
        </div>
      )}

      {/* Governance Banner (only when editing) */}
      {!isLocked && lines.length > 0 && (
        <GovernanceBanner totals={totals} />
      )}

      {/* Main two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "32px", alignItems: "start" }}>

        {/* Left: Customer + Line Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <CustomerSelector
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={(c) => {
              if (isLocked) return;
              setSelectedCustomer(c);
              showToast(`Account selected: ${c.name}`);
            }}
          />

          {/* Notes field */}
          <Card title="Quotation Notes" subtitle="Optional — context for approver or customer">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLocked}
              placeholder="e.g. Customer requested premium support bundling. Close date is firm."
              style={{
                width: "100%", padding: "10px 12px", marginTop: "8px",
                backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)",
                borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px",
                minHeight: "72px", resize: "vertical", outline: "none",
                opacity: isLocked ? 0.6 : 1, boxSizing: "border-box"
              }}
            />
          </Card>

          <QuotationLineItems
            lines={totals.processedLines}
            onUpdateQty={isLocked ? undefined : handleUpdateQty}
            onUpdateDiscount={isLocked ? undefined : handleUpdateDiscount}
            onRemoveLine={isLocked ? undefined : handleRemoveLine}
            onOpenProductModal={isLocked ? undefined : () => setIsModalOpen(true)}
          />

          {/* Activity Log */}
          {activityLog.length > 0 && (
            <Card title="Activity History" subtitle="Audit trail for this deal/quotation">
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px", maxHeight: "300px", overflowY: "auto" }}>
                {[...activityLog].reverse().map((act) => {
                  const typeColors = {
                    deal_created: "#818cf8", customer_selected: "#60a5fa",
                    quote_created: "#34d399", quote_saved: "#34d399",
                    discount_changed: "#fbbf24", submitted: "#a855f7",
                    approved: "#34d399", rejected: "#f87171",
                    changes_requested: "#fb923c", negotiation: "#fb923c",
                    risk: "#f87171", approval: "#fbbf24"
                  };
                  const c = typeColors[act.type] || "var(--primary)";
                  return (
                    <div key={act.id} style={{ display: "flex", gap: "10px", padding: "10px", borderRadius: "8px", backgroundColor: "var(--bg-input)" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: c, flexShrink: 0, marginTop: "5px" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)" }}>{act.title}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{act.description}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px" }}>{act.timestamp}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right: Summary + Intelligence */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <QuotationSummary
            totals={totals}
            onSaveDraft={isLocked ? null : handleSaveDraft}
            onSubmitApproval={isLocked ? null : handleSubmitApproval}
          />
          <DealIntelligencePanel
            insights={totals.intelligenceInsights || []}
            dealId={savedDealId}
          />
        </div>
      </div>

      {/* Product Selector Modal */}
      <ProductSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        onAddProduct={handleAddProduct}
        existingProductIds={lines.map(l => l.product.id)}
      />

      {/* Submit Confirmation Modal */}
      <SubmitConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
        totals={totals}
        customer={selectedCustomer}
        quoteId={savedQuoteId}
        submitting={submitting}
      />
    </div>
  );
};
