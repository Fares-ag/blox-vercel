// Environment detection
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const environment = import.meta.env.MODE || (isProduction ? 'production' : 'development');

export const Config = {
  environment,
  isDevelopment,
  isProduction,
  base_url: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  file_url: import.meta.env.VITE_FILE_BASE_URL || 'http://localhost:3000/files',
  // Safety: never allow bypassing guards in production builds.
  bypassGuards: isProduction ? false : import.meta.env.VITE_BYPASS_GUARDS === 'true',

  /**
   * Kill switch for customer card/credit checkout UI + SkipCash client invokes.
   * Set VITE_PAYMENTS_ENABLED=false to disable without redeploying Edge Functions
   * (DB can_pay RPCs remain the hard stop for initiates).
   */
  paymentsEnabled: import.meta.env.VITE_PAYMENTS_ENABLED !== 'false',

  /**
   * Chatbot UI — also requires a non-localhost VITE_BLOX_AI_URL at the call site.
   */
  chatbotEnabled: import.meta.env.VITE_CHATBOT_ENABLED === 'true',

  defaultPlaceholder: '/assets/images/im_default_placeholder.png',
  defaultUserPlaceholder: '/assets/icons/ic_user_placeholder.svg',

  otp_time: 10, // seconds
  otp_timerValue: '00:10',

  dateFormat: 'DD, MMMM YYYY',
  dateMonthFormat: 'DD MMMM',
  // Use day-of-month + 4-digit year (works correctly for both Moment and Dayjs).
  // Note: `d` is day-of-week (0-6), which leads to confusing output like "Oct 0".
  dateFormatTable: 'MMM D, YYYY',

  stateReducers: {
    dashboard: 'dashboard',
    vehicleFilter: 'vehicleFilter',
  },

  applicationStatuses: ['draft', 'active', 'completed'],
  applicationScreenStatuses: [
    'vehicle_screen',
    'offer_screen',
    'installments_screen',
    'documents_screen',
    'review_screen',
    'contracts_screen',
    'downPayment_screen',
    'completed',
  ],

  paymentStatuses: [
    { status: 'Due', color: '#DBFF00' },
    { status: 'Active', color: '#DBFF00' },
    { status: 'Paid', color: '#00CFA2' },
    { status: 'Upcoming', color: '#DBFF00' },
    { status: 'Partially Paid', color: '#708090' },
    { status: 'Unpaid', color: '#16535B' },
    { status: 'Over Paid', color: '#00CFA2' },
    { status: 'Instant Paid', color: '#00CFA2' },
  ],

  statusConfig: [
    { status: 'Draft', color: '#708090' },
    { status: 'Active', color: '#00CFA2' },
    { status: 'Completed', color: '#00CFA2' },
    { status: 'Under Review', color: '#16535B' },
    { status: 'Rejected', color: '#C62828' },
    { status: 'Contract Signing Required', color: '#DBFF00' },
    { status: 'Resubmission Required', color: '#DBFF00' },
    { status: 'Contracts Submitted', color: '#00CFA2' },
    { status: 'Contract Under Review', color: '#16535B' },
    { status: 'Down Payment Required', color: '#DBFF00' },
    { status: 'Down Payment Submitted', color: '#00CFA2' },
    { status: 'Pending Finance Activation', color: '#DBFF00' },
    { status: 'Submission Cancelled', color: '#708090' },
  ],

  tenure: ['1 Year', '2 Years', '3 Years', '4 Years', '5 Years'],
  Interval: ['Daily', 'Monthly', 'Semiannual', 'Quarterly', 'Annual'],

  translate_text: {
    'less-than-6-months': 'Less than 6 months',
    'between-6-12-months': 'Between 6 and 12 months',
    'more-than-12-months': 'More than 12 months',
    '5000to6999': '5000 to 6999',
    '7000to8999': '7000 to 8999',
    '9000to11999': '9000 to 11999',
    '12000to14999': '12000 to 14999',
    'more-than-15000': 'more than 15000',
    'gov-or-semi-gov': 'Government or Semi-Government',
    'private-international': 'Private International',
    'private-local': 'Private Local',
    'self-employed': 'Self-Employed',
  },
};

export const CurrencyConfig = {
  align: 'left',
  allowNegative: true,
  allowZero: true,
  decimal: '.',
  precision: 0,
  prefix: 'QAR ',
  suffix: '',
  thousands: ',',
  nullable: true,
  min: null,
  max: null,
  inputMode: 'financial',
};

export const ToastConfig = {
  position: 'bottom-center' as const,
  closeButton: true,
  autoClose: 10000,
  hideProgressBar: false,
  newestOnTop: true,
  rtl: false,
  pauseOnFocusLoss: true,
  draggable: true,
  pauseOnHover: true,
};

export const MembershipConfig = {
  /** Only purchasable plan for new memberships. */
  costPerMonth: 50, // QAR per month
  /**
   * Legacy yearly price — kept for reading historical yearly membership records.
   * New purchases must not use yearly (see allowYearlyPurchase).
   */
  costPerYear: 500,
  allowYearlyPurchase: false as const,
};

/**
 * Platform financing offer SoT for Customer browse/apply and new Admin defaults.
 * DB `offers.annual_rent_rate` is stored as percent (7 = 7%).
 * Customer calculator / installmentPlan.annualRentalRate use decimal (0.07).
 */
export const OfferConfig = {
  flatProfitRatePercent: 7,
  flatProfitRateDecimal: 0.07,
  defaultOfferName: 'Standard 7% Flat Profit',
};

/**
 * Normalize offer/stored rates to decimal for math.
 * Admin/DB use percent (7 or 9.5); some JSON paths already store decimal (0.07).
 */
export function toAnnualRentRateDecimal(
  rate: number | null | undefined,
  fallbackDecimal: number = OfferConfig.flatProfitRateDecimal
): number {
  if (rate == null || !Number.isFinite(Number(rate))) return fallbackDecimal;
  const n = Number(rate);
  return n > 1 ? n / 100 : n;
}
