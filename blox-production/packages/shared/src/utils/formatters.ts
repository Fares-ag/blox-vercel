import moment from 'moment';
import { CurrencyConfig, Config } from '../config/app.config';

export const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || amount === '') {
    return '';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d.-]/g, '')) : amount;
  
  if (isNaN(numAmount)) {
    return '';
  }

  const formatted = Math.abs(numAmount).toFixed(CurrencyConfig.precision);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, CurrencyConfig.thousands);

  const result = CurrencyConfig.prefix + parts.join(CurrencyConfig.decimal);
  
  return numAmount < 0 ? `-${result}` : result;
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
};

export const formatDate = (date: string | Date, format: string = Config.dateFormat): string => {
  if (!date) return '';
  return moment(date).format(format);
};

export const formatDateTable = (date: string | Date): string => {
  return formatDate(date, Config.dateFormatTable);
};

export const formatDateTime = (date: string | Date): string => {
  if (!date) return '';
  return moment(date).format('MMM d, YYYY h:mm A'); // e.g., "Jan 4, 2026 3:45 PM"
};

export const formatMonth = (date: string | Date): string => {
  return formatDate(date, Config.dateMonthFormat);
};

export const getStatusColor = (status: string): string => {
  // Normalize status: convert underscores to spaces and trim
  const normalizedStatus = status.replace(/_/g, ' ').toLowerCase().trim();
  const statusConfig = Config.statusConfig.find((s) => 
    s.status.toLowerCase().trim() === normalizedStatus
  );
  return statusConfig?.color || '#BCBCBC';
};

export const getPaymentStatusColor = (status: string): string => {
  const paymentStatus = Config.paymentStatuses.find((s) => s.status.toLowerCase() === status.toLowerCase());
  return paymentStatus?.color || '#BCBCBC';
};

export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // Basic phone formatting - can be enhanced with libphonenumber-js
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '+$1 $2 $3');
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
