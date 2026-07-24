import { describe, it, expect } from 'vitest';
import {
  BLOX_CREDIT_QAR_VALUE,
  creditsToQar,
  qarToCredits,
  formatBloxCreditsCount,
} from '../../utils/blox-credits.utils';

describe('blox-credits.utils', () => {
  it('defines 1 credit = 250 QAR', () => {
    expect(BLOX_CREDIT_QAR_VALUE).toBe(250);
    expect(creditsToQar(1)).toBe(250);
    expect(creditsToQar(4)).toBe(1000);
  });

  it('converts QAR balance to credit count', () => {
    expect(qarToCredits(250)).toBe(1);
    expect(qarToCredits(500)).toBe(2);
    expect(formatBloxCreditsCount(250)).toBe('1');
    expect(formatBloxCreditsCount(750)).toBe('3');
  });
});
