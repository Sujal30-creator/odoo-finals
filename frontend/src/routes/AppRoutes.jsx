import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { DealsPage } from "../pages/DealsPage";
import { FinanceGuard } from "../components/common/FinanceGuard";
import { DealDetailsPage } from "../pages/DealDetailsPage";
import { CreateDealPage } from "../pages/CreateDealPage";
import { QuotationBuilderPage } from "../pages/QuotationBuilderPage";
import { QuotationsListPage } from "../pages/QuotationsListPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";
// Manager imports
import { AccessGuard } from "../components/common/AccessGuard";
import { ManagerDashboardPage } from "../pages/ManagerDashboardPage";
import { ManagerApprovalCenterPage } from "../pages/ManagerApprovalCenterPage";
import { ManagerApprovalDetailPage } from "../pages/ManagerApprovalDetailPage";
import { AdminGuard } from "../components/common/AdminGuard";
import { AdminDashboardPage } from "../pages/AdminDashboardPage";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { AdminUserDetailPage } from "../pages/AdminUserDetailPage";
import { AdminCustomersPage } from "../pages/AdminCustomersPage";
import { AdminProductsPage } from "../pages/AdminProductsPage";
import { AdminGovernancePage } from "../pages/AdminGovernancePage";
import { AdminActivityPage } from "../pages/AdminActivityPage";
import { FinanceOperationsDashboardPage } from "../pages/FinanceOperationsDashboardPage";
import { FinanceApprovalPage } from "../pages/FinanceApprovalPage";
import { FinanceApprovalDetailPage } from "../pages/FinanceApprovalDetailPage";
import { FulfillmentPage } from "../pages/FulfillmentPage";
import { FulfillmentDetailPage } from "../pages/FulfillmentDetailPage";
import { BillingPage } from "../pages/BillingPage";
import { FinanceAuditPage } from "../pages/FinanceAuditPage";
export const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>


        {/* Default */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ── Sales Rep implemented pages ── */}
        <Route path="/dashboard"      element={<DashboardPage />} />
        <Route path="/deals"          element={<DealsPage />} />
        <Route path="/deals/new"      element={<CreateDealPage />} />
        <Route path="/deals/:id"      element={<DealDetailsPage />} />
        <Route path="/quotations"     element={<QuotationsListPage />} />
        <Route path="/quotations/new" element={<QuotationBuilderPage />} />

        {/* ── Placeholder modules (other milestones) ── */}
        <Route path="/approvals" element={<AccessGuard><ManagerApprovalCenterPage /></AccessGuard>} />
        <Route path="/manager/approval/:id" element={<AccessGuard><ManagerApprovalDetailPage /></AccessGuard>} />
        <Route path="/fulfillment" element={
          <PlaceholderPage title="Warehouse Fulfillment" moduleName="Fulfillment & Order Allocation"
            description="Automatic multi-warehouse stock allocation, backorder handling, and shipment optimization." />
        } />
        <Route path="/deal-health" element={
          <PlaceholderPage title="Deal Health Dashboard" moduleName="Intelligence & Anomaly Detection"
            description="Monitor stalled deals, discount anomalies, delivery slippage alerts, and escalation nudges." />
        } />
        <Route path="/simulator/:id" element={
          <PlaceholderPage title="Discount Risk Simulator" moduleName="Discount & Margin Intelligence"
            description="Simulate discount scenarios, margin deltas, and automatic approval routing thresholds." />
        } />
        <Route path="/negotiation/:id" element={
          <PlaceholderPage title="Customer Negotiation Portal" moduleName="Customer Portal & Counter-Offers"
            description="Restricted portal for customer quote review, line comments, counter-offers, and re-approval triggers." />
        } />
        <Route path="/customer" element={
          <PlaceholderPage title="Customer Management" moduleName="Customer Tiers & Price Lists"
            description="Configure customer tiers, contract terms, discount limits, and credit ratings." />
        } />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboardPage /></AdminGuard>} />
        <Route path="/admin/users" element={<AdminGuard><AdminUsersPage /></AdminGuard>} />
        <Route path="/admin/users/:id" element={<AdminGuard><AdminUserDetailPage /></AdminGuard>} />
        <Route path="/admin/customers" element={<AdminGuard><AdminCustomersPage /></AdminGuard>} />
        <Route path="/admin/products" element={<AdminGuard><AdminProductsPage /></AdminGuard>} />
        <Route path="/admin/governance" element={<AdminGuard><AdminGovernancePage /></AdminGuard>} />
        <Route path="/admin/activity" element={<AdminGuard><AdminActivityPage /></AdminGuard>} />
        
        {/* Finance routes */}
        <Route path="/finance" element={<Navigate to="/finance/dashboard" replace />} />
        <Route path="/finance/dashboard" element={<FinanceGuard><FinanceOperationsDashboardPage /></FinanceGuard>} />
        <Route path="/finance/approvals" element={<FinanceGuard><FinanceApprovalPage /></FinanceGuard>} />
        <Route path="/finance/approvals/:id" element={<FinanceGuard><FinanceApprovalDetailPage /></FinanceGuard>} />
        <Route path="/finance/fulfillment" element={<FinanceGuard><FulfillmentPage /></FinanceGuard>} />
        <Route path="/finance/fulfillment/:id" element={<FinanceGuard><FulfillmentDetailPage /></FinanceGuard>} />
        <Route path="/finance/billing" element={<FinanceGuard><BillingPage /></FinanceGuard>} />
        <Route path="/finance/activity" element={<FinanceGuard><FinanceAuditPage /></FinanceGuard>} />
        {/* Manager routes removed (sales manager feature undone) */}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
