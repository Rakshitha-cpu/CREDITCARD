// Utility helpers for CREDITGUARD

export function formatINR(amount) {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINRCrore(amount) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  return formatINR(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function getUtilizationPct(outstanding, creditLimit) {
  if (!creditLimit) return 0;
  return Math.min(((outstanding / creditLimit) * 100), 999).toFixed(1);
}

export function getRiskColor(riskCategory) {
  switch (riskCategory) {
    case 'Low': return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
    case 'Medium': return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' };
    case 'High': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
  }
}

export function getStatusColor(status) {
  const map = {
    Active: { bg: 'bg-green-100', text: 'text-green-700' },
    Inactive: { bg: 'bg-gray-100', text: 'text-gray-600' },
    Paid: { bg: 'bg-green-100', text: 'text-green-700' },
    Unpaid: { bg: 'bg-blue-100', text: 'text-blue-700' },
    Overdue: { bg: 'bg-red-100', text: 'text-red-700' },
    Pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    Approved: { bg: 'bg-green-100', text: 'text-green-700' },
    Rejected: { bg: 'bg-red-100', text: 'text-red-700' },
    Allocated: { bg: 'bg-green-100', text: 'text-green-700' },
    Unallocated: { bg: 'bg-gray-100', text: 'text-gray-600' },
    Partial: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    Low: { bg: 'bg-green-100', text: 'text-green-700' },
    Medium: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    High: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  return map[status] || { bg: 'bg-gray-100', text: 'text-gray-600' };
}

export function getUtilizationLevel(pct) {
  const p = parseFloat(pct);
  if (p > 100) return { label: 'Limit Exceeded', color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-400' };
  if (p >= 100) return { label: 'Limit Reached', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300' };
  if (p >= 85) return { label: 'Critical Warning', color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-400' };
  if (p >= 70) return { label: 'Warning', color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-400' };
  return { label: 'Normal', color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-300' };
}

export function exportToCSV(data, filename) {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const csvContent = [
    keys.join(','),
    ...data.map(row => keys.map(k => `"${String(row[k] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
}

export function calculateRiskScore(customer) {
  let score = 0;
  const utilPct = parseFloat(getUtilizationPct(customer.outstanding, customer.creditLimit));
  if (utilPct >= 90) score += 35;
  else if (utilPct >= 70) score += 25;
  else if (utilPct >= 50) score += 15;
  else score += 5;

  if (customer.overdue > 0) {
    const overdueRatio = customer.overdue / customer.creditLimit;
    if (overdueRatio > 0.3) score += 35;
    else if (overdueRatio > 0.15) score += 20;
    else score += 10;
  }

  const behavior = customer.paymentBehavior;
  if (behavior === 'Poor') score += 20;
  else if (behavior === 'Fair') score += 10;
  else if (behavior === 'Good') score += 5;
  else score += 0;

  return Math.min(score, 100);
}

export function getRiskCategory(score) {
  if (score <= 20) return 'Low';
  if (score <= 50) return 'Medium';
  return 'High';
}

export function paginate(data, page, pageSize) {
  const start = (page - 1) * pageSize;
  return data.slice(start, start + pageSize);
}

export function sortData(data, key, direction) {
  return [...data].sort((a, b) => {
    const aVal = a[key]; const bVal = b[key];
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}
