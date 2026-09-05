import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { DealsPage } from "../pages/DealsPage";
import { DealDetailsPage } from "../pages/DealDetailsPage";
import { QuotationBuilderPage } from "../pages/QuotationBuilderPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Default route redirect to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Implemented Sales Rep Milestone Pages */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/deals/:id" element={<DealDetailsPage />} />
        <Route path="/quotations/new" element={<QuotationBuilderPage />} />
        <Route
          path="/approvals"
          element={
            <PlaceholderPage
              title="Approvals Center"
              moduleName="Approval Governance & Routing"
              description="Sales Manager and Finance VP sign-off interface for discount exceptions and risk approvals."
            />
          }
        />
        <Route
          path="/fulfillment"
          element={
            <PlaceholderPage
              title="Warehouse Fulfillment"
              moduleName="Fulfillment & Order Allocation"
              description="Automatic multi-warehouse stock allocation, backorder handling, and shipment optimization."
            />
          }
        />
        <Route
          path="/deal-health"
          element={
            <PlaceholderPage
              title="Deal Health Dashboard"
              moduleName="Intelligence & Anomaly Detection"
              description="Monitor stalled deals, discount anomalies, delivery slippage alerts, and escalation nudges."
            />
          }
        />
        <Route
          path="/simulator/:id"
          element={
            <PlaceholderPage
              title="Discount Risk Simulator"
              moduleName="Discount & Margin Intelligence"
              description="Simulate discount scenarios, margin deltas, and automatic approval routing thresholds."
            />
          }
        />
        <Route
          path="/negotiation/:id"
          element={
            <PlaceholderPage
              title="Customer Negotiation Portal"
              moduleName="Customer Portal & Counter-Offers"
              description="Restricted portal for customer quote review, line comments, counter-offers, and re-approval triggers."
            />
          }
        />
        <Route
          path="/customer"
          element={
            <PlaceholderPage
              title="Customer Management"
              moduleName="Customer Tiers & Price Lists"
              description="Configure customer tiers, contract terms, discount limits, and credit ratings."
            />
          }
        />
        <Route
          path="/admin"
          element={
            <PlaceholderPage
              title="Admin Console"
              moduleName="System & Governance Rules"
              description="Configure approval matrix rules, warehouse stock levels, product catalog, and user permissions."
            />
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
