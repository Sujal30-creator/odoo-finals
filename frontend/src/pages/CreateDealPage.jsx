import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  User,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  ChevronRight
} from "lucide-react";
import { apiService } from "../services/api";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";

// ─── Field helpers ────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  backgroundColor: "var(--bg-input)",
  border: "1px solid var(--border-color)",
  borderRadius: "8px",
  color: "var(--text-primary)",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box"
};

const labelStyle = {
  fontSize: "11px",
  fontWeight: "700",
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "6px",
  display: "block"
};

const fieldWrap = { display: "flex", flexDirection: "column", gap: "0px" };

// Stages the Sales Rep is allowed to set at creation time.
// Workflow-controlled stages (Pending Approval, etc.) are excluded.
const ALLOWED_STAGES = ["Draft", "Negotiation"];

const SALES_REPS = [
  "Alexander Vance",
  "Elena Rostova",
  "Michael Chang",
  "Sara Kim",
  "James Patel"
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export const CreateDealPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdDeal, setCreatedDeal] = useState(null);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    title: "",
    customerId: "",
    salesRep: "Alexander Vance",
    closeDate: "",
    stage: "Draft",
    estimatedValue: "",
    priority: "Medium",
    notes: ""
  });

  useEffect(() => {
    apiService.getCustomers().then((res) => {
      setCustomers(res);
      if (res.length > 0) setForm((f) => ({ ...f, customerId: res[0].id }));
      setLoading(false);
    });
  }, []);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((err) => ({ ...err, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())         e.title = "Deal title is required.";
    if (!form.customerId)           e.customerId = "Please select a customer.";
    if (!form.closeDate)            e.closeDate = "Expected close date is required.";
    if (form.estimatedValue && isNaN(Number(form.estimatedValue)))
      e.estimatedValue = "Must be a valid number.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const deal = await apiService.createDeal(form);
      setCreatedDeal(deal);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (createdDeal) {
    return (
      <div>
        <div style={{ marginBottom: "16px" }}>
          <Link to="/deals" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <ArrowLeft size={14} /> Back to Deals
          </Link>
        </div>

        <Card style={{ maxWidth: "560px", margin: "40px auto", padding: "40px", textAlign: "center" }}>
          <div style={{
            width: "60px", height: "60px", borderRadius: "50%",
            backgroundColor: "rgba(16,185,129,0.15)", color: "#34d399",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px"
          }}>
            <CheckCircle2 size={30} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
            Deal created successfully.
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "6px" }}>
            <strong style={{ color: "var(--text-primary)" }}>{createdDeal.title}</strong>
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "24px" }}>
            ID: {createdDeal.id} • Stage: {createdDeal.status} • Owner: {createdDeal.salesRep}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link to="/deals/new">
              <Button variant="outline">Create Another</Button>
            </Link>
            <Link to="/deals">
              <Button variant="secondary">View Pipeline</Button>
            </Link>
            <Link to={`/deals/${createdDeal.id}`}>
              <Button variant="primary" icon={ChevronRight}>Open Deal</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
        Loading...
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const selectedCustomer = customers.find((c) => c.id === form.customerId);

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "16px" }}>
        <Link to="/deals" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <ArrowLeft size={14} /> Back to Deals Pipeline
        </Link>
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">Create New Deal</h1>
          <p className="page-subtitle">
            Define the deal parameters. The initial stage is Draft — workflow stages are set by the system.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>

          {/* ── Left column: core fields ─────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Deal Title */}
            <Card title="Deal Information">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>

                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    <Briefcase size={11} style={{ display: "inline", marginRight: "4px" }} />
                    Deal Title *
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: errors.title ? "#f87171" : "var(--border-color)" }}
                    type="text"
                    value={form.title}
                    onChange={set("title")}
                    placeholder="e.g. Acme Corp Cloud Infrastructure Upgrade"
                  />
                  {errors.title && (
                    <span style={{ fontSize: "11px", color: "#f87171", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <AlertCircle size={11} /> {errors.title}
                    </span>
                  )}
                </div>

                {/* Customer */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    <User size={11} style={{ display: "inline", marginRight: "4px" }} />
                    Customer *
                  </label>
                  <select
                    style={{ ...inputStyle, borderColor: errors.customerId ? "#f87171" : "var(--border-color)" }}
                    value={form.customerId}
                    onChange={set("customerId")}
                  >
                    <option value="">— Select customer —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.tier.split(" ")[0]})
                      </option>
                    ))}
                  </select>
                  {errors.customerId && (
                    <span style={{ fontSize: "11px", color: "#f87171", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <AlertCircle size={11} /> {errors.customerId}
                    </span>
                  )}
                </div>

                {/* Customer tier info (read-only preview) */}
                {selectedCustomer && (
                  <div style={{
                    padding: "10px 12px", borderRadius: "8px",
                    backgroundColor: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    fontSize: "12px", color: "var(--text-secondary)"
                  }}>
                    <strong style={{ color: "var(--primary)" }}>{selectedCustomer.name}</strong>
                    {" — "}{selectedCustomer.industry}
                    {" • "}{selectedCustomer.tier}
                    {" • "} Discount cap:{" "}
                    <strong style={{ color: "var(--text-primary)" }}>{selectedCustomer.tierDiscountCap}%</strong>
                    {" • "}Contact: {selectedCustomer.contactName}
                  </div>
                )}

                {/* Sales Rep */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    <User size={11} style={{ display: "inline", marginRight: "4px" }} />
                    Sales Representative
                  </label>
                  <select style={inputStyle} value={form.salesRep} onChange={set("salesRep")}>
                    {SALES_REPS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    <FileText size={11} style={{ display: "inline", marginRight: "4px" }} />
                    Notes
                  </label>
                  <textarea
                    style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
                    value={form.notes}
                    onChange={set("notes")}
                    placeholder="Context, customer background, strategic notes…"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* ── Right column: deal params ──────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            <Card title="Deal Parameters">
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>

                {/* Stage */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>Initial Stage</label>
                  <select style={inputStyle} value={form.stage} onChange={set("stage")}>
                    {ALLOWED_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Stages like Pending Approval and Approved are set automatically by the workflow.
                  </span>
                </div>

                {/* Close Date */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    <Calendar size={11} style={{ display: "inline", marginRight: "4px" }} />
                    Expected Close Date *
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: errors.closeDate ? "#f87171" : "var(--border-color)" }}
                    type="date"
                    value={form.closeDate}
                    onChange={set("closeDate")}
                  />
                  {errors.closeDate && (
                    <span style={{ fontSize: "11px", color: "#f87171", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <AlertCircle size={11} /> {errors.closeDate}
                    </span>
                  )}
                </div>

                {/* Estimated Value */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    <DollarSign size={11} style={{ display: "inline", marginRight: "4px" }} />
                    Estimated Deal Value ($)
                  </label>
                  <input
                    style={{ ...inputStyle, borderColor: errors.estimatedValue ? "#f87171" : "var(--border-color)" }}
                    type="number"
                    min="0"
                    step="1000"
                    value={form.estimatedValue}
                    onChange={set("estimatedValue")}
                    placeholder="e.g. 150000"
                  />
                  {errors.estimatedValue && (
                    <span style={{ fontSize: "11px", color: "#f87171", marginTop: "4px" }}>
                      {errors.estimatedValue}
                    </span>
                  )}
                </div>

                {/* Priority */}
                <div style={fieldWrap}>
                  <label style={labelStyle}>
                    <Tag size={11} style={{ display: "inline", marginRight: "4px" }} />
                    Priority
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {PRIORITIES.map((p) => {
                      const color = p === "Critical" ? "#f87171" : p === "High" ? "#fbbf24" : p === "Medium" ? "#60a5fa" : "#94a3b8";
                      const selected = form.priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, priority: p }))}
                          style={{
                            padding: "8px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "700",
                            border: selected ? `2px solid ${color}` : "1px solid var(--border-color)",
                            backgroundColor: selected ? `${color}18` : "var(--bg-input)",
                            color: selected ? color : "var(--text-secondary)",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* Summary preview */}
            <Card style={{ padding: "14px 16px", backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)", textTransform: "uppercase", marginBottom: "10px" }}>
                Deal Preview
              </div>
              {[
                { label: "Title",    value: form.title || "—" },
                { label: "Customer", value: selectedCustomer?.name || "—" },
                { label: "Stage",    value: form.stage },
                { label: "Value",    value: form.estimatedValue ? `$${Number(form.estimatedValue).toLocaleString()}` : "—" },
                { label: "Priority", value: form.priority },
                { label: "Close",    value: form.closeDate || "—" },
                { label: "Owner",    value: form.salesRep }
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ color: "var(--text-primary)", fontWeight: "600", maxWidth: "180px", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
                </div>
              ))}
            </Card>

            {/* Submit */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Button
                variant="primary"
                style={{ width: "100%" }}
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save Deal"}
              </Button>
              <Link to="/deals" style={{ width: "100%" }}>
                <Button variant="outline" style={{ width: "100%" }}>Cancel</Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
