let currentUser = {
  id: "REP001",
  name: "Alex Sales",
  role: "sales_rep",
};

export const getCurrentUser = () => currentUser;

export const setCurrentUserRole = (role) => {
  if (role === "sales_rep" || role === "sales_manager" || role === "admin" || role === "customer" || role === "finance_operations") {
    currentUser = { ...currentUser, role };
  }
};

export const isSalesRep = (user) => user.role === "sales_rep";
export const isSalesManager = (user) => user.role === "sales_manager";
export const isAdmin = (user) => user.role === "admin";
