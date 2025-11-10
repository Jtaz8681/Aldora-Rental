import { format as dfFormat } from "date-fns";

/**
 * Format a currency amount as `$12.34`.
 * Accepts null/undefined and treats as 0.
 */
export function formatCurrency(amount: number | null | undefined): string {
  const n = Number(amount || 0);
  return `$${n.toFixed(2)}`;
}

/**
 * Format a date-only string using date-fns ('PPP').
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return dfFormat(new Date(date), "PPP");
}

/**
 * Format a date-time string using date-fns ('PPP p').
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return dfFormat(new Date(date), "PPP p");
}

/**
 * Ceil difference in days between start and end, minimum 1.
 */
export function daysBetween(start: string | Date, end: string | Date): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(d, 1);
}

/**
 * Round a number to 2 decimals.
 */
export function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100;
}