/**
 * Utility functions for calculating ownership percentages
 */

export interface OwnershipResult {
  customerOwnership: number;
  bloxOwnership: number;
  loanAmount: number;
  principalPerMonth: number;
}

export interface BalloonOwnershipParams {
  vehiclePrice: number;
  downPayment: number;
  installmentPercent: number;
  balloonPercent: number;
  tenureMonths: number;
  paymentIndex: number;
  balloonPaid?: boolean;
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

/**
 * Calculates ownership for balloon payment plans
 * Ownership only reaches 100% after balloon payment is made
 * @param params - Balloon ownership calculation parameters
 * @returns Ownership calculation result
 */
export const calculateBalloonOwnership = (
  params: BalloonOwnershipParams
): OwnershipResult => {
  const {
    vehiclePrice,
    downPayment,
    installmentPercent,
    balloonPercent,
    tenureMonths,
    paymentIndex,
    balloonPaid = false,
  } = params;

  // Calculate installment amount (portion of vehicle price)
  const totalInstallmentAmount = vehiclePrice * (installmentPercent / 100);
  const principalPerMonth = tenureMonths > 0 ? totalInstallmentAmount / tenureMonths : 0;  // Calculate ownership after this payment
  const customerOwnership = downPayment + (principalPerMonth * (paymentIndex + 1));

  // If balloon is paid, customer owns 100%, otherwise cap at (down + installments)
  const maxOwnershipWithoutBalloon = vehiclePrice * ((100 - balloonPercent) / 100);
  const finalCustomerOwnership = balloonPaid
    ? vehiclePrice
    : Math.min(customerOwnership, maxOwnershipWithoutBalloon);

  const bloxOwnership = Math.max(vehiclePrice - finalCustomerOwnership, 0);

  return {
    customerOwnership: finalCustomerOwnership,
    bloxOwnership,
    loanAmount: vehiclePrice - downPayment,
    principalPerMonth,
  };
};
