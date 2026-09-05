import React from "react";
import { Search, Bell, Shield, Sun, Moon, ChevronDown } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export const Header = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      style={{
        height: "64px",
        backgroundColor: "var(--bg-header)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px"
      }}
    >
      {/* Search Input */}
      <div style={{ position: "relative", width: "320px" }}>
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
          placeholder="Search deals, quotations, customers... (Ctrl+K)"
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

      {/* Right Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Role Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "20px",
            backgroundColor: "var(--primary-glow)",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            fontSize: "12px",
            fontWeight: "600",
            color: "var(--accent-purple)"
          }}
        >
          <Shield size={14} />
          <span>Role: Senior Sales Rep</span>
        </div>

        {/* Global Dark / Light Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          style={{
            padding: "8px",
            borderRadius: "8px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          {theme === "dark" ? <Sun size={18} color="#fbbf24" /> : <Moon size={18} color="#6366f1" />}
        </button>

        {/* Notifications */}
        <button
          style={{
            position: "relative",
            padding: "8px",
            borderRadius: "8px",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)"
          }}
        >
          <Bell size={18} />
          <span
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#ef4444"
            }}
          />
        </button>

        {/* User Profile */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "4px 8px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-card)",
            cursor: "pointer"
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: "700",
              fontSize: "13px"
            }}
          >
            AV
          </div>
          <div style={{ textTransform: "none" }}>
            <span style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
              Alex Vance
            </span>
            <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)" }}>
              Enterprise Sales
            </span>
          </div>
          <ChevronDown size={14} color="var(--text-muted)" />
        </div>
      </div>
    </header>
  );
};
