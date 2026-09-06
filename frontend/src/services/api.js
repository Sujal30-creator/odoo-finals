import apiClient from './apiClient';

export const api = {
  // Auth
  login: async ({ email, password }) => {
    const res = await apiClient.post('/api/auth/login', { email, password });
    return res.data;
  },
  register: async ({ name, email, password, role }) => {
    const res = await apiClient.post('/api/auth/register', { name, email, password, role });
    return res.data;
  },

  // Users
  getUsers: async () => {
    const res = await apiClient.get('/users');
    return res.data;
  },
  getUser: async (id) => {
    const res = await apiClient.get(`/users/${id}`);
    return res.data;
  },

  // Customers
  getCustomers: async () => {
    const res = await apiClient.get('/customers');
    return res.data;
  },
  getCustomer: async (id) => {
    const res = await apiClient.get(`/customers/${id}`);
    return res.data;
  },

  // Products
  getProducts: async () => {
    const res = await apiClient.get('/products');
    return res.data;
  },
  getProduct: async (id) => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data;
  },

  // Quotations
  getQuotations: async () => {
    const res = await apiClient.get('/api/quotations');
    return res.data;
  },
  getQuotation: async (id) => {
    const res = await apiClient.get(`/api/quotations/${id}`);
    return res.data;
  },
  createQuotation: async (data) => {
    const res = await apiClient.post('/api/quotations', data);
    return res.data;
  },
  addQuoteLine: async (id, lineData) => {
    const res = await apiClient.post(`/api/quotations/${id}/lines`, lineData);
    return res.data;
  },
  evaluateDiscount: async (id) => {
    const res = await apiClient.post(`/api/quotations/${id}/evaluate-discount`);
    return res.data;
  },
  submitApproval: async (id, userId) => {
    const res = await apiClient.post(`/api/quotations/${id}/submit-approval`, {
      requested_by_user_id: userId,
    });
    return res.data;
  },
  getDealHealth: async (id) => {
    const res = await apiClient.get(`/api/quotations/${id}/deal-health`);
    return res.data;
  },
  getRecommendations: async (id) => {
    const res = await apiClient.get(`/api/quotations/${id}/recommendations`);
    return res.data;
  },
  confirmQuotation: async (id) => {
    const res = await apiClient.post(`/api/quotations/${id}/confirm`);
    return res.data;
  },

  // Approvals
  getApprovals: async (status = null) => {
    const url = status ? `/api/approvals?status=${encodeURIComponent(status)}` : '/api/approvals';
    const res = await apiClient.get(url);
    return res.data;
  },
  processApproval: async (id, { user_id, action, reason = '' }) => {
    const res = await apiClient.post(`/api/approvals/${id}/action`, {
      user_id,
      action,
      reason,
    });
    return res.data;
  },

  // Orders
  getOrders: async () => {
    const res = await apiClient.get('/orders');
    return res.data;
  },
  getOrder: async (id) => {
    const res = await apiClient.get(`/orders/${id}`);
    return res.data;
  },

  // Warehouses & Inventory
  getWarehouses: async () => {
    const res = await apiClient.get('/warehouses');
    return res.data;
  },
  getInventory: async () => {
    const res = await apiClient.get('/inventory');
    return res.data;
  },

  // Fulfillment
  previewFulfillment: async (orderId) => {
    const res = await apiClient.post(`/api/orders/${orderId}/fulfillment/preview`);
    return res.data;
  },
  confirmFulfillment: async (orderId, manualAllocations = null) => {
    const payload = manualAllocations ? { manual_allocations: manualAllocations } : {};
    const res = await apiClient.post(`/api/orders/${orderId}/fulfillment`, payload);
    return res.data;
  },
  getFulfillmentStatus: async (orderId) => {
    const res = await apiClient.get(`/api/orders/${orderId}/fulfillment`);
    return res.data;
  },

  // Billing & Subscriptions
  generateBilling: async (orderId) => {
    const res = await apiClient.post(`/api/orders/${orderId}/billing`);
    return res.data;
  },
  getBillingStatus: async (orderId) => {
    const res = await apiClient.get(`/api/orders/${orderId}/billing`);
    return res.data;
  },
  updateSubscriptionQuantity: async (subscriptionId, newQuantity) => {
    const res = await apiClient.patch(`/api/subscriptions/${subscriptionId}/quantity`, {
      new_quantity: newQuantity,
    });
    return res.data;
  },

  // Customer Portal & Negotiations
  getPortalQuotations: async (customerId) => {
    const res = await apiClient.get('/api/portal/quotations', {
      headers: { 'X-Customer-Id': String(customerId) },
    });
    return res.data;
  },
  getPortalQuotation: async (id, customerId) => {
    const res = await apiClient.get(`/api/portal/quotations/${id}`, {
      headers: { 'X-Customer-Id': String(customerId) },
    });
    return res.data;
  },
  getPortalNegotiations: async (id, customerId) => {
    const res = await apiClient.get(`/api/portal/quotations/${id}/negotiations`, {
      headers: { 'X-Customer-Id': String(customerId) },
    });
    return res.data;
  },
  submitPortalNegotiation: async (id, customerId, { comment, proposed_discount_percent }) => {
    const res = await apiClient.post(
      `/api/portal/quotations/${id}/negotiate`,
      { comment, proposed_discount_percent: proposed_discount_percent !== '' && proposed_discount_percent !== null ? Number(proposed_discount_percent) : null },
      { headers: { 'X-Customer-Id': String(customerId) } }
    );
    return res.data;
  },
};

export default api;
