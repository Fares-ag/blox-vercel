# Balloon Payment Implementation

## Overview

This document describes the implementation of balloon payment structures in the Blox application. Balloon payments allow for flexible payment plans where customers pay a down payment, monthly installments, and a final large balloon payment (e.g., 20% down, 60% installments, 20% balloon).

## Features Implemented

### 1. Data Model Updates

**File**: `packages/shared/src/models/application.model.ts`

- Extended `InstallmentPlan` interface with:
  - `calculationMethod`: Added `'balloon_payment'` option
  - `balloonPayment`: Configuration object for balloon payment details
  - `paymentStructure`: Breakdown of payment percentages (down payment %, installment %, balloon %)

- Extended `PaymentSchedule` interface with:
  - `paymentType`: Type of payment (`'down_payment' | 'installment' | 'balloon_payment'`)
  - `isBalloon`: Boolean flag to identify balloon payments

### 2. Utility Functions

**File**: `packages/shared/src/utils/balloon-payment.utils.ts`

Created comprehensive utility functions:

- `validatePaymentStructure()`: Validates that payment percentages sum to 100%
- `calculateBalloonPaymentSchedule()`: Generates complete payment schedule for balloon payment plans
- `calculateBalloonOwnership()`: Calculates ownership percentages for balloon payment plans
- `extractBalloonConfig()`: Extracts balloon configuration from InstallmentPlan

**File**: `packages/shared/src/utils/ownership.utils.ts`

- Added `calculateBalloonOwnership()` function for ownership calculations in balloon payment scenarios

### 3. Admin Panel Updates

**File**: `packages/admin/src/modules/admin/features/applications/components/InstallmentPlanStep/InstallmentPlanStep.tsx`

**Features Added**:
- Checkbox to enable/disable balloon payment structure
- Input fields for payment structure percentages:
  - Down Payment Percentage
  - Installment Percentage
  - Balloon Payment Percentage
- Auto-adjustment logic to maintain 100% total
- Real-time preview of calculated amounts
- Payment schedule table highlighting for balloon payments:
  - Orange background for balloon payment rows
  - "BALLOON" badge on balloon payments
  - Special styling to distinguish from regular payments

**Calculation Logic**:
- When balloon payment is enabled, calculates:
  - Down payment amount from percentage
  - Total installment amount from percentage
  - Balloon payment amount from percentage
  - Monthly principal payment (from installment portion only)
  - Rent calculated on remaining balance (including balloon portion)
  - Final balloon payment includes rent on balloon amount

### 4. Customer-Facing Updates

**File**: `packages/customer/src/modules/customer/features/applications/pages/ApplicationDetailPage/ApplicationDetailPage.tsx`

**Features Added**:
- Payment schedule table highlighting for balloon payments:
  - Orange background and border for balloon payment rows
  - "BALLOON" badge indicator
  - "Final Payment" label
  - Special color coding for balloon payment amounts

### 5. Database Schema

**File**: `supabase-balloon-payment-schema.sql`

- Created SQL migration file for potential database schema updates
- Note: Current implementation uses JSONB storage in `installmentPlan.schedule`, so no schema changes are required
- SQL provided for cases where separate payment_schedules table exists

## Payment Structure Example

For a vehicle priced at 100,000 QAR with a 20/60/20 structure:

- **Down Payment**: 20,000 QAR (20%)
- **Installments**: 60,000 QAR (60%) spread over N months
- **Balloon Payment**: 20,000 QAR (20%) at the end

### Monthly Payment Calculation

1. Principal per month = 60,000 / N months
2. Rent per month = (Remaining Balance) × (Annual Rate / 12)
   - Remaining balance includes the balloon portion until it's paid
3. Monthly payment = Principal + Rent

### Ownership Calculation

- Customer ownership only reaches 100% after balloon payment is made
- Before balloon payment: Max ownership = Down Payment % + Installment %
- After balloon payment: Customer owns 100%

## Usage

### Admin Panel

1. Navigate to Application → Installment Plan step
2. Check "Use Balloon Payment Structure"
3. Enter payment structure percentages:
   - Down Payment: e.g., 20%
   - Installments: e.g., 60%
   - Balloon: e.g., 20%
4. System automatically:
   - Validates percentages sum to 100%
   - Calculates amounts
   - Generates payment schedule
   - Highlights balloon payment in the schedule

### Customer View

- Balloon payments are automatically highlighted in the payment schedule
- Customers can see:
  - Which payment is the balloon payment
  - The final payment amount
  - Visual indicators (orange highlighting, badges)

## Technical Details

### Rent Calculation Strategy

The implementation uses **Option A**: Rent is calculated on the full remaining balance (including balloon portion). This means:
- Higher monthly payments during the installment period
- More accurate representation of ownership split
- Rent decreases as installments are paid, but balloon portion still accrues rent

### Backward Compatibility

- Existing payment plans (dynamic_rent, amortized_fixed) continue to work
- Balloon payment is an additional option, not a replacement
- All existing functionality remains intact

## Files Modified

1. `packages/shared/src/models/application.model.ts` - Data models
2. `packages/shared/src/utils/balloon-payment.utils.ts` - Utility functions (new)
3. `packages/shared/src/utils/ownership.utils.ts` - Ownership calculations
4. `packages/shared/src/utils/index.ts` - Exports
5. `packages/admin/src/modules/admin/features/applications/components/InstallmentPlanStep/InstallmentPlanStep.tsx` - Admin UI
6. `packages/customer/src/modules/customer/features/applications/pages/ApplicationDetailPage/ApplicationDetailPage.tsx` - Customer UI
7. `supabase-balloon-payment-schema.sql` - Database schema (new)

## Testing Recommendations

1. **Admin Panel**:
   - Test percentage validation (must sum to 100%)
   - Test auto-adjustment when changing percentages
   - Verify payment schedule generation
   - Check balloon payment highlighting

2. **Customer View**:
   - Verify balloon payments are highlighted correctly
   - Check ownership calculations
   - Test payment schedule display

3. **Edge Cases**:
   - 0% down payment (100% installments + balloon)
   - 0% balloon (standard payment plan)
   - Very high balloon percentage (e.g., 50%)
   - Different tenure lengths

## Future Enhancements

Potential improvements:
1. Early balloon payment option
2. Balloon payment refinancing
3. Grace period for balloon payments
4. Different rental rates for balloon portion
5. Balloon payment reminders/notifications
6. Customer-facing calculator for balloon payments

## Notes

- The implementation maintains full backward compatibility
- All existing payment plans continue to work
- Balloon payment is an optional feature that can be enabled per application
- Rent calculation includes the balloon portion for accurate ownership representation
