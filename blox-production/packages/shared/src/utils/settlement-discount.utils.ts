import moment from 'moment';
import type { PaymentSchedule, Application } from '../models/application.model';
import type { SettlementDiscountSettings, TieredDiscount, SettlementDiscountCalculation } from '../models/settlement-discount.model';
import { calculateOwnership } from './ownership.utils';
import { parseTenureToMonths } from './tenure.utils';

/**
 * Calculate how many months into the loan the settlement is happening
 * @param application - The application with loan start date
 * @param settlementDate - Date when customer is settling
 * @returns Number of months into the loan (0 = first month)
 */
export function calculateMonthsIntoLoan(
  application: Application,
  settlementDate: string | Date
): number {
  // Get loan start date from application created_at or first payment due date
  const allPayments = application.installmentPlan?.schedule || [];
  const firstPayment = allPayments.length > 0 ? allPayments[0] : null;
  
  let loanStartDate: moment.Moment;
  if (firstPayment && firstPayment.dueDate) {
    // Loan typically starts 1 month before first payment
    loanStartDate = moment(firstPayment.dueDate).subtract(1, 'month');
  } else if (application.createdAt) {
    loanStartDate = moment(application.createdAt);
  } else {
    // Fallback to settlement date if no other date available
    loanStartDate = moment(settlementDate);
  }

  const settlementMoment = moment(settlementDate);
  const monthsIntoLoan = Math.max(0, settlementMoment.diff(loanStartDate, 'months', true));
  
  return Math.round(monthsIntoLoan * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate how many months early the customer is paying
 * @param application - The application with loan tenure
 * @param settlementDate - Date when customer is settling
 * @returns Number of months early (total tenure - months into loan)
 */
export function calculateMonthsEarlyPayment(
  application: Application,
  settlementDate: string | Date
): number {
  const tenureStr = application.installmentPlan?.tenure || '12 Months';
  const totalTenureMonths = parseTenureToMonths(tenureStr);
  const monthsIntoLoan = calculateMonthsIntoLoan(application, settlementDate);
  
  // Months early = total tenure - months into loan
  // Must be at least 1 month early to qualify
  const monthsEarly = Math.max(0, totalTenureMonths - monthsIntoLoan);
  
  return Math.round(monthsEarly * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate how many months early a settlement is (for backward compatibility)
 * @param settlementDate - Date when customer is settling
 * @param remainingPayments - Array of remaining payment schedules
 * @returns Object with monthsEarly (based on last payment)
 */
export function calculateMonthsEarly(
  settlementDate: string | Date,
  remainingPayments: PaymentSchedule[]
): { monthsEarly: number } {
  if (!remainingPayments || remainingPayments.length === 0) {
    return { monthsEarly: 0 };
  }

  const settlementMoment = moment(settlementDate);
  
  // Calculate months early based on last payment due date
  const lastPayment = remainingPayments[remainingPayments.length - 1];
  const lastPaymentDate = moment(lastPayment.dueDate);
  const monthsEarly = Math.max(0, lastPaymentDate.diff(settlementMoment, 'months', true));

  return {
    monthsEarly: Math.round(monthsEarly * 10) / 10 // Round to 1 decimal
  };
}

/**
 * Calculate principal and interest amounts from remaining payments
 * @param application - The application with payment schedule
 * @param remainingPayments - Array of remaining unpaid payments
 * @returns Object with totalPrincipal and totalInterest
 */
export function calculatePrincipalAndInterest(
  application: Application,
  remainingPayments: PaymentSchedule[]
): { totalPrincipal: number; totalInterest: number } {
  const vehiclePrice = application.vehicle?.price || 0;
  const downPayment = application.downPayment || 0;
  const tenureStr = application.installmentPlan?.tenure || '12 Months';
  
  // Parse tenure to months using utility function
  const tenureMonths = parseTenureToMonths(tenureStr);

  const loanAmount = vehiclePrice - downPayment;
  const principalPerMonth = tenureMonths > 0 ? loanAmount / tenureMonths : 0;
  
  // Get annual rental rate from offer or default
  const annualRentalRate = application.offer?.annualRentRate || 0.12; // Default 12%
  const rentPerPeriodRate = annualRentalRate / 12;

  let totalPrincipal = 0;
  let totalInterest = 0;

  // Find the index of the first remaining payment
  const allPayments = application.installmentPlan?.schedule || [];
  const firstRemainingIndex = allPayments.findIndex(
    p => p.dueDate === remainingPayments[0]?.dueDate
  );

  remainingPayments.forEach((payment, index) => {
    const paymentIndex = firstRemainingIndex >= 0 ? firstRemainingIndex + index : index;
    
    // Calculate principal (same for each payment)
    const principal = principalPerMonth;
    totalPrincipal += principal;

    // Calculate interest/rent based on Blox ownership at this point
    const { bloxOwnership } = calculateOwnership(
      vehiclePrice,
      downPayment,
      tenureMonths,
      paymentIndex
    );
    
    const interest = bloxOwnership * rentPerPeriodRate;
    totalInterest += interest;
  });

  return {
    totalPrincipal: Math.round(totalPrincipal * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100
  };
}

/**
 * Calculate settlement discount based on settings and early settlement
 * @param application - The application
 * @param remainingPayments - Remaining unpaid payments
 * @param settings - Discount settings
 * @param settlementDate - Date when settlement is happening (defaults to today)
 * @returns SettlementDiscountCalculation
 */
export function calculateSettlementDiscount(
  application: Application,
  remainingPayments: PaymentSchedule[],
  settings: SettlementDiscountSettings,
  settlementDate: string | Date = new Date()
): SettlementDiscountCalculation {
  // 1. Calculate months into loan (when they're settling relative to loan start)
  const monthsIntoLoan = calculateMonthsIntoLoan(application, settlementDate);
  
  // 2. Calculate months early (how many months early they're paying)
  const monthsEarly = calculateMonthsEarlyPayment(application, settlementDate);

  // 3. Calculate principal and interest totals
  const { totalPrincipal, totalInterest } = calculatePrincipalAndInterest(application, remainingPayments);
  const originalTotal = totalPrincipal + totalInterest;

  // 4. Check eligibility - must be at least 1 month early
  if (monthsEarly < 1) {
    return {
      originalPrincipal: totalPrincipal,
      originalInterest: totalInterest,
      originalTotal,
      principalDiscount: 0,
      interestDiscount: 0,
      totalDiscount: 0,
      discountedPrincipal: totalPrincipal,
      discountedInterest: totalInterest,
      finalAmount: originalTotal,
      monthsEarly,
      monthsIntoLoan,
      settlementDate: moment(settlementDate).toISOString(),
      settings
    };
  }

  // 5. Check other eligibility criteria
  if (originalTotal < settings.minSettlementAmount) {
    return {
      originalPrincipal: totalPrincipal,
      originalInterest: totalInterest,
      originalTotal,
      principalDiscount: 0,
      interestDiscount: 0,
      totalDiscount: 0,
      discountedPrincipal: totalPrincipal,
      discountedInterest: totalInterest,
      finalAmount: originalTotal,
      monthsEarly,
      monthsIntoLoan,
      settlementDate: moment(settlementDate).toISOString(),
      settings
    };
  }

  if (remainingPayments.length < settings.minRemainingPayments) {
    return {
      originalPrincipal: totalPrincipal,
      originalInterest: totalInterest,
      originalTotal,
      principalDiscount: 0,
      interestDiscount: 0,
      totalDiscount: 0,
      discountedPrincipal: totalPrincipal,
      discountedInterest: totalInterest,
      finalAmount: originalTotal,
      monthsEarly,
      monthsIntoLoan,
      settlementDate: moment(settlementDate).toISOString(),
      settings
    };
  }

  if (!settings.isActive) {
    return {
      originalPrincipal: totalPrincipal,
      originalInterest: totalInterest,
      originalTotal,
      principalDiscount: 0,
      interestDiscount: 0,
      totalDiscount: 0,
      discountedPrincipal: totalPrincipal,
      discountedInterest: totalInterest,
      finalAmount: originalTotal,
      monthsEarly,
      monthsIntoLoan,
      settlementDate: moment(settlementDate).toISOString(),
      settings
    };
  }

  // 6. Determine which tier to use (based on months early)
  let applicableTier: TieredDiscount | null = null;
  if (settings.tieredDiscounts && settings.tieredDiscounts.length > 0) {
    applicableTier = settings.tieredDiscounts.find(tier => {
      // Support both old format (minMonthsIntoLoan) and new format (minMonthsEarly)
      const minThreshold = tier.minMonthsEarly !== undefined 
        ? tier.minMonthsEarly 
        : (tier.minMonthsIntoLoan !== undefined ? tier.minMonthsIntoLoan : 1);
      const maxThreshold = tier.maxMonthsEarly !== undefined 
        ? tier.maxMonthsEarly 
        : (tier.maxMonthsIntoLoan !== undefined ? tier.maxMonthsIntoLoan : undefined);
      
      return monthsEarly >= minThreshold && 
             (maxThreshold === undefined || maxThreshold === null || monthsEarly <= maxThreshold);
    }) || null;
  }

  // 5. Calculate discounts
  let principalDiscount = 0;
  let interestDiscount = 0;

  if (applicableTier) {
    // Use tiered discount based on months early
    if (applicableTier.principalDiscountType === 'percentage') {
      principalDiscount = totalPrincipal * (applicableTier.principalDiscount / 100);
    } else {
      principalDiscount = applicableTier.principalDiscount;
    }

    if (applicableTier.interestDiscountType === 'percentage') {
      interestDiscount = totalInterest * (applicableTier.interestDiscount / 100);
    } else {
      interestDiscount = applicableTier.interestDiscount;
    }
  } else {
    // Use flat discount
    if (settings.principalDiscountEnabled) {
      if (settings.principalDiscountType === 'percentage') {
        principalDiscount = totalPrincipal * (settings.principalDiscountValue / 100);
      } else {
        principalDiscount = settings.principalDiscountValue;
      }
    }

    if (settings.interestDiscountEnabled) {
      if (settings.interestDiscountType === 'percentage') {
        interestDiscount = totalInterest * (settings.interestDiscountValue / 100);
      } else {
        interestDiscount = settings.interestDiscountValue;
      }
    }
  }

  // 6. Apply maximum caps
  const totalDiscount = principalDiscount + interestDiscount;

  if (settings.maxDiscountAmount && totalDiscount > settings.maxDiscountAmount) {
    // Scale down proportionally
    const scale = settings.maxDiscountAmount / totalDiscount;
    principalDiscount *= scale;
    interestDiscount *= scale;
  }

  if (settings.maxDiscountPercentage) {
    const maxDiscountByPercentage = originalTotal * (settings.maxDiscountPercentage / 100);
    if (totalDiscount > maxDiscountByPercentage) {
      const scale = maxDiscountByPercentage / totalDiscount;
      principalDiscount *= scale;
      interestDiscount *= scale;
    }
  }

  // 7. Return calculation
  return {
    originalPrincipal: totalPrincipal,
    originalInterest: totalInterest,
    originalTotal: originalTotal,
    principalDiscount: Math.round(principalDiscount * 100) / 100,
    interestDiscount: Math.round(interestDiscount * 100) / 100,
    totalDiscount: Math.round((principalDiscount + interestDiscount) * 100) / 100,
    discountedPrincipal: Math.round((totalPrincipal - principalDiscount) * 100) / 100,
    discountedInterest: Math.round((totalInterest - interestDiscount) * 100) / 100,
    finalAmount: Math.round((originalTotal - principalDiscount - interestDiscount) * 100) / 100,
    monthsEarly,
    monthsIntoLoan,
    settlementDate: moment(settlementDate).toISOString(),
    settings
  };
}

