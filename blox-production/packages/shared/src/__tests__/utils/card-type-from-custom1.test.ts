import { describe, it, expect } from 'vitest';

/**
 * Documents and verifies the contract for payment_transactions.card_type
 * as set by skipcash-payment edge function from custom1.paymentMethod.
 */
function getCardTypeFromPaymentMethod(paymentMethod: string | undefined): 'credit' | 'debit' | null {
  if (paymentMethod === 'credit_card') return 'credit';
  if (paymentMethod === 'debit_card') return 'debit';
  return null;
}

describe('card_type from custom1.paymentMethod (skipcash-payment contract)', () => {
  it('maps credit_card to credit', () => {
    expect(getCardTypeFromPaymentMethod('credit_card')).toBe('credit');
  });

  it('maps debit_card to debit', () => {
    expect(getCardTypeFromPaymentMethod('debit_card')).toBe('debit');
  });

  it('returns null for unknown or missing paymentMethod', () => {
    expect(getCardTypeFromPaymentMethod(undefined)).toBe(null);
    expect(getCardTypeFromPaymentMethod('')).toBe(null);
    expect(getCardTypeFromPaymentMethod('blox_credit')).toBe(null);
    expect(getCardTypeFromPaymentMethod('card')).toBe(null);
  });
});
