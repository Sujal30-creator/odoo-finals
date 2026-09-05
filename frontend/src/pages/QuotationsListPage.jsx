import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw
} from "lucide-react";
import { apiService } from "../services/api";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";

// ─── Status pill ──────────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const s = (status || "").toLowerCase();
  let bg, color, Icon;

  if (s === "approved" || s === "won" || s === "auto-approved") {
    bg = "rgba(16,185,129,0.15)"; color = "#34d399"; Icon = CheckCircle2;
  } else if (s === "pending approval") {
    bg = "rgba(245,158,11,0.15)"; color = "#fbbf24"; Icon = Clock;
  } else if (s === "draft") {
    bg = "rgba(148,163,184,0.15)"; color = "#94a3b8"; Icon = FileText;
  } else if (s === "rejected") {
    bg = "rgba(239,68,68,0.15)"; color = "#f87171"; Icon = XCircle;
  } else if (s === "changes requested") {
    bg = "rgba(251,146,60,0.15)"; color = "#fb923c"; Icon = AlertTriangle;
  } else {
    bg = "rgba(148,163,184,0.15)"; color = "#94a3b8"; Icon = FileText;
  }

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: "700",
      backgroundColor: bg, color
    }}>
      <Icon size={12} />
      {status}
    </span>
  );
};

const STATUS_FILTERS = [
  { id: "ALL",               label: "All" },
  { id: "Draft",             label: "Draft" },
  { id: "Pending Approval",  label: "Pending Approval" },
  { id: "Approved",          label: "Approved" },
  { id: "Rejected",          label: "Rejected" },
  { id: "Changes Requested", label: "Changes Requested" },
  { id: "Won",               label: "Won" }
];

export const QuotationsListPage = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortField, setSortField] = useState("updatedDate");
  const [sortAsc, setSortAsc] = useState(false);

  const fetchQuotes = async () => {
    setLoading(true);
    const res = await apiService.getQuotations({ search, status: statusFilter });
    setQuotes(res);
    setLoading(false);
  };

  useEffect(() => { fetchQuotes(); }, [search, statusFilter]);

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  const sorted = [...quotes].sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });

  // Stats row
  const counts = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === "Draft").length,
    pending: quotes.filter(q => q.status === "Pending Approval").length,
    approved: quotes.filter(q => q.status === "Approved" || q.status === "Won").length,
    changes: quotes.filter(q => q.status === "Changes Requested").length,
    rejected: quotes.filter(q => q.status === "Rejected").length
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="page-title">My Quotations</h1>
          <p className="page-subtitle">
            All quotations across your deals — track status, discount, and margin at a glance
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="outline" icon={RefreshCw} onClick={fetchQuotes} size="sm">
            Refresh
          </Button>
          <Link to="/quotations/new">
            <Button variant="primary" icon={Plus}>New Quotation</Button>
          </Link>
        </div>
      </div>

      {/* Status summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Total",             count: counts.total,    color: "#94a3b8" },
          { label: "Draft",             count: counts.draft,    color: "#94a3b8" },
          { label: "Pending",           count: counts.pending,  color: "#fbbf24" },
          { label: "Approved",          count: counts.approved, color: "#34d399" },
          { label: "Changes Req.",      count: counts.changes,  color: "#fb923c" },
          { label: "Rejected",          count: counts.rejected, color: "#f87171" }
        ].map(({ label, count, color }) => (
          <div key={label} style={{
            padding: "14px 12px", borderRadius: "10px", textAlign: "center",
            backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)"
          }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
              {label}
            </div>
            <div style={{ fontSize: "26px", fontWeight: "800", color }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: "24px", padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search by Quote ID, customer, deal title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "8px 12px 8px 36px",
                backgroundColor: "var(--bg-input)", border: "1px solid var(--border-color)",
                borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", outline: "none"
              }}
            />
          </div>

          {/* Status filter pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                style={{
                  padding: "6px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
                  backgroundColor: statusFilter === f.id ? "var(--primary)" : "var(--bg-card)",
                  color: statusFilter === f.id ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${statusFilter === f.id ? "var(--primary)" : "var(--border-color)"}`,
                  cursor: "pointer", transition: "all 0.15s ease"
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading quotations…
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            No quotations found matching the active filters.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("id")}>
                  Quote ID <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th>Customer</th>
                <th>Deal</th>
                <th>Rep</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("netTotal")}>
                  Net Total <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("effectiveDiscountPct")}>
                  Discount <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("blendedMarginPct")}>
                  Margin <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th>Status</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("createdDate")}>
                  Created <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("updatedDate")}>
                  Updated <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((q) => (
                <tr key={q.id}>
                  <td style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "700" }}>
                    {q.id}
                  </td>
                  <td style={{ fontWeight: "600" }}>{q.customerName}</td>
                  <td style={{ fontSize: "11px", color: "var(--text-secondary)", maxWidth: "180px" }}>
                    {q.dealTitle ? (
                      <Link to={`/deals/${q.dealId}`} style={{ color: "var(--primary)", fontWeight: "600" }}>
                        {q.dealTitle.length > 35 ? q.dealTitle.slice(0, 35) + "…" : q.dealTitle}
                      </Link>
                    ) : "—"}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{q.salesRep}</td>
                  <td style={{ fontWeight: "800" }}>${(q.netTotal || 0).toLocaleString()}</td>
                  <td style={{ color: (q.effectiveDiscountPct || 0) > 20 ? "#f87171" : "inherit", fontWeight: "600" }}>
                    {q.effectiveDiscountPct}%
                  </td>
                  <td style={{ color: (q.blendedMarginPct || 0) < 35 ? "#f87171" : "#34d399", fontWeight: "700" }}>
                    {q.blendedMarginPct}%
                  </td>
                  <td><StatusPill status={q.status} /></td>
                  <td style={{ fontSize: "11px", color: "var(--text-muted)" }}>{q.createdDate}</td>
                  <td style={{ fontSize: "11px", color: "var(--text-muted)" }}>{q.updatedDate}</td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {q.dealId && (
                        <Link to={`/deals/${q.dealId}`}>
                          <Button variant="secondary" size="sm" icon={Eye}>View</Button>
                        </Link>
                      )}
                      {(q.status === "Draft" || q.status === "Changes Requested") && (
                        <Link to={`/quotations/new?quoteId=${q.id}&dealId=${q.dealId || ""}`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};
