import moment from 'moment';
import type { PaymentSchedule, InstallmentPlan } from '../models/application.model';
import { parseTenureToMonths } from './tenure.utils';

export interface BalloonPaymentConfig {
  vehiclePrice: number;
  downPayment: number;
  downPaymentPercent: number;
  installmentPercent: number;
  balloonPercent: number;
  termMonths: number;
  annualRentalRate: number;
  startDate: moment.Moment;
  interval?: string;
}

export interface BalloonPaymentCalculation {
  downPaymentAmount: number;
  totalInstallmentAmount: number;
  balloonAmount: number;
  principalPerMonth: number;
  schedule: PaymentSchedule[];
  totalRent: number;
  totalAmount: number;
}

/**
 * Validates that payment structure percentages sum to 100%
 */
export function validatePaymentStructure(
  downPaymentPercent: number,
  installmentPercent: number,
  balloonPercent: number
): { isValid: boolean; error?: string } {
  const total = downPaymentPercent + installmentPercent + balloonPercent;
  const tolerance = 0.01; // Allow 0.01% tolerance for floating point errors

  if (Math.abs(total - 100) > tolerance) {
    return {
      isValid: false,
      error: `Payment structure percentages must sum to 100%. Current total: ${total.toFixed(2)}%`,
    };
  }

  if (downPaymentPercent < 0 || installmentPercent < 0 || balloonPercent < 0) {
    return {
      isValid: false,
      error: 'Payment structure percentages cannot be negative',
    };
  }

  return { isValid: true };
}

/**
 * Calculates balloon payment schedule based on payment structure percentages
 * 
 * @param config - Balloon payment configuration
 * @returns Calculated schedule and amounts
 */
export function calculateBalloonPaymentSchedule(
  config: BalloonPaymentConfig
): BalloonPaymentCalculation {
  const {
    vehiclePrice,
    downPayment,
    downPaymentPercent,
    installmentPercent,
    balloonPercent,
    termMonths,
    annualRentalRate,
    startDate,
    interval = 'Monthly',
  } = config;

  // Validate payment structure
  const validation = validatePaymentStructure(downPaymentPercent, installmentPercent, balloonPercent);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid payment structure');
  }

  // Calculate amounts based on percentages
  const downPaymentAmount = downPayment > 0 ? downPayment : vehiclePrice * (downPaymentPercent / 100);
  const totalInstallmentAmount = vehiclePrice * (installmentPercent / 100);
  const balloonAmount = vehiclePrice * (balloonPercent / 100);

  // Calculate principal payment per month (from installment portion only)
  const principalPerMonth = termMonths > 0 ? totalInstallmentAmount / termMonths : 0;

  // Generate payment schedule
  const schedule: PaymentSchedule[] = [];
  const now = moment().startOf('day');
  const intervalValue = interval.toString().trim().toLowerCase();
  const isDaily = intervalValue === 'daily';
  const rentPerPeriodRate = annualRentalRate / (isDaily ? 365 : 12);
  let totalRent = 0;

  // 1. Down payment (if any)
  if (downPaymentAmount > 0) {
    const downPaymentDate = isDaily
      ? moment(startDate).startOf('day')
      : moment(startDate).startOf('month');

    const isPast = downPaymentDate.isBefore(now, isDaily ? 'day' : 'month');
    const isToday = downPaymentDate.isSame(now, isDaily ? 'day' : 'month');

    schedule.push({
      dueDate: downPaymentDate.format('YYYY-MM-DD'),
      amount: downPaymentAmount,
      status: isPast ? 'paid' : isToday ? 'active' : 'upcoming',
      paidDate: isPast ? downPaymentDate.format('YYYY-MM-DD') : undefined,
      paymentType: 'down_payment',
      isBalloon: false,
    });
  }

  // 2. Monthly installments (principal + rent on remaining balance including balloon)
  if (isDaily) {
    // Daily payment schedule
    let currentDate = moment(startDate).startOf('day');
    const endDate = moment(startDate).add(termMonths, 'months').endOf('month');

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      const monthIndex = Math.floor(currentDate.diff(moment(startDate), 'months', true));
      const daysInMonth = currentDate.daysInMonth();
      const monthStart = currentDate.clone().startOf('month');
      const monthEnd = currentDate.clone().endOf('month');

      for (let dayInMonth = 0; dayInMonth < daysInMonth; dayInMonth++) {
        const dueDate = monthStart.clone().add(dayInMonth, 'days');
        if (dueDate.isAfter(endDate)) break;

        // Calculate ownership at this point (based on month index)
        const customerOwnership = downPaymentAmount + (principalPerMonth * monthIndex);
        const remainingBalance = vehiclePrice - customerOwnership; // Includes balloon
        const dailyRent = remainingBalance * rentPerPeriodRate;
        const dailyPrincipal = principalPerMonth / daysInMonth;
        const paymentAmount = dailyPrincipal + dailyRent;

        totalRent += dailyRent;

        const isPast = dueDate.isBefore(now, 'day');
        const isToday = dueDate.isSame(now, 'day');

        schedule.push({
          dueDate: dueDate.format('YYYY-MM-DD'),
          amount: paymentAmount,
          status: isPast ? 'paid' : isToday ? 'active' : 'upcoming',
          paidDate: isPast ? dueDate.format('YYYY-MM-DD') : undefined,
          paymentType: 'installment',
          isBalloon: false,
        });
      }

      currentDate = monthEnd.clone().add(1, 'day').startOf('month');
    }
  } else {
    // Monthly payment schedule
    const firstDueDate = moment(startDate).startOf('month');

    for (let i = 0; i < termMonths; i++) {
      const dueDate = moment(firstDueDate).add(i, 'months');
      const dueDateFormatted = dueDate.format('YYYY-MM-DD');

      // Calculate ownership at this point
      const customerOwnership = downPaymentAmount + (principalPerMonth * i);
      const remainingBalance = vehiclePrice - customerOwnership; // Includes balloon portion
      const monthlyRent = remainingBalance * rentPerPeriodRate;
      const paymentAmount = principalPerMonth + monthlyRent;

      totalRent += monthlyRent;

      const isPast = dueDate.isBefore(now, 'month');
      const isCurrentMonth = dueDate.isSame(now, 'month');

      schedule.push({
        dueDate: dueDateFormatted,
        amount: paymentAmount,
        status: isPast ? 'paid' : isCurrentMonth ? 'active' : 'upcoming',
        paidDate: isPast ? dueDateFormatted : undefined,
        paymentType: 'installment',
        isBalloon: false,
      });
    }
  }

  // 3. Balloon payment (final payment)
  // For monthly: installments are months 1-N, balloon is month N+1
  // For daily: balloon is at the end of month N
  const balloonDueDate = isDaily
    ? moment(startDate).add(termMonths, 'months').endOf('month')
    : moment(startDate).add(termMonths, 'months').startOf('month').add(1, 'month');

  // Calculate rent on balloon amount for the final period
  // For daily: use actual days in the final month
  // For monthly: use 1 month rate
  const finalRent = isDaily
    ? balloonAmount * rentPerPeriodRate * moment(startDate).add(termMonths, 'months').daysInMonth()
    : balloonAmount * rentPerPeriodRate;
  const totalBalloonPayment = balloonAmount + finalRent;
  totalRent += finalRent;

  const isPast = balloonDueDate.isBefore(now, isDaily ? 'day' : 'month');
  const isCurrent = balloonDueDate.isSame(now, isDaily ? 'day' : 'month');

  schedule.push({
    dueDate: balloonDueDate.format('YYYY-MM-DD'),
    amount: totalBalloonPayment,
    status: isPast ? 'paid' : isCurrent ? 'active' : 'upcoming',
    paidDate: isPast ? balloonDueDate.format('YYYY-MM-DD') : undefined,
    paymentType: 'balloon_payment',
    isBalloon: true,
  });

  const totalAmount = vehiclePrice + totalRent;

  return {
    downPaymentAmount,
    totalInstallmentAmount,
    balloonAmount,
    principalPerMonth,
    schedule,
    totalRent,
    totalAmount,
  };
}

/**
 * Calculates ownership percentages for balloon payment plans
 * Ownership only reaches 100% after balloon payment is made
 */
export function calculateBalloonOwnership(
  vehiclePrice: number,
  downPayment: number,
  principalPerMonth: number,
  installmentsPaid: number,
  balloonPaid: boolean
): { customerOwnership: number; bloxOwnership: number; ownershipPercent: number } {
  const customerOwnership = downPayment + (principalPerMonth * installmentsPaid);
  const ownershipPercent = balloonPaid
    ? 100
    : Math.min((customerOwnership / vehiclePrice) * 100, 100);

  return {
    customerOwnership: Math.min(customerOwnership, vehiclePrice),
    bloxOwnership: Math.max(vehiclePrice - customerOwnership, 0),
    ownershipPercent,
  };
}

/**
 * Extracts balloon payment configuration from InstallmentPlan
 */
export function extractBalloonConfig(plan: InstallmentPlan, vehiclePrice: number): BalloonPaymentConfig | null {
  if (plan.calculationMethod !== 'balloon_payment') {
    return null;
  }

  const structure = plan.paymentStructure;
  if (!structure) {
    return null;
  }

  return {
    vehiclePrice,
    downPayment: plan.downPayment || 0,
    downPaymentPercent: structure.downPaymentPercent || 0,
    installmentPercent: structure.installmentPercent || 0,
    balloonPercent: structure.balloonPercent || 0,
    termMonths: parseTenureToMonths(plan.tenure),
    annualRentalRate: plan.annualRentalRate || 0,
    startDate: moment(),
    interval: plan.interval,
  };
}

