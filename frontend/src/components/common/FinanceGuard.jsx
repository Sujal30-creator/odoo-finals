import React from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";

/**
 * FinanceGuard protects Finance/Operations routes.
 * It renders its children only when the current user role is
 * "finance_operations". Otherwise it redirects to the appropriate
 * dashboard for the user's role.
 */
export const FinanceGuard = ({ children }) => {
  const user = getCurrentUser();
  const role = user?.role;

  if (role === "finance_operations") {
    return <>{children}</>;
  }

  // Redirect based on role
  if (role === "sales_rep") {
    return <Navigate to="/dashboard" replace />;
  }
  if (role === "sales_manager") {
    return <Navigate to="/approvals" replace />;
  }
  if (role === "customer") {
    return <Navigate to="/customer/dashboard" replace />;
  }
  if (role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  // Fallback – no user or unknown role
  return <Navigate to="/" replace />;
};
