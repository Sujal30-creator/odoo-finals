import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext';
import { 
  Zap, 
  LayoutDashboard, 
  FilePlus2, 
  CheckSquare, 
  Truck, 
  Receipt, 
  MessageSquare,
  LogOut,
  User,
  ChevronDown,
  Activity
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, isAuthenticated, logout, switchUser } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Dynamic Navigation based on authenticated user's role
  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [{ to: '/login', label: 'Sign In', icon: User }];
    }

    if (user.role === 'customer') {
      return [
        { to: '/portal', label: 'My Customer Portal', icon: MessageSquare },
      ];
    }

    if (user.role === 'sales_rep') {
      return [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/quotations/new', label: 'Create Quote', icon: FilePlus2 },
        { to: '/deal-health', label: 'Deal Health', icon: Activity },
      ];
    }

    if (user.role === 'manager') {
      return [
        { to: '/', label: 'Team Dashboard', icon: LayoutDashboard },
        { to: '/approvals', label: 'Approval Center', icon: CheckSquare },
        { to: '/deal-health', label: 'Deal Health Scanner', icon: Activity },
      ];
    }

    if (user.role === 'finance') {
      return [
        { to: '/approvals', label: 'Finance Approvals', icon: CheckSquare },
        { to: '/billing', label: 'Billing & Subscriptions', icon: Receipt },
        { to: '/fulfillment', label: 'Fulfillment', icon: Truck },
      ];
    }

    // Admin has full access
    return [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/quotations/new', label: 'Create Quote', icon: FilePlus2 },
      { to: '/approvals', label: 'Approval Center', icon: CheckSquare },
      { to: '/deal-health', label: 'Deal Health', icon: Activity },
      { to: '/fulfillment', label: 'Fulfillment', icon: Truck },
      { to: '/billing', label: 'Billing', icon: Receipt },
      { to: '/portal', label: 'Customer Portal', icon: MessageSquare },
    ];
  };

  const navLinks = getNavLinks();

  const isCurrent = (path) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
      case 'manager':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'finance':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'customer':
        return { bg: 'rgba(14, 165, 233, 0.15)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)' };
      default:
        return { bg: 'rgba(79, 70, 229, 0.15)', text: '#818cf8', border: 'rgba(79, 70, 229, 0.3)' };
    }
  };

  const roleStyle = getRoleBadgeStyle(user?.role);

  return (
    <header className="header-bar">
      <div className="header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to={user?.role === 'customer' ? '/portal' : '/'} className="brand-badge">
            <div className="brand-icon">
              <Zap size={18} color="#fff" />
            </div>
            <span>DealFlow<span style={{ color: '#818cf8' }}>360</span></span>
          </Link>

          <nav className="nav-links">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isCurrent(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`nav-item ${active ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Session & Role Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setSwitcherOpen(!switcherOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {user.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: roleStyle.text,
                    }}
                  >
                    {user.role}
                  </div>
                </div>

                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: roleStyle.bg,
                    border: `1px solid ${roleStyle.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    color: roleStyle.text,
                    fontWeight: 800,
                  }}
                >
                  {user.name.charAt(0)}
                </div>

                <ChevronDown size={14} style={{ color: 'var(--text-subtle)' }} />
              </div>

              {/* Persona Quick Dropdown */}
              {switcherOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    width: 280,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    padding: 8,
                  }}
                >
                  <div style={{ padding: '8px 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Switch Demo Persona
                  </div>

                  {DEMO_PERSONAS.map((p) => {
                    const active = user.email === p.email;
                    return (
                      <div
                        key={p.email}
                        onClick={() => {
                          switchUser(p);
                          setSwitcherOpen(false);
                          if (p.role === 'customer') navigate('/portal');
                          else if (p.role === 'manager') navigate('/approvals');
                          else if (p.role === 'finance') navigate('/billing');
                          else navigate('/');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: active ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                          cursor: 'pointer',
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: active ? '#818cf8' : 'var(--text-main)' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {p.title}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 6, paddingTop: 6 }}>
                    <button
                      onClick={handleLogout}
                      className="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'flex-start', color: '#f87171' }}
                    >
                      <LogOut size={13} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              <User size={14} />
              <span>Sign In / Register</span>
            </Link>
          )}

          {isAuthenticated && (
            <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Log Out">
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
