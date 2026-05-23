/**
 * Badge and achievement system for ownership gamification
 */

import type { Application, PaymentSchedule } from '../models/application.model';
import moment from 'moment';
import { calculateOwnershipTimeline } from './ownership-timeline.utils';
import { parseTenureToMonths } from './tenure.utils';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'payment' | 'ownership' | 'loyalty' | 'milestone';
  unlocked: boolean;
  unlockedDate?: string;
  progress?: number; // 0-100
  target?: number;
}

export interface BadgeProgress {
  badge: Badge;
  current: number;
  target: number;
  percentage: number;
}

/**
 * Calculate all badges for an application
 */
export const calculateBadges = (application: Application): Badge[] => {
  const badges: Badge[] = [];
  const timeline = calculateOwnershipTimeline(application);
  const schedule = application.installmentPlan?.schedule || [];

  // First Payment Hero
  const firstPayment = schedule.find(p => p.status === 'paid');
  badges.push({
    id: 'first_payment',
    name: 'First Payment Hero',
    description: 'Made your first payment',
    icon: '🎯',
    color: '#DAFF01',
    category: 'payment',
    unlocked: !!firstPayment,
    unlockedDate: firstPayment?.paidDate,
  });

  // Perfect Payer (12 consecutive on-time payments)
  const consecutivePayments = calculateConsecutivePayments(schedule);
  badges.push({
    id: 'perfect_payer',
    name: 'Perfect Payer',
    description: '12 consecutive on-time payments',
    icon: '⭐',
    color: '#FFD700',
    category: 'payment',
    unlocked: consecutivePayments >= 12,
    progress: Math.min((consecutivePayments / 12) * 100, 100),
    target: 12,
  });

  // Quarter Owner (25%)
  const quarterMilestone = timeline.milestones.find(m => m.milestone === 'quarter' && m.paymentStatus === 'paid');
  badges.push({
    id: 'quarter_owner',
    name: 'Quarter Owner',
    description: 'Reached 25% ownership',
    icon: '🏅',
    color: '#4CAF50',
    category: 'ownership',
    unlocked: !!quarterMilestone,
    unlockedDate: quarterMilestone?.date,
  });

  // Halfway Hero (50%)
  const halfwayMilestone = timeline.milestones.find(m => m.milestone === 'halfway' && m.paymentStatus === 'paid');
  badges.push({
    id: 'halfway_hero',
    name: 'Halfway Hero',
    description: 'Reached 50% ownership',
    icon: '🎖️',
    color: '#2196F3',
    category: 'ownership',
    unlocked: !!halfwayMilestone,
    unlockedDate: halfwayMilestone?.date,
  });

  // Almost Owner (95%)
  const almostMilestone = timeline.milestones.find(m => m.milestone === 'almost_there' && m.paymentStatus === 'paid');
  badges.push({
    id: 'almost_owner',
    name: 'Almost Owner',
    description: 'Reached 95% ownership',
    icon: '👑',
    color: '#9C27B0',
    category: 'ownership',
    unlocked: !!almostMilestone,
    unlockedDate: almostMilestone?.date,
  });

  // Full Owner (100%)
  const fullOwnerMilestone = timeline.milestones.find(m => m.milestone === 'full_owner' && m.paymentStatus === 'paid');
  badges.push({
    id: 'full_owner',
    name: 'Full Owner',
    description: 'Achieved 100% ownership!',
    icon: '🏆',
    color: '#FF6B35',
    category: 'milestone',
    unlocked: !!fullOwnerMilestone,
    unlockedDate: fullOwnerMilestone?.date,
  });

  // Early Bird (3 early payments)
  const earlyPayments = schedule.filter(p => {
    if (p.status !== 'paid' || !p.paidDate || !p.dueDate) return false;
    return moment(p.paidDate).isBefore(moment(p.dueDate), 'day');
  }).length;
  badges.push({
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Made 3 early payments',
    icon: '🐦',
    color: '#FF9800',
    category: 'payment',
    unlocked: earlyPayments >= 3,
    progress: Math.min((earlyPayments / 3) * 100, 100),
    target: 3,
  });

  // Loyalty Badge (6 months of payments)
  const monthsPaid = new Set(schedule
    .filter(p => p.status === 'paid' && p.paidDate)
    .map(p => moment(p.paidDate).format('YYYY-MM'))
  ).size;
  badges.push({
    id: 'loyalty',
    name: 'Loyalty Champion',
    description: '6 months of consistent payments',
    icon: '💎',
    color: '#E91E63',
    category: 'loyalty',
    unlocked: monthsPaid >= 6,
    progress: Math.min((monthsPaid / 6) * 100, 100),
    target: 6,
  });

  // Speed Demon (Paid off in less than half the time)
  if (fullOwnerMilestone && application.createdAt) {
    const totalTime = moment(fullOwnerMilestone.date).diff(moment(application.createdAt), 'months');
    const expectedTime = parseTenureToMonths(application.installmentPlan?.tenure || '12 Months');
    const isSpeedDemon = totalTime < expectedTime / 2;
    badges.push({
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Paid off in less than half the expected time',
      icon: '⚡',
      color: '#F44336',
      category: 'milestone',
      unlocked: isSpeedDemon,
      unlockedDate: fullOwnerMilestone.date,
    });
  }

  return badges;
};

/**
 * Calculate consecutive on-time payments
 */
const calculateConsecutivePayments = (schedule: PaymentSchedule[]): number => {
  let consecutive = 0;
  const sortedSchedule = [...schedule].sort((a, b) => 
    moment(a.dueDate).valueOf() - moment(b.dueDate).valueOf()
  );

  for (const payment of sortedSchedule) {
    if (payment.status === 'paid') {
      // Check if payment was on time (paid on or before due date)
      const isOnTime = payment.paidDate 
        ? moment(payment.paidDate).isSameOrBefore(moment(payment.dueDate), 'day')
        : true;
      
      if (isOnTime) {
        consecutive++;
      } else {
        break; // Reset on late payment
      }
    } else {
      break; // Stop at first unpaid
    }
  }

  return consecutive;
};

/**
 * Get badge progress for display
 */
export const getBadgeProgress = (badge: Badge): BadgeProgress => {
  return {
    badge,
    current: badge.progress || (badge.unlocked ? badge.target || 100 : 0),
    target: badge.target || 100,
    percentage: badge.progress || (badge.unlocked ? 100 : 0),
  };
};

