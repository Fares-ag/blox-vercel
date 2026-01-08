# SkipCash Test Cards

Use these test cards to test the payment integration in sandbox mode.

## ✅ Successful Payment Test Cards

| Card Type | Card Number | Expiry Date | CVV |
|-----------|-------------|-------------|-----|
| MasterCard | 5200 0000 0000 2151 | 10/2028 | 237 |
| Visa | 4000 0000 0000 2503 | 10/2028 | 442 |
| MasterCard (Non-3DS) | 5200 0000 0000 0007 | 04/26 | 256 |

## ❌ Failed Payment Test Cards

| Card Type | Card Number | Expiry Date | CVV |
|-----------|-------------|-------------|-----|
| MasterCard | 5200 0000 0000 2490 | 04/2028 | 256 |
| Visa | 4000 0000 0000 2370 | 06/2028 | 256 |

## 💳 Test Debit Card (NAPS/QPAY)

| Card Number | Expiry | OTP | CVV |
|-------------|--------|-----|-----|
| 4215 3755 0088 3243 | 06/2026 | 123456 | 123 |

## Testing Instructions

1. **Make sure you're in Sandbox mode**:
   - Check `SKIPCASH_USE_SANDBOX=true` in Supabase secrets
   - Use sandbox URL: `https://skipcashtest.azurewebsites.net`

2. **Use unique phone and email** for each test:
   - SkipCash requires unique phone/email per transaction
   - Use format: `test+{timestamp}@example.com`

3. **Test successful payments**:
   - Use MasterCard `5200 0000 0000 2151` or Visa `4000 0000 0000 2503`
   - Should redirect to SkipCash payment page
   - Complete payment with test card details

4. **Test failed payments**:
   - Use MasterCard `5200 0000 0000 2490` or Visa `4000 0000 0000 2370`
   - Should show payment failure

5. **Test QPAY/Debit Card**:
   - Use card `4215 3755 0088 3243`
   - OTP: `123456`
   - CVV: `123`

## Notes

- These cards only work in **Sandbox/Test mode**
- Each transaction requires a **unique phone number and email**
- Test cards simulate various payment scenarios
- Use these to verify your integration handles success and failure cases correctly

