import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext';
import { Card } from '../components/Card';
import { 
  Zap, 
  LogIn, 
  UserPlus, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, switchUser, loading } = useAuth();

  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('priya.sharma@brightoffice.com');
  const [loginPassword, setLoginPassword] = useState('password123');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('sales_rep');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      const user = await login({ email: loginEmail, password: loginPassword });
      setSuccessMsg(`Welcome back, ${user.name}!`);
      // Redirect based on role
      if (user.role === 'customer') {
        navigate('/portal');
      } else if (user.role === 'manager') {
        navigate('/approvals');
      } else if (user.role === 'finance') {
        navigate('/billing');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.formattedMessage || 'Invalid email or password');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in all registration fields.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const user = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
      });
      setSuccessMsg(`Account created successfully! Welcome, ${user.name}.`);
      if (user.role === 'customer') {
        navigate('/portal');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.formattedMessage || 'Registration failed. Email may already be registered.');
    }
  };

  const handleQuickPersona = (persona) => {
    switchUser(persona);
    if (persona.role === 'customer') {
      navigate('/portal');
    } else if (persona.role === 'manager') {
      navigate('/approvals');
    } else if (persona.role === 'finance') {
      navigate('/billing');
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{ maxWidth: 1080, margin: '20px auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div className="brand-icon" style={{ width: 42, height: 42 }}>
            <Zap size={24} color="#fff" />
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            DealFlow<span style={{ color: '#818cf8' }}>360</span>
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 540, margin: '0 auto' }}>
          Intelligent, Self-Governing B2B Sales Operations Platform with Role-Based Access Control
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ maxWidth: 540, margin: '0 auto' }}>
          <AlertTriangle size={18} />
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ maxWidth: 540, margin: '0 auto' }}>
          <CheckCircle2 size={18} />
          <div>{successMsg}</div>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left: Login / Register Card */}
        <Card>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12, marginBottom: 20 }}>
            <button
              onClick={() => { setTab('login'); setError(null); }}
              className={`btn btn-sm ${tab === 'login' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => { setTab('register'); setError(null); }}
              className={`btn btn-sm ${tab === 'register' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
            >
              <UserPlus size={15} />
              <span>Create Account</span>
            </button>
          </div>

          {tab === 'login' ? (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@company.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 4 }}>
                  Demo default password: <code>password123</code>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
                <LogIn size={16} />
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name / Organization</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Alex Rivera"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="alex.rivera@brightoffice.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Account Role &amp; Perspective</label>
                <select
                  className="form-select"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                >
                  <option value="sales_rep">Sales Representative (Create Deals &amp; Quotes)</option>
                  <option value="manager">Sales Operations Manager (Approval Center &amp; Risk)</option>
                  <option value="finance">Finance &amp; Billing Director (Threshold Approvals &amp; Billing)</option>
                  <option value="customer">Customer Portal (View Terms &amp; Counter-Offer)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
                <UserPlus size={16} />
                <span>{loading ? 'Registering...' : 'Register New Account'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}
        </Card>

        {/* Right: Quick Demo Persona Switcher */}
        <Card title="Quick Demo Persona Switcher">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            For rapid evaluation, select any pre-configured role below to experience its specific views and authorized operations:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DEMO_PERSONAS.map((persona) => {
              return (
                <div
                  key={persona.email}
                  onClick={() => handleQuickPersona(persona)}
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 14,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(79, 70, 229, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'var(--bg-surface-elevated)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.6rem' }}>{persona.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{persona.name}</span>
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                          {persona.role}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {persona.description}
                      </div>
                    </div>
                  </div>

                  <ArrowRight size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Role Privileges Reference Table */}
      <Card title="Role-Based Operations Matrix">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Authorized Views</th>
                <th>Permitted Operations</th>
                <th>Enforced Restrictions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="badge badge-blue">sales_rep</span></td>
                <td>Dashboard, Create Quote, Quote Details</td>
                <td>Build lines, Apply discount, Run discount evaluation, Submit for approval</td>
                <td>Cannot approve deals in Approval Center</td>
              </tr>
              <tr>
                <td><span className="badge badge-yellow">manager</span></td>
                <td>Approval Center, Deal Health Scanner, Dashboard</td>
                <td>Approve / Reject / Request revision on pending quotations</td>
                <td>Cannot generate initial invoices or adjust subscriptions</td>
              </tr>
              <tr>
                <td><span className="badge badge-green">finance</span></td>
                <td>Approval Center (Finance tier), Billing, Fulfillment</td>
                <td>Approve risk &gt; 10 deals, Generate invoices, Prorate subscription seats</td>
                <td>Restricted from customer portal counter-negotiation</td>
              </tr>
              <tr>
                <td><span className="badge badge-slate">customer</span></td>
                <td>Customer Portal (`/portal`)</td>
                <td>Inspect quotation terms, submit comments &amp; counter-offers</td>
                <td>Cannot view internal costs, margins, or approval center</td>
              </tr>
              <tr>
                <td><span className="badge badge-slate">admin</span></td>
                <td>Full 360° Platform Access</td>
                <td>All sales, approval, fulfillment, and billing operations permitted</td>
                <td>None (Superuser)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
