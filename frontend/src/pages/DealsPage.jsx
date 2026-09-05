import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Eye, ArrowUpDown, Filter, AlertTriangle, Clock } from "lucide-react";
import { apiService } from "../services/api";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";

export const DealsPage = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [sortField, setSortField] = useState("amount");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetchDeals();
  }, [search, statusFilter, riskFilter, quickFilter]);

  const fetchDeals = async () => {
    setLoading(true);
    const data = await apiService.getDeals({
      search,
      status: statusFilter,
      riskLevel: riskFilter,
      quickFilter
    });
    setDeals(data);
    setLoading(false);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedDeals = [...deals].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const quickFilterTabs = [
    { id: "ALL", label: "All Deals" },
    { id: "HIGH_DISCOUNT", label: "High Discount (≥20%)" },
    { id: "LOW_MARGIN", label: "Low Margin (<35%)" },
    { id: "STALLED", label: "Stalled Deals (>7 days)" },
    { id: "PENDING_APPROVAL", label: "Pending Approvals" }
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Deals & Pipeline Management</h1>
          <p className="page-subtitle">Filter, sort, and inspect active enterprise sales deals by risk, margin, and approval state</p>
        </div>
        <Link to="/quotations/new">
          <Button variant="primary" icon={Plus}>
            New Quotation
          </Button>
        </Link>
      </div>

      {/* Quick Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {quickFilterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setQuickFilter(tab.id)}
            style={{
              padding: "8px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
              backgroundColor: quickFilter === tab.id ? "var(--primary)" : "var(--bg-card)",
              color: quickFilter === tab.id ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${quickFilter === tab.id ? "var(--primary)" : "var(--border-color)"}`,
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Detailed Filters Card */}
      <Card style={{ marginBottom: "24px", padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Bar */}
          <div style={{ position: "relative", flex: "1", minWidth: "240px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)"
              }}
            />
            <input
              type="text"
              placeholder="Search by Deal ID, title, customer, rep..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none"
              }}
            />
          </div>

          {/* Stage Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500" }}>Stage:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none"
              }}
            >
              <option value="ALL">All Stages</option>
              <option value="Draft">Draft</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="In Negotiation">In Negotiation</option>
              <option value="Approved">Approved</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Won">Won</option>
            </select>
          </div>

          {/* Risk Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500" }}>Risk Level:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none"
              }}
            >
              <option value="ALL">All Risk Levels</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
              <option value="Critical">Critical Risk</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Deals Table */}
      <Card>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading deals...
          </div>
        ) : sortedDeals.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            No deals found matching the active filter parameters.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Deal ID</th>
                <th>Deal Title & Customer</th>
                <th>Rep</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("amount")}>
                  Amount <ArrowUpDown size={12} style={{ display: "inline" }} />
                </th>
                <th>Discount</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("marginPct")}>
                  Margin % <ArrowUpDown size={12} style={{ display: "inline" }} />
                </th>
                <th>Stage</th>
                <th>Risk Level</th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("daysInStage")}>
                  Days Stalled <ArrowUpDown size={12} style={{ display: "inline" }} />
                </th>
                <th>Next Action</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedDeals.map((deal) => (
                <tr key={deal.id}>
                  <td style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>{deal.id}</td>
                  <td>
                    <Link to={`/deals/${deal.id}`} style={{ fontWeight: "700", color: "var(--text-primary)", display: "block" }}>
                      {deal.title}
                    </Link>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      {deal.customer.name} ({deal.customer.tier.split(" ")[0]})
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{deal.salesRep}</td>
                  <td style={{ fontWeight: "800" }}>${deal.amount.toLocaleString()}</td>
                  <td style={{ color: deal.discountPct > 20 ? "#f87171" : "inherit", fontWeight: "600" }}>
                    {deal.discountPct}%
                  </td>
                  <td style={{ color: deal.marginPct < 35 ? "#f87171" : "#34d399", fontWeight: "700" }}>
                    {deal.marginPct}%
                  </td>
                  <td>
                    <Badge status={deal.status} />
                  </td>
                  <td>
                    <Badge status={deal.riskLevel} />
                  </td>
                  <td>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: deal.daysInStage > 7 ? "#fbbf24" : "var(--text-secondary)" }}>
                      {deal.daysInStage}d
                    </span>
                  </td>
                  <td style={{ fontSize: "11px", color: "var(--text-secondary)", maxWidth: "200px" }}>
                    {deal.nextAction}
                  </td>
                  <td>
                    <Link to={`/deals/${deal.id}`}>
                      <Button variant="secondary" size="sm" icon={Eye}>
                        Inspect
                      </Button>
                    </Link>
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
