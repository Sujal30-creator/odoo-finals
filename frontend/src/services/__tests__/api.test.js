import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, getDealHealthBadge, getQuotationStatusBadge, getApprovalStatusBadge } from '../adapters';
import { api } from '../api';
import apiClient, { API_BASE_URL } from '../apiClient';

describe('API Client Configuration', () => {
  it('should point to default port 8000 when no env override is provided', () => {
    expect(API_BASE_URL).toMatch(/localhost:8000|127\.0\.0\.1:8000/);
    expect(apiClient.defaults.baseURL).toBe(API_BASE_URL);
  });

  it('should have all 8 core flow API methods defined', () => {
    // Auth
    expect(typeof api.login).toBe('function');
    expect(typeof api.register).toBe('function');

    // Quotations & Discount Evaluation
    expect(typeof api.getQuotations).toBe('function');
    expect(typeof api.getQuotation).toBe('function');
    expect(typeof api.createQuotation).toBe('function');
    expect(typeof api.addQuoteLine).toBe('function');
    expect(typeof api.evaluateDiscount).toBe('function');
    expect(typeof api.submitApproval).toBe('function');

    // Approvals
    expect(typeof api.getApprovals).toBe('function');
    expect(typeof api.processApproval).toBe('function');

    // Deal Health
    expect(typeof api.getDealHealth).toBe('function');

    // Order & Fulfillment
    expect(typeof api.confirmQuotation).toBe('function');
    expect(typeof api.previewFulfillment).toBe('function');
    expect(typeof api.confirmFulfillment).toBe('function');
    expect(typeof api.getFulfillmentStatus).toBe('function');

    // Billing
    expect(typeof api.generateBilling).toBe('function');
    expect(typeof api.getBillingStatus).toBe('function');
    expect(typeof api.updateSubscriptionQuantity).toBe('function');

    // Portal Negotiation
    expect(typeof api.getPortalQuotations).toBe('function');
    expect(typeof api.getPortalQuotation).toBe('function');
    expect(typeof api.getPortalNegotiations).toBe('function');
    expect(typeof api.submitPortalNegotiation).toBe('function');
  });
});

describe('Adapters and Presentation Formatting', () => {
  it('should format currency accurately', () => {
    expect(formatCurrency(1250.5)).toBe('$1,250.50');
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(null)).toBe('$0.00');
  });

  it('should format percentage', () => {
    expect(formatPercent(15)).toBe('15.0%');
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('should map deal health correctly', () => {
    expect(getDealHealthBadge('green').label).toBe('HEALTHY');
    expect(getDealHealthBadge('yellow').label).toBe('AT RISK');
    expect(getDealHealthBadge('red').label).toBe('CRITICAL');
  });

  it('should map quotation and approval statuses', () => {
    expect(getQuotationStatusBadge('approved').label).toBe('Approved');
    expect(getQuotationStatusBadge('pending_approval').label).toBe('Pending Approval');
    expect(getApprovalStatusBadge('pending').label).toBe('Pending Action');
  });
});
