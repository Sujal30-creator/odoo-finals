import React from 'react';

export function StatusBadge({ status, type = 'quotation' }) {
  const norm = String(status || '').toLowerCase();

  let badgeClass = 'badge-slate';
  let label = status || 'Draft';

  if (type === 'health') {
    if (norm === 'green') {
      badgeClass = 'badge-green';
      label = 'HEALTHY';
    } else if (norm === 'yellow') {
      badgeClass = 'badge-yellow';
      label = 'WARNING';
    } else if (norm === 'red') {
      badgeClass = 'badge-red';
      label = 'CRITICAL';
    }
  } else {
    switch (norm) {
      case 'approved':
        badgeClass = 'badge-green';
        label = 'Approved';
        break;
      case 'pending_approval':
      case 'pending':
        badgeClass = 'badge-yellow';
        label = 'Pending';
        break;
      case 'rejected':
        badgeClass = 'badge-red';
        label = 'Rejected';
        break;
      case 'draft':
        badgeClass = 'badge-blue';
        label = 'Draft';
        break;
      case 'processing':
        badgeClass = 'badge-blue';
        label = 'Processing';
        break;
      case 'paid':
        badgeClass = 'badge-green';
        label = 'PAID';
        break;
      case 'unpaid':
        badgeClass = 'badge-red';
        label = 'UNPAID';
        break;
      default:
        badgeClass = 'badge-slate';
        label = status;
    }
  }

  return <span className={`badge ${badgeClass}`}>{label}</span>;
}
