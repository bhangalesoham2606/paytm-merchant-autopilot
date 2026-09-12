/**
 * Deterministic business metrics calculation functions.
 * The backend is the single source of truth for all numerical calculations.
 */

export function roundTo(num: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

export function calculateATV(revenue: number, count: number): number {
  if (count <= 0 || revenue <= 0) return 0;
  return roundTo(revenue / count, 2);
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100; // 100% growth from 0 baseline
  }
  const change = ((current - previous) / previous) * 100;
  return roundTo(change, 2);
}

export function calculateSuccessRate(successful: number, total: number): number {
  if (total <= 0) return 0;
  return roundTo((successful / total) * 100, 1);
}
