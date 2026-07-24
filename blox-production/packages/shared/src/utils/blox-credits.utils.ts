/** 1 Blox credit equals this many QAR. Balance in `user_credits` is stored as QAR-equivalent. */
export const BLOX_CREDIT_QAR_VALUE = 250;

export function creditsToQar(credits: number): number {
  return credits * BLOX_CREDIT_QAR_VALUE;
}

export function qarToCredits(balanceQar: number): number {
  return balanceQar / BLOX_CREDIT_QAR_VALUE;
}

/** Credit count for wallet UI (balance is QAR-equivalent in the database). */
export function formatBloxCreditsCount(balanceQar: number): string {
  const credits = qarToCredits(balanceQar);
  if (!Number.isFinite(credits)) return '0';
  const rounded = Math.round(credits * 100) / 100;
  return rounded % 1 === 0
    ? rounded.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
