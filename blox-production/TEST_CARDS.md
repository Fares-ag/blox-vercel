# SkipCash Payment Gateway - Test Cards

This document provides test card information for testing payment gateway functionality within the Blox application. These test cards are designed to facilitate seamless testing for developers and QA teams who are integrating and validating payment gateway functionalities.

## Important Notes

- These cards are **for testing purposes only** and should **never** be used in production
- Real transactions will **not** be processed when using these test cards
- These cards simulate various transaction scenarios to help you test your payment integration

## How to Use

1. Use these test cards in the SkipCash payment gateway during development and QA testing
2. Each card is configured to produce specific responses to help you test different scenarios
3. Test both successful and failed cases to ensure your application handles all payment states correctly

---

## Successful Payment Test Cards

These cards will result in **successful payment transactions**:

| Card Type | Card Number | Expiry Date | CVV |
|-----------|-------------|-------------|-----|
| MasterCard | 5200 0000 0000 2151 | 10/2028 | 237 |
| Visa | 4000 0000 0000 2503 | 10/2028 | 442 |
| MasterCard (Non-3DS) | 5200 0000 0000 0007 | 04/26 | 256 |

### Usage Instructions:
- Enter the card number exactly as shown (with or without spaces)
- Use the expiry date in MM/YY format
- Enter the CVV as shown

---

## Failed Payment Test Cards

These cards will result in **failed payment transactions** to test error handling:

| Card Type | Card Number | Expiry Date | CVV |
|-----------|-------------|-------------|-----|
| MasterCard | 5200 0000 0000 2490 | 04/2028 | 256 |
| Visa | 4000 0000 0000 2370 | 06/2028 | 256 |

### Usage Instructions:
- Use these cards to test how your application handles declined transactions
- Verify that appropriate error messages are displayed to users
- Ensure failed transactions do not affect application state incorrectly

---

## Test Debit Card (NAPS - Qatar National Payment System)

For testing Qatari debit card payments:

| Card Number | Expiry | OTP | CVV |
|-------------|--------|-----|-----|
| 4215 3755 0088 3243 | 06/2026 | 123456 | 123 |

### Usage Instructions:
- Use this card for testing NAPS (Qatar National Payment System) debit card payments
- Enter the OTP when prompted during payment flow
- This card simulates QPay/debit card transactions

---

## Testing Scenarios

### 1. Successful Credit Top-Up
- **Card**: MasterCard 5200 0000 0000 2151
- **Expected Result**: Payment processes successfully, credits are added to account
- **Verify**: 
  - Credits balance updates in navigation bar
  - Success message displayed
  - Transaction recorded correctly

### 2. Failed Payment Handling
- **Card**: MasterCard 5200 0000 0000 2490
- **Expected Result**: Payment is declined, appropriate error message shown
- **Verify**:
  - Error message displayed to user
  - Credits are NOT added to account
  - User can retry payment

### 3. Visa Card Transaction
- **Card**: Visa 4000 0000 0000 2503
- **Expected Result**: Successful Visa card transaction
- **Verify**: Payment processes and credits are added

### 4. Non-3DS Card Transaction
- **Card**: MasterCard (Non-3DS) 5200 0000 0000 0007
- **Expected Result**: Successful transaction without 3D Secure authentication
- **Verify**: Payment completes without additional authentication steps

### 5. Debit Card (NAPS) Transaction
- **Card**: 4215 3755 0088 3243
- **Expected Result**: Successful Qatari debit card transaction
- **Verify**: 
  - OTP prompt appears
  - Enter OTP: 123456
  - Payment completes successfully

---

## Payment Integration Points in Blox

### 1. Credit Top-Up
- **Location**: Navigation Bar → Blox Credits Wallet → Top Up
- **Payment Gateway**: SkipCash
- **Callback**: `/customer/credit-topup-callback`

### 2. Application Payment
- **Location**: Application Detail Page → Pay Now
- **Payment Gateway**: SkipCash
- **Callback**: `/customer/applications/:id/payment-callback`

### 3. Payment Calendar
- **Location**: Payment Calendar Page → Upcoming Payments
- **Payment Gateway**: SkipCash
- **Callback**: `/customer/applications/:id/payment-callback`

---

## Testing Checklist

When testing payment functionality, verify the following:

- [ ] Successful payment flow completes without errors
- [ ] Failed payment displays appropriate error message
- [ ] Credits balance updates correctly after successful top-up
- [ ] Payment callback page verifies transaction status correctly
- [ ] Transaction details are displayed accurately
- [ ] Navigation bar credits display updates automatically
- [ ] Pending transactions are handled correctly
- [ ] User can retry failed payments
- [ ] Payment history records transactions correctly
- [ ] Different card types (MasterCard, Visa) work correctly
- [ ] Debit card (NAPS) flow works with OTP

---

## Troubleshooting

### Payment Not Processing
- Verify you're using the correct test card numbers
- Check that expiry dates are in the future
- Ensure CVV is entered correctly

### Credits Not Updating
- Check browser console for errors
- Verify localStorage is being updated
- Check that callback page is processing correctly

### Callback Not Working
- Verify return URL is correctly configured
- Check SkipCash dashboard for webhook status
- Ensure transaction ID matches between request and callback

---

## Support

For issues with test cards or payment gateway integration:
- Check SkipCash documentation
- Review payment callback logs
- Verify webhook configuration in SkipCash dashboard

---

**Last Updated**: January 2025  
**Payment Gateway**: SkipCash  
**Environment**: Development/Testing
