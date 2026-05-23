# SkipCash Sandbox Quick Test Guide

This is a quick reference guide to verify your SkipCash sandbox is working properly.

## 🚀 Quick Verification Steps (5 minutes)

### Step 1: Check Supabase Secrets (1 minute)

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Verify these secrets exist:
   - ✅ `SKIPCASH_USE_SANDBOX` = `true`
   - ✅ `SKIPCASH_SECRET_KEY` = (your secret key)
   - ✅ `SKIPCASH_KEY_ID` = (your key ID)
   - ✅ `SKIPCASH_CLIENT_ID` = (your client ID)

**If any are missing:** Add them and redeploy Edge Functions.

---

### Step 2: Test Edge Function Connectivity (1 minute)

**In Browser Console:**
```javascript
import { supabase } from '@shared/services';

// Test if Edge Function is accessible
const test = await supabase.functions.invoke('skipcash-payment', {
  body: {
    amount: 1,
    firstName: 'Test',
    lastName: 'User',
    phone: '1234567890',
    email: 'test@example.com',
    transactionId: 'TEST-' + Date.now()
  }
});

console.log('Result:', test);
```

**Expected Results:**
- ✅ If credentials missing: Error with list of missing credentials
- ✅ If credentials present: Either success with payment URL or validation error

---

### Step 3: Test Credit Top-Up (2 minutes)

1. **Navigate to App:**
   - Open customer app
   - Click on **Blox Credits** wallet in navigation bar
   - Click **Top Up**

2. **Enter Test Amount:**
   - Enter **1 credit** (250 QAR)
   - Click **Proceed to Payment**

3. **Verify Redirect:**
   - ✅ Should redirect to SkipCash sandbox URL
   - ✅ URL should contain `skipcashtest.azurewebsites.net` (sandbox)
   - ✅ Payment amount should be 250 QAR

4. **Complete Payment:**
   - Use test card: **5200 0000 0000 2151**
   - Expiry: **10/2028**
   - CVV: **237**
   - Complete payment

5. **Verify Callback:**
   - ✅ Should redirect to `/customer/credit-topup-callback`
   - ✅ Status should show "Top Up Successful!"
   - ✅ Credits should be added to account
   - ✅ Navigation bar should show updated credits

---

### Step 4: Check Edge Function Logs (1 minute)

1. Go to **Supabase Dashboard** → **Edge Functions** → **Logs**
2. Select `skipcash-payment` function
3. Check recent logs for:

**✅ Success Indicators:**
```
SkipCash config loaded: {
  useSandbox: true,
  apiUrl: "https://skipcashtest.azurewebsites.net",
  hasKeyId: true,
  hasSecretKey: true,
  hasClientId: true
}
Sending request to SkipCash: { ... }
SkipCash payment request successful: { ... }
```

**❌ Error Indicators:**
```
Missing SkipCash credentials: [SKIPCASH_SECRET_KEY]
SkipCash credentials not configured
SkipCash API error: { ... }
```

---

## ✅ Verification Checklist

Mark each item as you verify:

### Configuration
- [ ] All required secrets are set in Supabase
- [ ] `SKIPCASH_USE_SANDBOX` is `true`
- [ ] Edge Functions are deployed

### Functionality  
- [ ] Edge Function responds (no credential errors)
- [ ] Payment redirects to sandbox URL
- [ ] Test payment completes successfully
- [ ] Credits are added after successful payment
- [ ] Callback page displays correctly

### Error Handling
- [ ] Missing credentials show error
- [ ] Failed payments show error message
- [ ] Network errors are handled

---

## 🐛 Quick Troubleshooting

### Problem: "SkipCash credentials not configured"

**Fix:**
1. Check Supabase Dashboard → Edge Functions → Secrets
2. Add missing secrets
3. Redeploy Edge Functions

### Problem: Redirects to production URL instead of sandbox

**Fix:**
1. Verify `SKIPCASH_USE_SANDBOX=true` in Supabase secrets
2. Check Edge Function logs to confirm sandbox mode
3. Redeploy if needed

### Problem: Payment completes but credits not added

**Fix:**
1. Check browser console for JavaScript errors
2. Verify callback page is processing correctly
3. Check localStorage for `blox_credits` value
4. Verify `CreditTopUpCallbackPage` route exists

### Problem: Test cards not working

**Fix:**
1. Verify correct test card numbers (see [TEST_CARDS.md](./TEST_CARDS.md))
2. Check expiry dates are in the future
3. Ensure CVV is correct
4. Verify sandbox mode is enabled

---

## 📊 Status Indicators

### ✅ All Good (Sandbox Working)
- Edge Function logs show: `useSandbox: true`
- Redirect URL contains: `skipcashtest.azurewebsites.net`
- Test payments complete successfully
- Credits update correctly

### ⚠️ Needs Attention
- Some secrets missing → Add them
- Wrong URL (production instead of sandbox) → Check `SKIPCASH_USE_SANDBOX`
- Payment fails → Check test cards and logs

### ❌ Not Working
- Edge Function not accessible → Check deployment
- All secrets missing → Add all required secrets
- Signature errors → Verify credentials with SkipCash support

---

## 🔗 Related Documentation

- **Full Verification Guide**: [SKIPCASH_SANDBOX_VERIFICATION.md](./SKIPCASH_SANDBOX_VERIFICATION.md)
- **Test Cards**: [TEST_CARDS.md](./TEST_CARDS.md)
- **Troubleshooting**: See troubleshooting section in full guide

---

## 💡 Pro Tips

1. **Always check Edge Function logs first** - they show exactly what's happening
2. **Use test cards from TEST_CARDS.md** - they're guaranteed to work in sandbox
3. **Test failed payments too** - ensures error handling works
4. **Check Supabase Dashboard regularly** - monitor transaction statuses

---

**Quick Test Duration**: ~5 minutes  
**Status**: ✅ Ready if all checks pass
