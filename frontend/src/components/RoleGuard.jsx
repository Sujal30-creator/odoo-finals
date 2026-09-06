import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext';
import { ArrowLeft, UserCheck, Lock } from 'lucide-react';
import { Card } from './Card';

export default function RoleGuard({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, hasRole, switchUser } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If role is customer, they should only view customer views (/portal) unless route is portal
  if (allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    const recommendedPersona = DEMO_PERSONAS.find((p) => allowedRoles.includes(p.role));

    return (
      <div style={{ maxWidth: 640, margin: '40px auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--rose)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Lock size={28} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>
              Role-Based Access Restricted
            </h2>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
              This operations view requires <strong>{allowedRoles.join(' or ')}</strong> permissions.
              You are currently logged in as:
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--bg-surface-elevated)',
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>👤</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Role: <span style={{ color: '#818cf8', fontWeight: 600 }}>{user.role}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link to={user.role === 'customer' ? '/portal' : '/'} className="btn btn-secondary">
                <ArrowLeft size={16} />
                <span>Return to My Dashboard</span>
              </Link>

              {recommendedPersona && (
                <button
                  onClick={() => switchUser(recommendedPersona)}
                  className="btn btn-primary"
                >
                  <UserCheck size={16} />
                  <span>Switch to {recommendedPersona.title}</span>
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return children;
}
