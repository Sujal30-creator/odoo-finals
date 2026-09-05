import React from "react";

export const Button = ({ children, variant = "primary", icon: Icon, onClick, size = "md", style, disabled }) => {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isOutline = variant === "outline";
  const isDanger = variant === "danger";

  let bg = "var(--primary)";
  let color = "#fff";
  let border = "none";

  if (isSecondary) {
    bg = "var(--bg-card-hover)";
    color = "var(--text-primary)";
    border = "1px solid var(--border-color)";
  } else if (isOutline) {
    bg = "transparent";
    color = "var(--text-primary)";
    border = "1px solid var(--border-color)";
  } else if (isDanger) {
    bg = "rgba(239, 68, 68, 0.2)";
    color = "#f87171";
    border = "1px solid rgba(239, 68, 68, 0.4)";
  }

  const padding = size === "sm" ? "6px 12px" : size === "lg" ? "12px 24px" : "9px 16px";
  const fontSize = size === "sm" ? "12px" : "13px";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding,
        fontSize,
        fontWeight: "600",
        borderRadius: "8px",
        backgroundColor: bg,
        color,
        border,
        transition: "all 0.15s ease",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style
      }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
};
