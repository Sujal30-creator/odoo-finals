import {
  mockCustomers,
  mockProducts,
  mockDeals,
  mockQuotations,
  mockApprovals,
  mockActivityLogs
} from "../data/mockData";

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

export const apiService = {
  // Get enhanced dashboard metrics and business sections
  async getDashboardSummary() {
    await delay();
    const totalDeals = mockDeals.length;
    const totalQuotationValue = mockDeals.reduce((sum, d) => sum + d.amount, 0);
    const avgMarginPct = (
      mockDeals.reduce((sum, d) => sum + d.marginPct, 0) / totalDeals
    ).toFixed(1);

    const pendingApprovalsQueue = mockApprovals;
    const atRiskDealsWithReasons = mockDeals.filter(
      (d) => d.riskLevel === "High" || d.riskLevel === "Critical"
    );
    const stalledDeals = mockDeals.filter((d) => d.isStalled);

    const pipelineByStage = [
      { stage: "Draft", count: 1, value: 165000 },
      { stage: "Pending Approval", count: 1, value: 285000 },
      { stage: "In Negotiation", count: 1, value: 142500 },
      { stage: "Approved", count: 1, value: 98000 },
      { stage: "Confirmed", count: 1, value: 340000 },
      { stage: "Won", count: 1, value: 45000 }
    ];

    const actionRequiredItems = [
      { type: "approval", label: `${pendingApprovalsQueue.length} Quotations awaiting approval sign-off` },
      { type: "risk", label: `${atRiskDealsWithReasons.length} Deals with margin or discount policy exceptions` },
      { type: "stalled", label: `${stalledDeals.length} Deals stalled >7 days in stage requiring rep action` }
    ];

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
      recentDeals: mockDeals.slice(0, 5),
      activityFeed: mockActivityLogs
    };
  },

  // Get deals list with search, filter, and quick filters
  async getDeals({ search = "", status = "ALL", riskLevel = "ALL", quickFilter = "ALL" } = {}) {
    await delay();
    let filtered = [...mockDeals];

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

    if (status !== "ALL") {
      filtered = filtered.filter((d) => d.status === status);
    }

    if (riskLevel !== "ALL") {
      filtered = filtered.filter((d) => d.riskLevel === riskLevel);
    }

    if (quickFilter === "HIGH_DISCOUNT") {
      filtered = filtered.filter((d) => d.discountPct >= 20);
    } else if (quickFilter === "LOW_MARGIN") {
      filtered = filtered.filter((d) => d.marginPct < 35);
    } else if (quickFilter === "STALLED") {
      filtered = filtered.filter((d) => d.isStalled);
    } else if (quickFilter === "PENDING_APPROVAL") {
      filtered = filtered.filter((d) => d.status === "Pending Approval");
    }

    return filtered;
  },

  // Get single deal details
  async getDealById(id) {
    await delay();
    const deal = mockDeals.find((d) => d.id === id) || mockDeals[0];
    const quotation = mockQuotations.find((q) => q.dealId === deal.id) || mockQuotations[0];
    const approval = mockApprovals.find((a) => a.dealId === deal.id);
    const activities = mockActivityLogs.filter((a) => a.dealId === deal.id);

    return {
      ...deal,
      quotation,
      approval,
      activities
    };
  },

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
  }
};
