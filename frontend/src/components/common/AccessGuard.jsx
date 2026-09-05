import React from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "../../services/auth";

/**
 * AccessGuard protects manager routes.
 * If the current user is not a sales manager, redirects to the main dashboard.
 */
export const AccessGuard = ({ children }) => {
  const user = getCurrentUser();
  if (user.role !== "sales_manager") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};
