import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import RoleGuard from './components/RoleGuard';

import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CreateQuotationPage from './pages/CreateQuotationPage';
import QuotationDetailPage from './pages/QuotationDetailPage';
import ApprovalCenterPage from './pages/ApprovalCenterPage';
import DealHealthPage from './pages/DealHealthPage';
import FulfillmentPage from './pages/FulfillmentPage';
import BillingPage from './pages/BillingPage';
import NegotiationPage from './pages/NegotiationPage';

function HomeRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user.role === 'customer') return <Navigate to="/portal" replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<AuthPage />} />

              {/* Protected Role-Based Routes */}
              <Route
                path="/"
                element={
                  <RoleGuard allowedRoles={['sales_rep', 'manager', 'finance', 'admin']}>
                    <HomeRedirect />
                  </RoleGuard>
                }
              />
              <Route path="/quotations" element={<Navigate to="/" replace />} />

              <Route
                path="/quotations/new"
                element={
                  <RoleGuard allowedRoles={['sales_rep', 'admin']}>
                    <CreateQuotationPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/quotations/:id"
                element={
                  <RoleGuard allowedRoles={['sales_rep', 'manager', 'finance', 'admin']}>
                    <QuotationDetailPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/approvals"
                element={
                  <RoleGuard allowedRoles={['manager', 'finance', 'admin']}>
                    <ApprovalCenterPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/deal-health"
                element={
                  <RoleGuard allowedRoles={['manager', 'sales_rep', 'finance', 'admin']}>
                    <DealHealthPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/fulfillment"
                element={
                  <RoleGuard allowedRoles={['finance', 'admin', 'manager']}>
                    <FulfillmentPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/billing"
                element={
                  <RoleGuard allowedRoles={['finance', 'admin']}>
                    <BillingPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/portal"
                element={
                  <RoleGuard allowedRoles={['customer', 'admin', 'sales_rep']}>
                    <NegotiationPage />
                  </RoleGuard>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
