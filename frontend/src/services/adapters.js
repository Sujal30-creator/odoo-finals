export function formatCurrency(amount) {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val);
}

export function formatPercent(val) {
  const num = Number(val) || 0;
  return `${num.toFixed(1)}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(dateStr);
  }
}

export function getQuotationStatusBadge(status) {
  const norm = String(status || '').toLowerCase();
  switch (norm) {
    case 'draft':
      return { label: 'Draft', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' };
    case 'pending_approval':
      return { label: 'Pending Approval', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800' };
    case 'approved':
      return { label: 'Approved', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800' };
    case 'rejected':
      return { label: 'Rejected', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800' };
    case 'lost':
      return { label: 'Lost', bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-300 dark:border-zinc-700' };
    default:
      return { label: status || 'Unknown', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
  }
}

export function getApprovalStatusBadge(status) {
  const norm = String(status || '').toLowerCase();
  switch (norm) {
    case 'pending':
      return { label: 'Pending Action', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800' };
    case 'approved':
      return { label: 'Approved', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800' };
    case 'rejected':
      return { label: 'Rejected', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800' };
    case 'returned':
      return { label: 'Returned for Revision', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800' };
    default:
      return { label: status || 'Pending', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
  }
}

export function getDealHealthBadge(health) {
  const norm = String(health || 'green').toLowerCase();
  switch (norm) {
    case 'green':
      return { label: 'HEALTHY', dotColor: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'yellow':
      return { label: 'AT RISK', dotColor: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'red':
      return { label: 'CRITICAL', dotColor: 'bg-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' };
    default:
      return { label: 'UNKNOWN', dotColor: 'bg-slate-500', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
  }
}

export function getSeverityBadge(severity) {
  const norm = String(severity || '').toLowerCase();
  if (norm === 'critical') {
    return { label: 'CRITICAL', bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-800' };
  }
  return { label: 'WARNING', bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-800' };
}
