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

export function maskPII(text: string | null | undefined): string {
  if (!text) return 'N/A';
  const s = String(text).trim();
  if (s.length <= 4) return '••••';
  return `${s.slice(0, 2)}••••${s.slice(-2)}`;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
