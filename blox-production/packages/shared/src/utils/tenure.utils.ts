/**
 * Utility functions for parsing and formatting tenure strings
 */

/**
 * Parses a tenure string (e.g., "3 Years", "36 Months", "2 Years 6 Months") into number of months
 * @param tenureStr - The tenure string to parse
 * @returns The number of months
 */
export const parseTenureToMonths = (tenureStr: string): number => {
  if (!tenureStr) return 12; // Default to 12 months

  // Robust parsing for variations like:
  // "3 Years", "36 Months", "12 months", "2 Years 6 Months", "12 months"
  const yearMatch = tenureStr.match(/(\d+)\s*year/i);
  const monthMatch = tenureStr.match(/(\d+)\s*month/i);

  const years = yearMatch ? parseInt(yearMatch[1], 10) : 0;
  const months = monthMatch ? parseInt(monthMatch[1], 10) : 0;

  if (yearMatch || monthMatch) {
    return (years * 12) + months;
  }

  // Fallback: assume it's years if no unit specified
  const n = parseInt(tenureStr.replace(/\D/g, ''), 10);
  return (Number.isFinite(n) && n > 0 ? n : 1) * 12;
};

/**
 * Formats number of months into a tenure string
 * @param months - Number of months
 * @returns Formatted tenure string (e.g., "3 Years" or "36 Months")
 */
export const formatMonthsToTenure = (months: number): string => {
  if (months <= 0) return '12 Months';
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years > 0 && remainingMonths === 0) {
    return `${years} Year${years > 1 ? 's' : ''}`;
  }
  
  return `${months} Months`;
};

