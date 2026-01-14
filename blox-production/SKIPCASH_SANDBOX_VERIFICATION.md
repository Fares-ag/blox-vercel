# SkipCash Sandbox Verification Guide

This guide will help you verify that the SkipCash payment gateway sandbox is properly configured and working.

## 📋 Prerequisites

Before testing, ensure you have:
- ✅ SkipCash sandbox account credentials
- ✅ Supabase project with Edge Functions enabled
- ✅ SkipCash credentials configured in Supabase secrets
- ✅ Test cards ready (see [TEST_CARDS.md](./TEST_CARDS.md))

---

## 🔧 Step 1: Verify Supabase Edge Functions Configuration

### Check Edge Functions Are Deployed

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Verify these functions exist:
   - ✅ `skipcash-payment`
   - ✅ `skipcash-verify`
   - ✅ `skipcash-webhook`

### Verify Environment Variables (Secrets)

The SkipCash Edge Functions require these secrets to be set in Supabase:

1. In Supabase Dashboard, go to **Edge Functions** → **Secrets**
2. Verify these environment variables are set:

| Variable Name | Required | Example Value | Description |
|--------------|----------|---------------|-------------|
| `SKIPCASH_USE_SANDBOX` | ✅ Yes | `true` | Use sandbox environment |
| `SKIPCASH_SANDBOX_URL` | ⚠️ Optional | `https://skipcashtest.azurewebsites.net` | Sandbox API URL (has default) |
| `SKIPCASH_PRODUCTION_URL` | ⚠️ Optional | `https://api.skipcash.app` | Production API URL (has default) |
| `SKIPCASH_SECRET_KEY` | ✅ Yes | `...` | Your SkipCash secret key |
| `SKIPCASH_KEY_ID` | ✅ Yes | `...` | Your SkipCash key ID |
| `SKIPCASH_CLIENT_ID` | ✅ Yes | `...` | Your SkipCash client ID |

### How to Set Secrets in Supabase

**Using Supabase Dashboard:**
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Click **Add Secret**
3. Enter variable name (e.g., `SKIPCASH_SECRET_KEY`)
4. Enter the value
5. Click **Save**

**Using Supabase CLI:**
```bash
# Set individual secrets
supabase secrets set SKIPCASH_USE_SANDBOX=true
supabase secrets set SKIPCASH_SECRET_KEY=your_secret_key
supabase secrets set SKIPCASH_KEY_ID=your_key_id
supabase secrets set SKIPCASH_CLIENT_ID=your_client_id

# Or use a .env file
supabase secrets set --env-file .env.skipcash
```

---

## 🧪 Step 2: Test Edge Function Connectivity

### Test 1: Verify Edge Function is Accessible

**Using Browser Console:**
```javascript
// In your browser console on the app
import { supabase } from '@shared/services';

// Test skipcash-payment function (without actual payment)
const testResponse = await supabase.functions.invoke('skipcash-payment', {
  body: {
    amount: 1,
    firstName: 'Test',
    lastName: 'User',
    phone: '1234567890',
    email: 'test@example.com',
    transactionId: 'TEST-' + Date.now(),
  }
});

console.log('Edge Function Response:', testResponse);
```

**Expected Result:**
- ✅ If credentials are missing: Error message indicating missing credentials
- ✅ If credentials are set: Either success (with payment URL) or validation error

### Test 2: Check Function Logs

1. In Supabase Dashboard, go to **Edge Functions** → **Logs**
2. Select `skipcash-payment` function
3. Trigger a test payment
4. Check logs for:
   - ✅ Configuration loaded message
   - ✅ Sandbox/production mode indicator
   - ✅ API request details
   - ❌ Any error messages

**Expected Log Output (Success):**
```
SkipCash config loaded: {
  useSandbox: true,
  apiUrl: "https://skipcashtest.azurewebsites.net",
  hasKeyId: true,
  hasSecretKey: true,
  hasClientId: true
}
Sending request to SkipCash: { ... }
```

---

## 💳 Step 3: Test Payment Flow

### Test Scenario 1: Successful Payment

1. **Navigate to Credit Top-Up:**
   - Click on Blox Credits wallet in navigation bar
   - Enter number of credits (e.g., 1 credit = 250 QAR)
   - Click "Proceed to Payment"

2. **Verify Redirect:**
   - ✅ Should redirect to SkipCash payment page
   - ✅ URL should be from SkipCash sandbox domain
   - ✅ Payment amount should be displayed correctly

3. **Complete Test Payment:**
   - Use test card: **MasterCard 5200 0000 0000 2151**
   - Expiry: **10/2028**
   - CVV: **237**
   - Complete payment

4. **Verify Callback:**
   - ✅ Should redirect back to `/customer/credit-topup-callback`
   - ✅ Payment status should be verified
   - ✅ Credits should be added to account
   - ✅ Success message displayed

### Test Scenario 2: Failed Payment

1. **Initiate Payment:**
   - Same as Scenario 1, but use failed test card

2. **Use Failed Test Card:**
   - **MasterCard 5200 0000 0000 2490**
   - Expiry: **04/2028**
   - CVV: **256**

3. **Verify Error Handling:**
   - ✅ Payment should be declined on SkipCash page
   - ✅ Should redirect back with error status
   - ✅ Credits should NOT be added
   - ✅ Error message displayed to user

### Test Scenario 3: Payment Verification

1. **Complete a Successful Payment** (from Scenario 1)
2. **Check Callback Page:**
   - Transaction ID should be displayed
   - Payment amount should match
   - Status should be "success"
   - Credits should be updated

3. **Verify Credits Updated:**
   - Check navigation bar wallet balance
   - Should show new credit balance
   - localStorage should contain updated balance

---

## 🔍 Step 4: Verify API Integration

### Check SkipCash API Responses

**Expected Response Structure:**

**Payment Request Response (Success):**
```json
{
  "status": "SUCCESS",
  "data": {
    "resultObj": {
      "paymentUrl": "https://skipcashtest.azurewebsites.net/pay/...",
      "paymentId": "PAY-1234567890",
      "status": "new"
    }
  },
  "message": "Payment request generated successfully"
}
```

**Payment Verification Response (Success):**
```json
{
  "status": "SUCCESS",
  "data": {
    "paymentId": "PAY-1234567890",
    "status": 2,
    "statusId": 2,
    "amount": "250.00",
    "cardType": "MasterCard"
  },
  "message": "Payment verified successfully"
}
```

### Status Code Mapping

| Status ID | Status | Meaning |
|-----------|--------|---------|
| 0 | `new` | Payment created, awaiting payment |
| 1 | `pending` | Payment in progress |
| 2 | `paid` | ✅ Payment successful |
| 3 | `canceled` | Payment canceled by user |
| 4 | `failed` | ❌ Payment failed |
| 5 | `rejected` | ❌ Payment rejected |

---

## ✅ Verification Checklist

Use this checklist to ensure everything is working:

### Configuration
- [ ] SkipCash sandbox credentials are set in Supabase secrets
- [ ] `SKIPCASH_USE_SANDBOX` is set to `true`
- [ ] All required secrets are present (SECRET_KEY, KEY_ID, CLIENT_ID)
- [ ] Edge Functions are deployed and accessible

### Functionality
- [ ] Payment initiation redirects to SkipCash sandbox URL
- [ ] Test successful payment completes and adds credits
- [ ] Test failed payment shows error message
- [ ] Payment callback verifies transaction correctly
- [ ] Credits balance updates after successful payment
- [ ] Transaction details are displayed correctly
- [ ] Navigation bar credits display updates automatically

### Error Handling
- [ ] Missing credentials show appropriate error
- [ ] Failed payments don't add credits
- [ ] Network errors are handled gracefully
- [ ] User can retry failed payments
- [ ] Pending payments show appropriate status

### Integration Points
- [ ] Credit top-up flow works end-to-end
- [ ] Application payment flow works end-to-end
- [ ] Payment calendar payment flow works
- [ ] All payment methods are tested (Card, NAPS)

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "SkipCash credentials not configured"

**Symptoms:**
- Error message when trying to process payment
- Edge function logs show missing credentials

**Solution:**
1. Check Supabase Dashboard → Edge Functions → Secrets
2. Verify all required secrets are set
3. Ensure secret names match exactly (case-sensitive)
4. Redeploy Edge Functions if secrets were just added

### Issue 2: "Signature mismatch" error

**Symptoms:**
- Payment request fails with signature error
- SkipCash API returns authentication error

**Solution:**
1. Verify `SKIPCASH_SECRET_KEY` is correct and complete
2. Check that secret key hasn't been truncated
3. Verify `SKIPCASH_KEY_ID` matches the secret key
4. Contact SkipCash support if credentials are correct

### Issue 3: Redirect to wrong URL

**Symptoms:**
- Redirects to production SkipCash instead of sandbox
- Or vice versa

**Solution:**
1. Check `SKIPCASH_USE_SANDBOX` is set to `true` for sandbox
2. Verify `SKIPCASH_SANDBOX_URL` is correct
3. Check Edge Function logs to confirm which URL is being used
4. Redeploy Edge Functions after changing secrets

### Issue 4: Payment completes but credits not added

**Symptoms:**
- Payment shows success on SkipCash
- But credits aren't added to account
- Callback page shows success

**Solution:**
1. Check browser console for JavaScript errors
2. Verify callback page is processing payment correctly
3. Check localStorage for `blox_credits` value
4. Verify `CreditTopUpCallbackPage` is updating credits
5. Check network tab for callback verification request

### Issue 5: Test cards not working

**Symptoms:**
- Test cards are declined even though they should work
- Payment fails immediately

**Solution:**
1. Verify you're using correct test card numbers (see [TEST_CARDS.md](./TEST_CARDS.md))
2. Ensure expiry dates are in the future
3. Check CVV is entered correctly
4. Verify you're testing in sandbox mode (not production)
5. Try different test cards to rule out card-specific issues

---

## 🔐 Security Checklist

Before going to production:

- [ ] Verify `SKIPCASH_USE_SANDBOX` is set correctly per environment
- [ ] Production secrets are different from sandbox secrets
- [ ] Secret keys are never exposed in client-side code
- [ ] Webhook URLs are configured correctly
- [ ] Transaction IDs are unique and properly formatted
- [ ] Payment amounts are validated before sending to SkipCash
- [ ] Error messages don't expose sensitive information

---

## 📊 Monitoring & Logging

### What to Monitor

1. **Edge Function Logs:**
   - Payment initiation success rate
   - Verification success rate
   - Error rates and types

2. **Application Logs:**
   - Failed payment attempts
   - Callback processing errors
   - Credits update failures

3. **SkipCash Dashboard:**
   - Transaction statuses
   - Webhook delivery status
   - API call success rates

### Recommended Logging

Check Supabase Edge Functions logs for:
- ✅ Configuration loaded (sandbox/production)
- ✅ API requests sent to SkipCash
- ✅ API responses received
- ❌ Any errors or exceptions
- ⚠️ Warnings about incomplete credentials

---

## 🧪 Automated Testing (Future Enhancement)

Consider creating automated tests for:

1. **Unit Tests:**
   - SkipCash service methods
   - Payment request formatting
   - Response parsing

2. **Integration Tests:**
   - End-to-end payment flow
   - Callback verification
   - Credits update logic

3. **E2E Tests:**
   - Complete payment flow with Playwright/Cypress
   - Test all payment scenarios
   - Verify UI updates

---

## 📞 Support Resources

- **SkipCash Documentation**: Check SkipCash official documentation
- **SkipCash Dashboard**: https://dashboard.skipcash.app (or sandbox equivalent)
- **Supabase Edge Functions Docs**: https://supabase.com/docs/guides/functions
- **Test Cards**: See [TEST_CARDS.md](./TEST_CARDS.md)

---

## ✅ Final Verification

Once all checks pass:

1. ✅ Sandbox credentials are configured
2. ✅ Edge Functions are accessible
3. ✅ Test payments complete successfully
4. ✅ Failed payments show errors correctly
5. ✅ Callbacks verify transactions
6. ✅ Credits update correctly
7. ✅ Error handling works properly
8. ✅ All integration points tested

**Your SkipCash sandbox is ready for testing! 🎉**

---

**Last Updated**: January 2025  
**Environment**: Sandbox/Testing  
**Payment Gateway**: SkipCash
