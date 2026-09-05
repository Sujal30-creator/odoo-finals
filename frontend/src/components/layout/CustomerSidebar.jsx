import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  Users,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { getCurrentUser } from "../../services/auth";

export const CustomerSidebar = () => {
  const user = getCurrentUser();
  if (user.role !== "customer") return null;

  const navItems = [
    { label: "Dashboard", path: "/customer/dashboard", icon: LayoutDashboard },
    { label: "My Quotations", path: "/customer/quotations", icon: ClipboardList },
    { label: "Negotiations", path: "/customer/negotiations", icon: MessageSquare },
    { label: "Profile", path: "/customer/profile", icon: Users },
    { label: "Settings", path: "/customer/settings", icon: Settings }
  ];

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
            CUSTOMER PORTAL
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
              </NavLink>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
