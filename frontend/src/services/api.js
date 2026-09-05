import {
  mockCustomers,
  mockProducts,
  mockDeals,
  mockQuotations,
  mockApprovals,
  mockActivityLogs,
  mockPipelineSummary,
  mockRecentQuotations,
  mockDealIntelligence,
  mockAtRiskDeals,
  mockQuotationsFull,
  mockActivityLogsFull,
  mockMyWork,
  mockActionRequired
} from "../data/mockData";

const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── In-memory session stores ────────────────────────────────────────────────
// Components never touch mockData directly — all mutations go through these.
let _deals = [...mockDeals];
let _quotations = [...mockQuotationsFull];
let _activityLogs = [...mockActivityLogsFull];
let _nextDealNum = 400;
let _nextQuoteNum = 800;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nowTs() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" + String(d.getMonth() + 1).padStart(2, "0") +
    "-" + String(d.getDate()).padStart(2, "0") +
    " " + String(d.getHours()).padStart(2, "0") +
    ":" + String(d.getMinutes()).padStart(2, "0")
  );
}

function addActivity(dealId, quoteId, type, title, description) {
  const id = `act-dyn-${Date.now()}`;
  _activityLogs = [
    ..._activityLogs,
    { id, dealId, quoteId, type, title, description, timestamp: nowTs() }
  ];
}

// ─── Governance helper (mirrors calculations.js logic for api layer) ──────────
function deriveGovernance(effectiveDiscountPct, tierDiscountCap, blendedMarginPct, categoryViolations = []) {
  const tierCap = tierDiscountCap || 15;
  const exceedsTier = effectiveDiscountPct > tierCap;
  const tierDiff = exceedsTier ? Number((effectiveDiscountPct - tierCap).toFixed(1)) : 0;

  let requiredApproval = "AUTO_APPROVED";
  let governanceStatus = "WITHIN_LIMIT";
  let primaryReason = "All line item discounts comply with policy thresholds.";
  let riskLevel = "Low";

  if (exceedsTier || categoryViolations.length > 0 || blendedMarginPct < 35) {
    if (effectiveDiscountPct > tierCap + 5 || blendedMarginPct < 30 || categoryViolations.length > 1) {
      requiredApproval = "Finance VP";
      governanceStatus = "EXCEEDS_LIMIT_CRITICAL";
      riskLevel = "High";
      primaryReason =
        categoryViolations.length > 0
          ? categoryViolations[0]
          : exceedsTier
          ? `Applied discount (${effectiveDiscountPct}%) exceeds tier limit (${tierCap}%) by ${tierDiff}%.`
          : `Blended margin (${blendedMarginPct.toFixed(1)}%) below 30% minimum.`;
    } else {
      requiredApproval = "Sales Manager";
      governanceStatus = "EXCEEDS_LIMIT_WARNING";
      riskLevel = "Medium";
      primaryReason = exceedsTier
        ? `Applied discount (${effectiveDiscountPct}%) exceeds tier limit (${tierCap}%) by ${tierDiff}%.`
        : `Line item discount exceeds category cap.`;
    }
  }

  return { requiredApproval, governanceStatus, riskLevel, primaryReason, tierCap, tierDiff };
}

// ─── API Service ──────────────────────────────────────────────────────────────
export const apiService = {

  // ── Dashboard ──────────────────────────────────────────────────────────────
  async getDashboardSummary() {
    await delay();
    const totalDeals = _deals.length;
    const totalQuotationValue = _deals.reduce((sum, d) => sum + d.amount, 0);
    const avgMarginPct = (
      _deals.reduce((sum, d) => sum + d.marginPct, 0) / totalDeals
    ).toFixed(1);

    const pendingApprovalsQueue = mockApprovals;
    const atRiskDealsWithReasons = _deals.filter(
      (d) => d.riskLevel === "High" || d.riskLevel === "Critical"
    );
    const stalledDeals = _deals.filter((d) => d.isStalled);

    const pipelineByStage = [
      { stage: "Draft",           count: 1, value: 165000 },
      { stage: "Pending Approval",count: 1, value: 285000 },
      { stage: "In Negotiation",  count: 1, value: 142500 },
      { stage: "Approved",        count: 1, value: 98000  },
      { stage: "Confirmed",       count: 1, value: 340000 },
      { stage: "Won",             count: 1, value: 45000  }
    ];

    const actionRequiredItems = [
      { type: "approval", label: `${pendingApprovalsQueue.length} Quotations awaiting approval sign-off` },
      { type: "risk",     label: `${atRiskDealsWithReasons.length} Deals with margin or discount policy exceptions` },
      { type: "stalled",  label: `${stalledDeals.length} Deals stalled >7 days in stage requiring rep action` }
    ];

    // My Work counts derived from live _quotations store
    const myWork = {
      draftQuotations:  { count: _quotations.filter(q => q.status === "Draft").length },
      pendingApprovals: { count: _quotations.filter(q => q.status === "Pending Approval").length },
      approvedQuotes:   { count: _quotations.filter(q => q.status === "Approved" || q.status === "Won").length },
      changesRequested: { count: _quotations.filter(q => q.status === "Changes Requested").length },
      atRiskDeals:      { count: atRiskDealsWithReasons.length },
      closingSoon:      { count: _deals.filter(d => ["Approved", "Pending Approval"].includes(d.status)).length }
    };

    return {
      totalDeals,
      totalQuotationValue,
      avgMarginPct: Number(avgMarginPct),
      conversionWinRate: "68.5%",
      pendingApprovalsQueue,
      atRiskDealsWithReasons,
      stalledDeals,
      actionRequiredItems,
      pipelineByStage,
      recentDeals: _deals.slice(0, 5),
      activityFeed: _activityLogs.slice(-10).reverse(),
      pipelineSummary: mockPipelineSummary,
      recentQuotations: mockRecentQuotations,
      dealIntelligence: mockDealIntelligence,
      atRiskDeals: mockAtRiskDeals,
      myWork,
      actionRequired: mockActionRequired
    };
  },

  // ── Deals ──────────────────────────────────────────────────────────────────
  async getDeals({ search = "", status = "ALL", riskLevel = "ALL", quickFilter = "ALL" } = {}) {
    await delay();
    let filtered = [..._deals];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.customer.name.toLowerCase().includes(q) ||
          d.salesRep.toLowerCase().includes(q)
      );
    }
    if (status !== "ALL") filtered = filtered.filter((d) => d.status === status);
    if (riskLevel !== "ALL") filtered = filtered.filter((d) => d.riskLevel === riskLevel);

    if (quickFilter === "HIGH_DISCOUNT")    filtered = filtered.filter((d) => d.discountPct >= 20);
    else if (quickFilter === "LOW_MARGIN")  filtered = filtered.filter((d) => d.marginPct < 35);
    else if (quickFilter === "STALLED")     filtered = filtered.filter((d) => d.isStalled);
    else if (quickFilter === "PENDING_APPROVAL") filtered = filtered.filter((d) => d.status === "Pending Approval");

    return filtered;
  },

  async getDealById(id) {
    await delay();
    const deal = _deals.find((d) => d.id === id) || _deals[0];
    const quotation =
      _quotations.find((q) => q.dealId === deal.id) ||
      mockQuotations.find((q) => q.dealId === deal.id) ||
      mockQuotations[0];
    const approval = mockApprovals.find((a) => a.dealId === deal.id);
    const activities = _activityLogs
      .filter((a) => a.dealId === deal.id)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return { ...deal, quotation, approval, activities };
  },

  /**
   * createDeal — persists a new deal to in-memory store.
   * @param {object} fields - { title, customerId, salesRep, closeDate, stage, estimatedValue, priority, notes }
   * @returns {object} created deal
   */
  async createDeal(fields) {
    await delay(150);
    const customer = mockCustomers.find((c) => c.id === fields.customerId) || mockCustomers[0];
    const id = `deal-${_nextDealNum++}`;
    const now = new Date().toISOString().slice(0, 10);

    const newDeal = {
      id,
      title: fields.title,
      customer,
      amount: Number(fields.estimatedValue) || 0,
      discountPct: 0,
      marginPct: 0,
      status: fields.stage || "Draft",
      riskLevel: "Low",
      riskScore: 0,
      daysInStage: 0,
      closeDate: fields.closeDate || "",
      winProbability: 50,
      approvalStatus: "Draft",
      salesRep: fields.salesRep || "Alexander Vance",
      priority: fields.priority || "Medium",
      notes: fields.notes || "",
      createdAt: now,
      updatedAt: now,
      quoteId: null,
      isStalled: false,
      nextAction: "Create a quotation to begin the deal.",
      riskFactors: [],
      approvalChain: [
        { step: "Sales Rep Submission", role: `${fields.salesRep || "Sales Rep"}`, status: "DRAFT", date: "-" },
        { step: "Sales Manager Approval", role: "Sales Manager", status: "WAITING", date: "-" },
        { step: "Finance VP Sign-off", role: "Finance VP", status: "WAITING", date: "-" },
        { step: "Order Confirmation", role: "Customer & System", status: "WAITING", date: "-" }
      ]
    };

    _deals = [..._deals, newDeal];
    addActivity(id, null, "deal_created", "Deal Created", `${newDeal.salesRep} created deal: ${newDeal.title}.`);
    if (customer) {
      addActivity(id, null, "customer_selected", "Customer Selected", `${customer.name} (${customer.tier}) selected as account.`);
    }
    return newDeal;
  },

  /**
   * updateDeal — patch fields on an existing deal.
   */
  async updateDeal(id, fields) {
    await delay(100);
    _deals = _deals.map((d) => {
      if (d.id !== id) return d;
      return { ...d, ...fields, updatedAt: new Date().toISOString().slice(0, 10) };
    });
    return _deals.find((d) => d.id === id);
  },

  // ── Quotations ─────────────────────────────────────────────────────────────
  async getQuotations({ search = "", status = "ALL" } = {}) {
    await delay();
    let filtered = [..._quotations];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (qt) =>
          qt.id.toLowerCase().includes(q) ||
          qt.customerName.toLowerCase().includes(q) ||
          (qt.dealTitle || "").toLowerCase().includes(q)
      );
    }
    if (status !== "ALL") filtered = filtered.filter((qt) => qt.status === status);

    return filtered.sort((a, b) => b.updatedDate.localeCompare(a.updatedDate));
  },

  async getQuotationById(id) {
    await delay();
    return _quotations.find((q) => q.id === id) || null;
  },

  /**
   * createQuotation — create a new quotation record linked to a deal.
   */
  async createQuotation(fields) {
    await delay(150);
    const id = `q-${_nextQuoteNum++}`;
    const now = new Date().toISOString().slice(0, 10);
    const customer = mockCustomers.find((c) => c.id === fields.customerId) || mockCustomers[0];

    const newQuote = {
      id,
      dealId: fields.dealId || null,
      dealTitle: fields.dealTitle || "",
      customerId: customer.id,
      customerName: customer.name,
      salesRep: fields.salesRep || "Alexander Vance",
      status: "Draft",
      approvalRequired: fields.approvalRequired || "AUTO_APPROVED",
      totalListPrice: fields.totalListPrice || 0,
      totalDiscount: fields.totalDiscount || 0,
      netTotal: fields.netTotal || 0,
      taxAmount: fields.taxAmount || 0,
      finalTotal: fields.finalTotal || 0,
      blendedMarginPct: fields.blendedMarginPct || 0,
      effectiveDiscountPct: fields.effectiveDiscountPct || 0,
      version: 1,
      createdDate: now,
      updatedDate: now,
      notes: fields.notes || "",
      lines: fields.lines || []
    };

    _quotations = [..._quotations, newQuote];

    if (fields.dealId) {
      addActivity(fields.dealId, id, "quote_created", "Quotation Created",
        `Quotation ${id} created. Net total: $${newQuote.netTotal.toLocaleString()}.`);
      // Link quoteId back to deal
      _deals = _deals.map((d) => d.id === fields.dealId ? { ...d, quoteId: id } : d);
    }

    return newQuote;
  },

  /**
   * updateQuotation — patch an existing quotation with new fields/lines.
   */
  async updateQuotation(id, fields) {
    await delay(100);
    _quotations = _quotations.map((q) => {
      if (q.id !== id) return q;
      return { ...q, ...fields, updatedDate: new Date().toISOString().slice(0, 10) };
    });
    const updated = _quotations.find((q) => q.id === id);
    if (updated?.dealId) {
      addActivity(updated.dealId, id, "quote_updated", "Quotation Updated",
        `Quotation ${id} updated. Net total: $${(updated.netTotal || 0).toLocaleString()}.`);
    }
    return updated;
  },

  /**
   * saveQuotationDraft — save current builder state as Draft.
   * Creates a new quote if no id supplied, else updates existing.
   */
  async saveQuotationDraft(id, fields) {
    await delay(120);
    let quote;

    if (id) {
      // Update existing
      _quotations = _quotations.map((q) => {
        if (q.id !== id) return q;
        return { ...q, ...fields, status: "Draft", updatedDate: new Date().toISOString().slice(0, 10) };
      });
      quote = _quotations.find((q) => q.id === id);
    } else {
      // Create new draft
      quote = await this.createQuotation({ ...fields, status: "Draft" });
    }

    if (quote?.dealId) {
      addActivity(quote.dealId, quote.id, "quote_saved", "Draft Saved",
        `Quotation ${quote.id} saved as draft. Net total: $${(quote.netTotal || 0).toLocaleString()}.`);
    }

    return quote;
  },

  /**
   * submitQuotationForApproval — run governance checks and change status to Pending Approval.
   * Also logs the submission activity.
   */
  async submitQuotationForApproval(id, fields) {
    await delay(200);
    const customer = mockCustomers.find((c) => c.id === fields.customerId) || mockCustomers[0];
    const gov = deriveGovernance(
      fields.effectiveDiscountPct || 0,
      customer?.tierDiscountCap || 15,
      fields.blendedMarginPct || 0,
      fields.categoryViolations || []
    );

    const newStatus = "Pending Approval";

    if (id) {
      _quotations = _quotations.map((q) => {
        if (q.id !== id) return q;
        return {
          ...q,
          ...fields,
          status: newStatus,
          approvalRequired: gov.requiredApproval,
          updatedDate: new Date().toISOString().slice(0, 10)
        };
      });
    } else {
      // Create + immediately submit
      const newQ = await this.createQuotation({
        ...fields,
        approvalRequired: gov.requiredApproval
      });
      id = newQ.id;
      _quotations = _quotations.map((q) =>
        q.id === id ? { ...q, status: newStatus } : q
      );
    }

    const quote = _quotations.find((q) => q.id === id);

    if (quote?.dealId) {
      // Update deal status to Pending Approval
      _deals = _deals.map((d) =>
        d.id === quote.dealId
          ? { ...d, status: "Pending Approval", approvalStatus: `Pending ${gov.requiredApproval} Approval`, updatedAt: new Date().toISOString().slice(0, 10) }
          : d
      );
      addActivity(
        quote.dealId, id, "submitted",
        "Submitted for Approval",
        `Quotation ${id} submitted for ${gov.requiredApproval} approval. ${gov.primaryReason}`
      );
    }

    return { quote: _quotations.find((q) => q.id === id), governance: gov };
  },

  // ── Customers / Products / Approvals ──────────────────────────────────────
  async getCustomers() {
    await delay();
    return mockCustomers;
  },

  async getProducts() {
    await delay();
    return mockProducts;
  },

  async getApprovals() {
    await delay();
    return mockApprovals;
  },

  // ── Manager Approval API ───────────────────────────────────────────────────────
  // Returns quotations that require Sales Manager approval (status Pending Approval)
  async getManagerApprovals() {
    await delay();
    // Filter quotations where approvalRequired is 'Sales Manager' and status is Pending Approval
    return _quotations.filter(q => q.approvalRequired === 'Sales Manager' && q.status === 'Pending Approval');
  },

  // Get detailed quotation by ID for manager review
  async getManagerApprovalById(id) {
    await delay();
    return _quotations.find(q => q.id === id);
  },

  // Helper to log manager actions in activity logs
  _logManagerAction({ quotationId, dealId, action, managerName, previousStatus, newStatus, comment }) {
    const activity = {
      id: `act-mgr-${Date.now()}`,
      quotationId,
      dealId,
      type: 'approval',
      title: `${action} by ${managerName}`,
      description: comment ? `${action} - ${comment}` : `${action}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      manager: managerName,
      previousStatus,
      newStatus,
      comment: comment || ''
    };
    _activityLogs = [..._activityLogs, activity];
    return activity;
  },

  // Approve a quotation
  async approveQuotation(id, managerName) {
    await delay();
    const quote = _quotations.find(q => q.id === id);
    if (!quote) throw new Error('Quotation not found');
    // Business rule: manager cannot approve own quotation
    if (quote.salesRep === managerName) {
      throw new Error('Manager cannot approve their own quotation');
    }
    if (quote.approvalRequired !== 'Sales Manager' || quote.status !== 'Pending Approval') {
      throw new Error('Quotation not eligible for manager approval');
    }
    const previousStatus = quote.status;
    quote.status = 'Approved';
    quote.approvalRequired = 'Auto-Approved';
    this._logManagerAction({
      quotationId: id,
      dealId: quote.dealId,
      action: 'Approve',
      managerName,
      previousStatus,
      newStatus: quote.status,
      comment: ''
    });
    return quote;
  },

  // Reject a quotation with reason
  async rejectQuotation(id, managerName, reason) {
    await delay();
    const quote = _quotations.find(q => q.id === id);
    if (!quote) throw new Error('Quotation not found');
    if (quote.approvalRequired !== 'Sales Manager' || quote.status !== 'Pending Approval') {
      throw new Error('Quotation not eligible for manager rejection');
    }
    const previousStatus = quote.status;
    quote.status = 'Rejected';
    this._logManagerAction({
      quotationId: id,
      dealId: quote.dealId,
      action: 'Reject',
      managerName,
      previousStatus,
      newStatus: quote.status,
      comment: reason
    });
    return quote;
  },

  // Request changes with manager comment
  async requestQuotationChanges(id, managerName, comment) {
    await delay();
    const quote = _quotations.find(q => q.id === id);
    if (!quote) throw new Error('Quotation not found');
    if (quote.approvalRequired !== 'Sales Manager' || quote.status !== 'Pending Approval') {
      throw new Error('Quotation not eligible for change request');
    }
    const previousStatus = quote.status;
    quote.status = 'Changes Requested';
    this._logManagerAction({
      quotationId: id,
      dealId: quote.dealId,
      action: 'Request Changes',
      managerName,
      previousStatus,
      newStatus: quote.status,
      comment
    });
    return quote;
  },

  // Retrieve audit/history for a quotation
  async getApprovalHistory(quotationId) {
    await delay();
    return _activityLogs.filter(a => a.quotationId === quotationId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },

  // ── Customers / Products / Approvals ──────────────────────────────────────

  // ── Activity logs ──────────────────────────────────────────────────────────
  async getActivityLogs(dealId) {
    await delay();
    return _activityLogs
      .filter((a) => a.dealId === dealId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
};
