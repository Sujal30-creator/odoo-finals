import React from 'react';

export function Card({ title, action, children, className = '', style = {} }) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || action) && (
        <div className="card-header">
          {title && <div className="card-title">{title}</div>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function MetricCard({ label, value, subtext, color = '', icon: Icon }) {
  return (
    <div className={`metric-card ${color}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="metric-label">{label}</span>
        {Icon && <Icon size={18} style={{ color: 'var(--text-muted)' }} />}
      </div>
      <div className="metric-value">{value}</div>
      {subtext && <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{subtext}</div>}
    </div>
  );
}
