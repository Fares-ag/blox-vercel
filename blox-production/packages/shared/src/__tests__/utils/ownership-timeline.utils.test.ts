import { describe, it, expect } from 'vitest';
import type { Application } from '../../models/application.model';
import { calculateOwnershipTimeline, getMilestoneLabel } from '../../utils/ownership-timeline.utils';

describe('ownership-timeline.utils', () => {
  it('returns empty timeline when missing schedule or vehicle', () => {
    const app = {
      id: 'a1',
      customerName: 'Test',
      customerEmail: 'test@example.com',
      customerPhone: '+97400000000',
      vehicleId: 'v1',
      offerId: 'o1',
      status: 'draft',
      loanAmount: 1000,
      downPayment: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      installmentPlan: undefined,
      vehicle: undefined,
    } as unknown as Application;

    const timeline = calculateOwnershipTimeline(app);
    expect(timeline.milestones).toEqual([]);
    expect(timeline.progressPercentage).toBe(0);
    expect(timeline.totalPayments).toBe(0);
  });

  it('computes milestones and progress from schedule', () => {
    const app = {
      id: 'a2',
      customerName: 'Test',
      customerEmail: 'test@example.com',
      customerPhone: '+97400000000',
      vehicleId: 'v1',
      offerId: 'o1',
      status: 'active',
      loanAmount: 50000,
      downPayment: 10000,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      vehicle: { id: 'v1', make: 'X', model: 'Y', modelYear: 2025, price: 50000, status: 'active' } as any,
      installmentPlan: {
        tenure: '3 Months',
        interval: 'Monthly',
        monthlyAmount: 1000,
        totalAmount: 3000,
        schedule: [
          { dueDate: '2025-02-28', amount: 1000, status: 'paid', paidDate: '2025-02-15' },
          { dueDate: '2025-03-31', amount: 1000, status: 'paid', paidDate: '2025-03-31' },
          { dueDate: '2025-04-30', amount: 1000, status: 'upcoming' },
        ],
      },
    } as unknown as Application;

    const timeline = calculateOwnershipTimeline(app);
    expect(timeline.totalPayments).toBe(3);
    expect(timeline.completedPayments).toBe(2);
    expect(timeline.milestones).toHaveLength(3);
    expect(timeline.milestones[0].milestone).toBe('first_payment');
    expect(timeline.progressPercentage).toBeGreaterThan(0);
  });

  it('getMilestoneLabel maps percentages to labels', () => {
    expect(getMilestoneLabel(0)).toBe('Getting Started');
    expect(getMilestoneLabel(25)).toBe('Quarter');
    expect(getMilestoneLabel(50)).toBe('Halfway');
    expect(getMilestoneLabel(75)).toBe('Three Quarters');
    expect(getMilestoneLabel(95)).toBe('Almost There');
    expect(getMilestoneLabel(100)).toBe('Full Owner');
  });
});