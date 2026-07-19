import type { InsuranceRate, Promotion } from '../models';

/** Lightweight snake_case → camelCase (avoids importing supabase client). */
function toCamelRow(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== 'object') return {};
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    mapped[camelKey] = value;
  }
  return mapped;
}

/**
 * Map promotions DB row → UI model.
 * DB stores discount_percentage / discount_amount; UI uses discountType / discountValue.
 */
export function mapPromotionRow(row: unknown): Promotion {
  const base = toCamelRow(row);

  const pct = base.discountPercentage;
  const amt = base.discountAmount;

  if (pct !== undefined && pct !== null && pct !== '') {
    base.discountType = 'percentage';
    base.discountValue = Number(pct);
  } else if (amt !== undefined && amt !== null && amt !== '') {
    base.discountType = 'fixed';
    base.discountValue = Number(amt);
  }

  return base as unknown as Promotion;
}

/**
 * Map insurance_rates DB row → UI model.
 * DB column annual_rate_provider → providerRate (generic camelCase yields annualRateProvider).
 */
export function mapInsuranceRateRow(row: unknown): InsuranceRate {
  const base = toCamelRow(row);
  if (
    (base.providerRate === undefined || base.providerRate === null) &&
    base.annualRateProvider !== undefined &&
    base.annualRateProvider !== null
  ) {
    base.providerRate = Number(base.annualRateProvider);
  }
  return base as unknown as InsuranceRate;
}
