import type { Application, InstallmentPlan } from '../models/application.model';

/**
 * Compute customer-facing display fields for hide-interest deals.
 * Schedule amounts stay identical; only price/rate labels change.
 */
export function computeHideInterestDisplay(args: {
  sellingPrice: number;
  installmentPlan?: InstallmentPlan | null;
  internalAnnualRate?: number;
}): {
  customerDisplayPrice: number;
  customerDisplayRate: number;
  pricingSnapshot: Record<string, unknown>;
} {
  const sellingPrice = Number(args.sellingPrice) || 0;
  const plan = args.installmentPlan;
  const scheduleTotal =
    plan?.schedule?.reduce((s, row) => s + (Number(row.amount) || 0), 0) ?? 0;
  const downPayment = Number(plan?.downPayment) || 0;
  // All-in amount customer "buys" at 0%: down payment + remaining installments
  const totalPayable =
    scheduleTotal > 0 ? downPayment + scheduleTotal : Number(plan?.totalAmount) || sellingPrice;

  return {
    customerDisplayPrice: Math.round(totalPayable * 100) / 100,
    customerDisplayRate: 0,
    pricingSnapshot: {
      mode: 'hide_interest',
      sellingPrice,
      internalAnnualRate: args.internalAnnualRate ?? plan?.annualRentalRate ?? null,
      downPayment,
      scheduleTotal,
      totalPayable,
      computedAt: new Date().toISOString(),
    },
  };
}

/** Price shown to the end customer (respects hideInterest). */
export function getCustomerFacingPrice(app: Pick<
  Application,
  'hideInterest' | 'customerDisplayPrice' | 'sellingPrice' | 'loanAmount' | 'downPayment' | 'vehicle'
>): number {
  if (app.hideInterest && app.customerDisplayPrice != null) {
    return Number(app.customerDisplayPrice) || 0;
  }
  if (app.sellingPrice != null) return Number(app.sellingPrice) || 0;
  const vehiclePrice = Number(app.vehicle?.price) || 0;
  if (vehiclePrice > 0) return vehiclePrice;
  return (Number(app.loanAmount) || 0) + (Number(app.downPayment) || 0);
}

/** Rate % shown to the end customer (0 when hideInterest). */
export function getCustomerFacingRatePercent(app: Pick<
  Application,
  'hideInterest' | 'customerDisplayRate' | 'internalAnnualRate' | 'installmentPlan' | 'offer'
>): number {
  if (app.hideInterest) {
    return app.customerDisplayRate != null ? Number(app.customerDisplayRate) : 0;
  }
  if (app.internalAnnualRate != null) {
    const r = Number(app.internalAnnualRate);
    return r <= 1 ? r * 100 : r;
  }
  const planRate = app.installmentPlan?.annualRentalRate;
  if (planRate != null) {
    const r = Number(planRate);
    return r <= 1 ? r * 100 : r;
  }
  return Number(app.offer?.annualRentRate) || 0;
}
