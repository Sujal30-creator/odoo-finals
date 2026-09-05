import React from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";

/**
 * AdminGuard protects Admin routes. It renders its children only when the current user role is "admin".
 * Otherwise it redirects to the appropriate dashboard based on the user's role.
 */
export const AdminGuard = ({ children }) => {
  const user = getCurrentUser();
  const role = user?.role;

  if (role === "admin") {
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
  if (role === "finance_operations") {
    return <Navigate to="/finance/dashboard" replace />;
  }

  // Fallback – no user or unknown role
  return <Navigate to="/" replace />;
};
