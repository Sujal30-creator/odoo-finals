import React from "react";

export const Card = ({ children, className = "", title, subtitle, action, style }) => {
  return (
    <div className={`glass-panel ${className}`} style={style}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            {title && <h3 style={{ fontSize: "16px", fontWeight: "600" }}>{title}</h3>}
            {subtitle && <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
