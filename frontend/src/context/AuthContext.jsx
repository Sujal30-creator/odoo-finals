import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const DEMO_PERSONAS = [
  {
    id: 2,
    name: 'Priya Sharma',
    email: 'priya.sharma@brightoffice.com',
    role: 'sales_rep',
    title: 'Sales Representative',
    description: 'Can create quotations, apply line discounts, evaluate discount governance, and submit for approval.',
    icon: '🚀',
  },
  {
    id: 4,
    name: 'Kavita Rao',
    email: 'kavita.rao@brightoffice.com',
    role: 'manager',
    title: 'Sales Operations Manager',
    description: 'Can review and approve/reject/return quotations, and scan deals for anomalies in Deal Health.',
    icon: '🛡️',
  },
  {
    id: 5,
    name: 'Suresh Iyer',
    email: 'suresh.iyer@brightoffice.com',
    role: 'finance',
    title: 'Finance & Billing Director',
    description: 'Can approve high-risk quotes (>10 risk), execute order billing, and manage subscription seat proration.',
    icon: '💰',
  },
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@brightoffice.com',
    role: 'admin',
    title: 'Executive Admin',
    description: 'Complete 360° platform access to all sales operations, approvals, fulfillment, and billing.',
    icon: '👑',
  },
  {
    id: 1,
    customer_id: 1,
    name: 'Nimbus Corp (Customer)',
    email: 'accounts@nimbuscorp.com',
    role: 'customer',
    title: 'Enterprise Customer',
    description: 'Customer Portal view: Review quotes, track orders, and submit counter-offer discount proposals.',
    icon: '🏢',
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('dealflow_auth_user');
      return saved ? JSON.parse(saved) : DEMO_PERSONAS[0]; // Default to Priya Sharma (Sales Rep)
    } catch {
      return DEMO_PERSONAS[0];
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('dealflow_auth_token') || 'demo-token';
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('dealflow_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dealflow_auth_user');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('dealflow_auth_token', token);
    } else {
      localStorage.removeItem('dealflow_auth_token');
    }
  }, [token]);

  const login = async ({ email, password }) => {
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ name, email, password, role }) => {
    setLoading(true);
    try {
      const res = await api.register({ name, email, password, role });
      setUser(res.user);
      setToken(res.token);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('dealflow_auth_user');
    localStorage.removeItem('dealflow_auth_token');
  };

  const switchUser = (newUser) => {
    setUser(newUser);
    setToken(`token-${newUser.role}-${newUser.id}`);
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return roles.flat().includes(user.role);
  };

  const isCustomer = user?.role === 'customer';
  const isSalesRep = user?.role === 'sales_rep';
  const isManager = user?.role === 'manager' || user?.role === 'sales_manager';
  const isFinance = user?.role === 'finance';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        switchUser,
        hasRole,
        isCustomer,
        isSalesRep,
        isManager,
        isFinance,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
