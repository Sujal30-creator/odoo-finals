/**
 * Pure calculation utilities for Quotation Builder with Commercial Health & Governance Intelligence
 */

/**
 * Calculates financial metrics for a single quotation line item
 */
export function calculateLineItem(product, qty = 1, discountPct = 0, taxRatePct = 18) {
  const quantity = Math.max(1, Number(qty) || 1);
  const listPrice = Number(product.price) || 0;
  const unitCost = Number(product.cost) || 0;
  const discount = Math.min(100, Math.max(0, Number(discountPct) || 0));

  const totalListPrice = listPrice * quantity;
  const discountAmount = totalListPrice * (discount / 100);
  const netPrice = totalListPrice - discountAmount;
  const taxAmount = netPrice * (taxRatePct / 100);
  const lineTotalWithTax = netPrice + taxAmount;

  const totalCost = unitCost * quantity;
  const lineProfit = netPrice - totalCost;
  const lineMarginPct = netPrice > 0 ? (lineProfit / netPrice) * 100 : 0;

  const categoryCap = product.discountCap || 15;
  const exceedsCategoryCap = discount > categoryCap;
  const capViolationDiff = exceedsCategoryCap ? discount - categoryCap : 0;

  let violationReason = null;
  if (exceedsCategoryCap) {
    violationReason = `${product.category} discount (${discount}%) exceeds category limit (${categoryCap}%) by ${capViolationDiff}%.`;
  }

  return {
    productId: product.id,
    quantity,
    listPrice,
    unitCost,
    discountPct: discount,
    categoryCap,
    totalListPrice,
    discountAmount,
    netPrice,
    taxAmount,
    lineTotalWithTax,
    totalCost,
    lineProfit,
    lineMarginPct: Number(lineMarginPct.toFixed(1)),
    exceedsCategoryCap,
    violationReason
  };
}

/**
 * Calculates overall quotation totals, commercial health, approval preview, and deal intelligence insights
 */
export function calculateQuotationTotals(lineItems = [], customer = null, globalTaxPct = 18) {
  let totalListPrice = 0;
  let totalDiscountAmount = 0;
  let totalNetPrice = 0;
  let totalTaxAmount = 0;
  let totalCost = 0;
  let categoryViolations = [];

  const processedLines = lineItems.map((line) => {
    const calc = calculateLineItem(
      line.product,
      line.quantity,
      line.discountPct,
      globalTaxPct
    );
    totalListPrice += calc.totalListPrice;
    totalDiscountAmount += calc.discountAmount;
    totalNetPrice += calc.netPrice;
    totalTaxAmount += calc.taxAmount;
    totalCost += calc.totalCost;
    if (calc.violationReason) {
      categoryViolations.push(calc.violationReason);
    }
    return {
      ...line,
      ...calc
    };
  });

  const finalTotal = totalNetPrice + totalTaxAmount;
  const overallProfit = totalNetPrice - totalCost;
  const blendedMarginPct = totalNetPrice > 0 ? (overallProfit / totalNetPrice) * 100 : 0;
  const effectiveDiscountPct = totalListPrice > 0 ? (totalDiscountAmount / totalListPrice) * 100 : 0;

  // Governance check
  const tierCap = customer?.tierDiscountCap || 15;
  const exceedsTierCap = effectiveDiscountPct > tierCap;
  const tierViolationDiff = exceedsTierCap ? Number((effectiveDiscountPct - tierCap).toFixed(1)) : 0;

  // Commercial Health Determination
  let commercialHealth = "HEALTHY";
  let healthLabel = "🟢 HEALTHY (Target Margin Met)";
  if (blendedMarginPct < 30) {
    commercialHealth = "HIGH_RISK";
    healthLabel = "🔴 HIGH RISK (Margin Critical)";
  } else if (blendedMarginPct < 40) {
    commercialHealth = "ATTENTION";
    healthLabel = "🟡 ATTENTION (Below 40% Target)";
  }

  // Governance Status & Approval Level
  let governanceStatus = "WITHIN_LIMIT";
  let requiredApproval = "AUTO_APPROVED";
  let governanceMessage = "Discount is within customer tier and category limits.";
  let primaryReason = "All line item discounts comply with policy thresholds.";
  let riskLevel = "Low";

  if (exceedsTierCap || categoryViolations.length > 0 || blendedMarginPct < 35) {
    if (effectiveDiscountPct > tierCap + 5 || blendedMarginPct < 30 || categoryViolations.length > 1) {
      governanceStatus = "EXCEEDS_LIMIT_CRITICAL";
      requiredApproval = "Finance VP";
      riskLevel = "High";
      governanceMessage = "Discount significantly exceeds allowed limit or creates high commercial risk.";
      if (categoryViolations.length > 0) {
        primaryReason = categoryViolations[0];
      } else if (exceedsTierCap) {
        primaryReason = `Applied discount (${effectiveDiscountPct}%) exceeds ${customer?.tier || "Tier"} limit (${tierCap}%) by ${tierViolationDiff}%.`;
      } else {
        primaryReason = `Blended margin (${blendedMarginPct.toFixed(1)}%) compressed below 30% minimum threshold.`;
      }
    } else {
      governanceStatus = "EXCEEDS_LIMIT_WARNING";
      requiredApproval = "Sales Manager";
      riskLevel = "Medium";
      governanceMessage = "Discount exceeds customer tier limit and requires Sales Manager approval.";
      primaryReason = exceedsTierCap
        ? `Applied discount (${effectiveDiscountPct}%) exceeds ${customer?.tier.split(" ")[0]} limit (${tierCap}%) by ${tierViolationDiff}%.`
        : `Line item discount exceeds category cap limit.`;
    }
  }

  // Approval Preview Object
  const approvalPreview = {
    requiredRole: requiredApproval,
    reason: primaryReason,
    riskLevel,
    expectedMargin: `${blendedMarginPct.toFixed(1)}%`
  };

  // Deterministic Intelligence Insights
  const hasHardware = processedLines.some((l) => l.product.category === "Hardware");
  const hasSupport = processedLines.some((l) => l.product.name.includes("Support"));

  const intelligenceInsights = [];

  if (effectiveDiscountPct > 15) {
    intelligenceInsights.push({
      type: "margin_alert",
      title: "Margin Compression Alert",
      text: `Current ${effectiveDiscountPct}% discount reduces expected margin by ${(effectiveDiscountPct * 0.4).toFixed(1)}%.`
    });
  }

  if (hasHardware && !hasSupport) {
    intelligenceInsights.push({
      type: "cross_sell",
      title: "Cross-sell Opportunity",
      text: "Hardware included without 24/7 Support Package. Adding support increases margin by +4%."
    });
  }

  intelligenceInsights.push({
    type: "benchmark",
    title: "Commercial Benchmark",
    text: `Similar ${customer?.tier.split(" ")[0] || "Enterprise"} deals close at an average discount of 15.0%.`
  });

  if (governanceStatus !== "WITHIN_LIMIT") {
    intelligenceInsights.push({
      type: "recommendation",
      title: "Recommended Action",
      text: `Reduce line discount by ${tierViolationDiff > 0 ? tierViolationDiff : 3}% or bundle Premium Support to achieve target 40% margin.`
    });
  } else {
    intelligenceInsights.push({
      type: "recommendation",
      title: "Recommended Action",
      text: "Quote is fully compliant. Proceed to Save Draft or Submit for Customer Delivery."
    });
  }

  return {
    processedLines,
    totalListPrice: Math.round(totalListPrice),
    totalDiscountAmount: Math.round(totalDiscountAmount),
    totalNetPrice: Math.round(totalNetPrice),
    totalTaxAmount: Math.round(totalTaxAmount),
    finalTotal: Math.round(finalTotal),
    blendedMarginPct: Number(blendedMarginPct.toFixed(1)),
    effectiveDiscountPct: Number(effectiveDiscountPct.toFixed(1)),
    tierCap,
    commercialHealth,
    healthLabel,
    governanceStatus,
    requiredApproval,
    governanceMessage,
    approvalPreview,
    intelligenceInsights
  };
}
