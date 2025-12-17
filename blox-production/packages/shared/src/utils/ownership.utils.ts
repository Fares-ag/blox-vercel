/**
 * Utility functions for calculating ownership percentages
 */

export interface OwnershipResult {
  customerOwnership: number;
  bloxOwnership: number;
  loanAmount: number;
  principalPerMonth: number;
}

/**
 * Calculates ownership percentages for a given payment in the schedule
 * @param vehiclePrice - Total price of the vehicle
 * @param downPayment - Down payment amount
 * @param tenureMonths - Total tenure in months
 * @param paymentIndex - Zero-based index of the payment (0 = first payment)
 * @returns Ownership calculation result
 */
export const calculateOwnership = (
  vehiclePrice: number,
  downPayment: number,
  tenureMonths: number,
  paymentIndex: number
): OwnershipResult => {
  const loanAmount = vehiclePrice - downPayment;
  const principalPerMonth = tenureMonths > 0 ? loanAmount / tenureMonths : 0;
  
  // Calculate ownership after this payment (index is 0-based, so add 1 to include this payment)
  // Cap customer ownership at vehicle price and Blox ownership at 0
  const calculatedCustomerOwnership = downPayment + (principalPerMonth * (paymentIndex + 1));
  const customerOwnership = Math.min(calculatedCustomerOwnership, vehiclePrice);
  const bloxOwnership = Math.max(vehiclePrice - customerOwnership, 0);
  
  return {
    customerOwnership,
    bloxOwnership,
    loanAmount,
    principalPerMonth,
  };
};

