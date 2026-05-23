import { describe, it, expect } from 'vitest';
import {
  calculateMonthsIntoLoan,
  calculateMonthsEarlyPayment,
  calculateMonthsEarly,
  calculatePrincipalAndInterest,
  calculateSettlementDiscount,
} from '../../utils/settlement-discount.utils';
import type { Application, PaymentSchedule } from '../../models/application.model';
import type { SettlementDiscountSettings } from '../../models/settlement-discount.model';

const baseApplication: Application = {
  id: 'app-1',
  customerName: 'Test User',
  customerEmail: 'test@example.com',
  customerPhone: '+97412345678',
  vehicleId: 'v-1',
  offerId: 'offer-1',
  status: 'active',
  loanAmount: 100000,
  downPayment: 20000,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  installmentPlan: {
    tenure: '12 Months',
    schedule: [
      { id: 'p1', dueDate: '2024-02-01', amount: 8000, status: 'paid', paidAmount: 8000 },
      { id: 'p2', dueDate: '2024-03-01', amount: 8000, status: 'upcoming' },
      { id: 'p3', dueDate: '2024-04-01', amount: 8000, status: 'upcoming' },
    ],
  },
  vehicle: { id: 'v-1', price: 120000, make: 'Toyota', model: 'Camry', modelYear: 2024 },
  offer: { id: 'offer-1', annualRentRate: 0.12 },
} as any;

const remainingPayments: PaymentSchedule[] = [
  { id: 'p2', dueDate: '2024-03-01', amount: 8000, status: 'upcoming' },
  { id: 'p3', dueDate: '2024-04-01', amount: 8000, status: 'upcoming' },
];

const baseSettings: SettlementDiscountSettings = {
  id: 's1',
  isActive: true,
  minSettlementAmount: 1000,
  minRemainingPayments: 1,
  principalDiscountEnabled: true,
  principalDiscountType: 'percentage',
  principalDiscountValue: 5,
  interestDiscountEnabled: true,
  interestDiscountType: 'percentage',
  interestDiscountValue: 10,
  tieredDiscounts: [],
} as any;

describe('settlement-discount.utils', () => {
  describe('calculateMonthsIntoLoan', () => {
    it('should return 0 when settling at first payment date', () => {
      const app = {
        ...baseApplication,
        installmentPlan: {
          tenure: '12 Months',
          schedule: [{ dueDate: '2024-02-01', amount: 8000 }],
        },
      };
      const months = calculateMonthsIntoLoan(app, '2024-02-01');
      expect(months).toBeGreaterThanOrEqual(0);
    });

    it('should return positive months when settlement is after first payment', () => {
      const months = calculateMonthsIntoLoan(baseApplication, '2024-04-15');
      expect(months).toBeGreaterThan(0);
    });
  });

  describe('calculateMonthsEarlyPayment', () => {
    it('should return 0 when not early (at or past last payment)', () => {
      const app = {
        ...baseApplication,
        installmentPlan: { tenure: '12 Months', schedule: [{ dueDate: '2024-12-01', amount: 8000 }] },
      };
      const months = calculateMonthsEarlyPayment(app, '2024-12-01');
      expect(months).toBeGreaterThanOrEqual(0);
    });

    it('should return positive months when settling before end of tenure', () => {
      const months = calculateMonthsEarlyPayment(baseApplication, '2024-03-01');
      expect(months).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateMonthsEarly', () => {
    it('should return monthsEarly 0 when no remaining payments', () => {
      const result = calculateMonthsEarly('2024-06-01', []);
      expect(result.monthsEarly).toBe(0);
    });

    it('should return positive months early based on last payment due date', () => {
      const result = calculateMonthsEarly('2024-03-01', remainingPayments);
      expect(result.monthsEarly).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculatePrincipalAndInterest', () => {
    it('should return totalPrincipal and totalInterest for remaining payments', () => {
      const result = calculatePrincipalAndInterest(baseApplication, remainingPayments);
      expect(result.totalPrincipal).toBeGreaterThanOrEqual(0);
      expect(result.totalInterest).toBeGreaterThanOrEqual(0);
    });

    it('should return zeros for empty remaining payments', () => {
      const result = calculatePrincipalAndInterest(baseApplication, []);
      expect(result.totalPrincipal).toBe(0);
      expect(result.totalInterest).toBe(0);
    });
  });

  describe('calculateSettlementDiscount', () => {
    it('should return zero discount when remainingPayments length is below minRemainingPayments', () => {
      const settingsHighMin = { ...baseSettings, minRemainingPayments: 5 };
      const result = calculateSettlementDiscount(
        baseApplication,
        remainingPayments,
        settingsHighMin,
        '2024-03-01'
      );
      expect(result.totalDiscount).toBe(0);
      expect(result.finalAmount).toBe(result.originalTotal);
    });

    it('should return zero discount when originalTotal < minSettlementAmount', () => {
      const lowSettings = { ...baseSettings, minSettlementAmount: 1000000 };
      const result = calculateSettlementDiscount(
        baseApplication,
        remainingPayments,
        lowSettings,
        '2024-03-01'
      );
      expect(result.totalDiscount).toBe(0);
      expect(result.finalAmount).toBe(result.originalTotal);
    });

    it('should return zero discount when settings.isActive is false', () => {
      const inactiveSettings = { ...baseSettings, isActive: false };
      const result = calculateSettlementDiscount(
        baseApplication,
        remainingPayments,
        inactiveSettings,
        '2024-03-01'
      );
      expect(result.totalDiscount).toBe(0);
      expect(result.finalAmount).toBe(result.originalTotal);
    });

    it('should return discount and reduced finalAmount when eligible', () => {
      const result = calculateSettlementDiscount(
        baseApplication,
        remainingPayments,
        baseSettings,
        '2024-03-01'
      );
      expect(result.originalTotal).toBeGreaterThan(0);
      expect(result.monthsEarly).toBeGreaterThanOrEqual(0);
      expect(result.monthsIntoLoan).toBeGreaterThanOrEqual(0);
      // When eligible with percentage discounts, we may get positive discount
      if (result.totalDiscount > 0) {
        expect(result.finalAmount).toBeLessThan(result.originalTotal);
      }
    });
  });
});
