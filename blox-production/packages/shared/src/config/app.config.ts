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
    { status: 'Due', color: '#E2B13C' },
    { status: 'Active', color: '#007AFF' },
    { status: 'Paid', color: '#09C97F' },
    { status: 'Upcoming', color: '#007AFF' },
    { status: 'Partially Paid', color: '#F95668' },
    { status: 'Unpaid', color: '#F95668' },
    { status: 'Over Paid', color: '#00CFA2' },
    { status: 'Instant Paid', color: '#00CFA2' },
  ],

  statusConfig: [
    { status: 'Draft', color: '#E2B13C' },
    { status: 'Active', color: '#007AFF' },
    { status: 'Completed', color: '#09C97F' },
    { status: 'Under Review', color: '#CF8900' },
    { status: 'Rejected', color: '#D65D5D' },
    { status: 'Contract Signing Required', color: '#16535B' },
    { status: 'Resubmission Required', color: '#16535B' },
    { status: 'Contracts Submitted', color: '#CF8900' },
    { status: 'Contract Under Review', color: '#CF8900' },
    { status: 'Down Payment Required', color: '#16535B' },
    { status: 'Down Payment Submitted', color: '#16535B' },
    { status: 'Submission Cancelled', color: '#E7626C' },
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
  costPerMonth: 50, // QAR per month
  costPerYear: 500, // QAR per year
};
