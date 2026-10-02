/**
 * Formatting and utility helpers for MuleTrace.
 */

export function formatINR(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(1)}Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(1)}L`;
  }
  if (val >= 1000) {
    return `₹${(val / 1000).toFixed(1)}K`;
  }
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const formatLakhs = formatINR;

export function formatFullINR(val: number): string {
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const formatCurrency = formatFullINR;

export function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    
    let hours = d.getUTCHours();
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedHours = String(hours).padStart(2, '0');

    return `${day}-${month}-${year} • ${formattedHours}:${minutes} ${ampm}`;
  } catch {
    return isoStr;
  }
}

export const formatDateTime = formatDate;


export function formatIndianDate(date: Date | string = new Date()): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '03 OCT 2026 · 00:09 IST';
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()] || 'OCT';
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} · ${hours}:${mins} IST`;
  } catch {
    return '03 OCT 2026 · 00:09 IST';
  }
}

export function formatIndianCurrency(val: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  }
}

export function maskAccountId(id: string): string {
  if (!id) return 'ACC-****0000';
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  const prefix = clean.startsWith('ACC') ? 'ACC' : clean.slice(0, 3) || 'ACC';
  const last4 = clean.slice(-4);
  return `${prefix}-****${last4}`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

