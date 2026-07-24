/** Must match `@shared/utils/blox-credits.utils` and Flutter `bloxCreditQarValue`. */
export const BLOX_CREDIT_QAR_VALUE = 250;

export function creditsToQar(credits: number): number {
  return credits * BLOX_CREDIT_QAR_VALUE;
}
