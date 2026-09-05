import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  CheckCircle2,
  Activity,
  Sliders,
  MessageSquare,
  Users,
  Settings,
  Zap,
  Sparkles,
  Plus,
  ClipboardList,
  Package,
  Building2,
  ShieldCheck
} from "lucide-react";
import { getCurrentUser } from "../../services/auth";

export const Sidebar = () => {
  const user = getCurrentUser();
  const baseNavItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Deals & Pipeline", path: "/deals", icon: Briefcase },
    { label: "New Deal", path: "/deals/new", icon: Plus },
    { label: "New Quotation", path: "/quotations/new", icon: FileText, tag: "Builder" },
    { label: "My Quotations", path: "/quotations", icon: ClipboardList },
    { label: "Approvals Center", path: "/approvals", icon: CheckCircle2, badge: "2", managerOnly: true },
    { label: "Fulfillment", path: "/fulfillment", icon: Zap },
    { label: "Deal Health", path: "/deal-health", icon: Activity, tag: "AI", managerOnly: true },
    { label: "Simulator", path: "/simulator/deal-301", icon: Sliders },
    { label: "Customer Portal", path: "/negotiation/deal-301", icon: MessageSquare },
    { label: "Customers", path: "/customer", icon: Users },
    { label: "Admin Dashboard", path: "/admin/dashboard", icon: LayoutDashboard, adminOnly: true },
    { label: "User Management", path: "/admin/users", icon: Users, adminOnly: true },
    { label: "Customer Management", path: "/admin/customers", icon: Building2, adminOnly: true },
    { label: "Product / Catalog", path: "/admin/products", icon: Package, adminOnly: true },
    { label: "Governance", path: "/admin/governance", icon: ShieldCheck, adminOnly: true },
    { label: "System Activity", path: "/admin/activity", icon: Activity, adminOnly: true },
    // Finance / Operations navigation (visible only to finance role)
    { label: "Finance Dashboard", path: "/finance/dashboard", icon: LayoutDashboard, financeOnly: true },
    { label: "Finance Approvals", path: "/finance/approvals", icon: CheckCircle2, financeOnly: true },
    { label: "Fulfillment", path: "/finance/fulfillment", icon: Package, financeOnly: true },
    { label: "Billing", path: "/finance/billing", icon: FileText, financeOnly: true },
    { label: "Finance Activity", path: "/finance/activity", icon: Activity, financeOnly: true }
  ];
  const navItems = baseNavItems.filter(item => {
    if (item.adminOnly) return user.role === "admin";
    if (item.managerOnly) return user.role === "sales_manager";
    if (item.financeOnly) return user.role === "finance_operations";
    return true;
  });


  return (
    <aside
      style={{
        width: "260px",
        height: "100vh",
        backgroundColor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        userSelect: "none"
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: "64px",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderBottom: "1px solid var(--border-color)"
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 12px rgba(99, 102, 241, 0.4)"
          }}
        >
          <Sparkles size={18} color="#fff" />
        </div>
        <div>
          <span style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            DealFlow<span style={{ color: "var(--primary)" }}>360</span>
          </span>
          <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)", fontWeight: "600" }}>
            OPERATIONS PLATFORM
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <div style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", padding: "0 12px 8px", textTransform: "uppercase" }}>
          Navigation
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: isActive ? "600" : "500",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  backgroundColor: isActive ? "var(--bg-card-hover)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                  transition: "all 0.15s ease"
                })}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon size={18} style={{ color: "inherit" }} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      padding: "2px 7px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: "700",
                      backgroundColor: "rgba(239, 68, 68, 0.2)",
                      color: "#f87171",
                      border: "1px solid rgba(239, 68, 68, 0.3)"
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {item.tag && (
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "9px",
                      fontWeight: "700",
                      backgroundColor: "var(--primary-glow)",
                      color: "var(--accent-purple)",
                      border: "1px solid rgba(168, 85, 247, 0.3)"
                    }}
                  >
                    {item.tag}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / Environment info */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid var(--border-color)",
          backgroundColor: "rgba(0,0,0,0.2)"
        }}
      >
        <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500" }}>
          Environment: <span style={{ color: "#34d399" }}>● Hackathon MVP</span>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
          Rule Engine: <span style={{ color: "var(--text-secondary)" }}>Active</span>
        </div>

      </div>
    </aside>
  );
};
