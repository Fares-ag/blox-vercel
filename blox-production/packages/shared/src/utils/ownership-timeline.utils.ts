/**
 * Utilities for calculating ownership timeline and milestones
 */

import moment from 'moment';
import type { Application } from '../models/application.model';
import { calculateOwnership } from './ownership.utils';
import { parseTenureToMonths } from './tenure.utils';

export interface OwnershipMilestone {
  date: string;
  ownershipPercentage: number;
  ownershipAmount: number;
  paymentIndex: number;
  paymentStatus: 'paid' | 'upcoming' | 'missed';
  milestone?: 'first_payment' | 'quarter' | 'halfway' | 'three_quarters' | 'almost_there' | 'full_owner';
  label: string;
}

export interface OwnershipTimelineData {
  milestones: OwnershipMilestone[];
  currentOwnership: number;
  targetOwnership: number;
  progressPercentage: number;
  estimatedCompletionDate: string | null;
  totalPayments: number;
  completedPayments: number;
}

/**
 * Calculate ownership timeline from application data
 */
export const calculateOwnershipTimeline = (application: Application): OwnershipTimelineData => {
  if (!application.installmentPlan?.schedule || !application.vehicle) {
    return {
      milestones: [],
      currentOwnership: 0,
      targetOwnership: 100,
      progressPercentage: 0,
      estimatedCompletionDate: null,
      totalPayments: 0,
      completedPayments: 0,
    };
  }

  const vehiclePrice = application.vehicle.price || 0;
  const downPayment = application.downPayment || application.installmentPlan?.downPayment || 0;
  const tenureStr = application.installmentPlan?.tenure || '12 Months';
  const tenureMonths = parseTenureToMonths(tenureStr);
  const schedule = application.installmentPlan.schedule;

  const milestones: OwnershipMilestone[] = [];
  let completedPayments = 0;
  let lastPaidIndex = -1;

  // Calculate ownership for each payment
  schedule.forEach((payment, index) => {
    const { customerOwnership } = calculateOwnership(
      vehiclePrice,
      downPayment,
      tenureMonths,
      index
    );

    const ownershipPercentage = vehiclePrice > 0 ? (customerOwnership / vehiclePrice) * 100 : 0;
    const paymentStatus: 'paid' | 'upcoming' | 'missed' = 
      payment.status === 'paid' ? 'paid' :
      moment(payment.dueDate).isBefore(moment(), 'day') ? 'missed' :
      'upcoming';

    if (payment.status === 'paid') {
      completedPayments++;
      lastPaidIndex = index;
    }

    // Determine milestone
    let milestone: OwnershipMilestone['milestone'] | undefined;
    let label = `Payment ${index + 1}`;

    if (index === 0) {
      milestone = 'first_payment';
      label = 'First Payment';
    } else if (ownershipPercentage >= 25 && ownershipPercentage < 50) {
      milestone = 'quarter';
      label = '25% Ownership';
    } else if (ownershipPercentage >= 50 && ownershipPercentage < 75) {
      milestone = 'halfway';
      label = '50% Ownership - Halfway!';
    } else if (ownershipPercentage >= 75 && ownershipPercentage < 95) {
      milestone = 'three_quarters';
      label = '75% Ownership';
    } else if (ownershipPercentage >= 95 && ownershipPercentage < 100) {
      milestone = 'almost_there';
      label = '95% Ownership - Almost There!';
    } else if (ownershipPercentage >= 100) {
      milestone = 'full_owner';
      label = '100% Ownership - Full Owner! 🎉';
    }

    milestones.push({
      date: payment.dueDate,
      ownershipPercentage: Math.round(ownershipPercentage * 100) / 100,
      ownershipAmount: Math.round(customerOwnership * 100) / 100,
      paymentIndex: index,
      paymentStatus,
      milestone,
      label,
    });
  });

  // Calculate current ownership (based on last paid payment)
  const currentOwnership = lastPaidIndex >= 0 
    ? milestones[lastPaidIndex].ownershipPercentage 
    : (downPayment / vehiclePrice) * 100;

  // Estimate completion date (based on remaining payments)
  const remainingPayments = schedule.length - completedPayments;
  const estimatedCompletionDate = remainingPayments > 0 && lastPaidIndex >= 0
    ? moment(schedule[lastPaidIndex].dueDate).add(remainingPayments, 'months').toISOString()
    : null;

  return {
    milestones,
    currentOwnership: Math.round(currentOwnership * 100) / 100,
    targetOwnership: 100,
    progressPercentage: Math.round(currentOwnership * 100) / 100,
    estimatedCompletionDate,
    totalPayments: schedule.length,
    completedPayments,
  };
};

/**
 * Get milestone label for ownership percentage
 */
export const getMilestoneLabel = (percentage: number): string => {
  if (percentage >= 100) return 'Full Owner';
  if (percentage >= 95) return 'Almost There';
  if (percentage >= 75) return 'Three Quarters';
  if (percentage >= 50) return 'Halfway';
  if (percentage >= 25) return 'Quarter';
  return 'Getting Started';
};

