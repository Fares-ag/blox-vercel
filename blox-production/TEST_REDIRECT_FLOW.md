# Testing the Payment Redirect Flow

This guide explains how to test the complete payment redirect flow for Blox Credits top-up.

## Overview

The redirect flow works as follows:

1. **User initiates top-up** → Clicks "Top Up" in Blox Credits wallet
2. **Payment request created** → SkipCash payment is created via Edge Function
3. **Redirect to SkipCash** → User is redirected to SkipCash payment page
4. **User completes payment** → Enters card details on SkipCash page
5. **SkipCash redirects back** → User is redirected to callback URL
6. **Payment verification** → Callback page verifies payment status
7. **Credits updated** → Credits are added to user's account

---

## Step-by-Step Testing Guide

### Prerequisites

1. ✅ Customer app is running (`npm run dev` in `packages/customer`)
2. ✅ You're logged in as a customer
3. ✅ Supabase Edge Functions are deployed
4. ✅ SkipCash sandbox credentials are configured
5. ✅ Browser Developer Tools are open (F12)

### Test Flow

#### Step 1: Open Browser Developer Tools

1. Open your browser (Chrome/Firefox recommended)
2. Press `F12` or `Right-click → Inspect` to open Developer Tools
3. Go to the **Network** tab to monitor requests
4. Go to the **Console** tab to see logs

#### Step 2: Initiate Credit Top-Up

1. Navigate to the customer dashboard: `http://localhost:5173/customer/dashboard`
2. Look for the **Blox Credits** wallet in the navigation bar (top right)
3. Click the **+** button or click on the wallet itself
4. Enter the number of credits you want to buy (e.g., `50`)
5. Click **"Proceed to Payment"**

**What to watch for:**
- Check the **Console** for logs showing:
  - `SkipCash config loaded`
  - `Payment request being sent to SkipCash`
  - `SkipCash payment request successful`
  - `Redirecting to SkipCash payment page: https://skipcashtest.azurewebsites.net/pay/...`
- Check the **Network** tab for:
  - Request to `/functions/v1/skipcash-payment` (POST)
  - Response status: `200 OK`
  - Response body should contain `paymentUrl` or `payUrl`

#### Step 3: Verify Redirect to SkipCash

**Expected behavior:**
- The page should automatically redirect to SkipCash payment page
- URL should be: `https://skipcashtest.azurewebsites.net/pay/{paymentId}`
- You should see the SkipCash payment form

**If redirect doesn't happen:**
- Check browser console for errors
- Look for the log: `Redirecting to SkipCash payment page: ...`
- If you see `Payment initiation failed:` log, check the error details
- Verify the payment URL is present in the response:
  ```javascript
  // In console, after clicking "Proceed to Payment":
  // Should see: "Redirecting to SkipCash payment page: https://..."
  ```
- Check if browser is blocking redirects (pop-up blocker)
- Try manually navigating: Copy the payment URL from console and paste in address bar

#### Step 4: Complete Payment on SkipCash

1. On the SkipCash payment page, enter test card details:

   **For Successful Payment:**
   - **Card Number:** `5200 0000 0000 2151`
   - **Expiry:** `10/2028`
   - **CVV:** `237`
   - **Cardholder Name:** Any name

2. Click **"Pay"** or **"Submit"**

**What to watch for:**
- Payment processing indicator
- 3D Secure authentication (if required)
- Success/failure message

#### Step 5: Verify Redirect Back to Callback

**Expected behavior:**
- After payment, SkipCash should redirect you back to:
  - `http://localhost:5173/customer/credit-topup-callback?transactionId={transactionId}&credits={credits}`
- You should see the callback page loading/verifying

**If redirect doesn't happen:**
- Check SkipCash return URL configuration
- Verify the `returnUrl` in the payment request matches your callback route
- Check browser console for errors

#### Step 6: Verify Payment Status

**On the callback page, you should see:**

1. **Loading state:**
   - Circular progress indicator
   - "Verifying Top-Up..." message

2. **Success state:**
   - ✅ Green checkmark icon
   - "Top-Up Successful!" message
   - Transaction details (Transaction ID, Credits Added)
   - "Back to Dashboard" button

3. **Failed state:**
   - ❌ Red error icon
   - Error message
   - "Verify Again" button

**What to watch for:**
- Check **Console** for verification logs
- Check **Network** tab for:
  - Request to `/functions/v1/skipcash-verify`
  - Response with payment status

#### Step 7: Verify Credits Updated

1. After successful payment, click **"Back to Dashboard"**
2. Check the **Blox Credits** wallet in the navigation bar
3. The balance should be updated with the new credits

**What to watch for:**
- Credits balance increases by the amount purchased
- Success toast notification appears
- No errors in console

---

## Testing Different Scenarios

### Scenario 1: Successful Payment

- **Card:**** MasterCard `5200 0000 0000 2151`
- **Expected:** Payment succeeds, credits added, success page shown

### Scenario 2: Failed Payment

- **Card:** MasterCard `5200 0000 0000 2490`
- **Expected:** Payment fails, error message shown, credits NOT added

### Scenario 3: Canceled Payment

- **Action:** Click "Cancel" on SkipCash page
- **Expected:** Redirected back with canceled status, credits NOT added

### Scenario 4: Payment Pending

- **Action:** Payment is still processing
- **Expected:** "Payment Processing" message, option to check status again

---

## Debugging Tips

### Redirect Not Happening

1. **Check the payment response in console:**
   - Look for: `Redirecting to SkipCash payment page: ...`
   - If you see `Payment initiation failed:`, expand the error object to see details

2. **Manually test the redirect:**
   ```javascript
   // In browser console, after payment request:
   // Check localStorage for pending transaction
   const pending = JSON.parse(localStorage.getItem('pending_credit_topup_CREDIT-...') || '{}');
   console.log('Pending transaction:', pending);
   
   // If you have the payment URL, test redirect manually:
   // window.location.href = 'https://skipcashtest.azurewebsites.net/pay/{paymentId}';
   ```

3. **Check for errors:**
   - Look for CORS errors in Network tab
   - Check if payment URL is `undefined` in console
   - Verify SkipCash response structure matches expected format
   - Check browser console for any JavaScript errors

### Callback Not Working

1. **Check return URL:**
   - Should match: `http://localhost:5173/customer/credit-topup-callback?transactionId=...&credits=...`
   - Verify SkipCash is configured to redirect to this URL

2. **Check localStorage:**
   ```javascript
   // In browser console:
   console.log('Pending top-up:', localStorage.getItem('pending_credit_topup'));
   ```

3. **Verify paymentId:**
   - The callback needs `paymentId` from SkipCash
   - Check if it's stored in localStorage before redirect

### Credits Not Updating

1. **Check localStorage:**
   ```javascript
   // In browser console:
   console.log('Blox Credits:', localStorage.getItem('blox_credits'));
   ```

2. **Check event dispatch:**
   ```javascript
   // Should see in console:
   // Event 'creditTopUpSuccess' dispatched
   ```

3. **Verify callback verification:**
   - Check Supabase logs for verification request
   - Verify payment status is `paid` (statusId: 2)

---

## Quick Test Commands

### In Browser Console

```javascript
// Check current credits
console.log('Credits:', localStorage.getItem('blox_credits'));

// Check pending top-up
console.log('Pending:', localStorage.getItem('pending_credit_topup'));

// Manually trigger credit update (for testing)
localStorage.setItem('blox_credits', '100');
window.dispatchEvent(new CustomEvent('creditTopUpSuccess', { 
  detail: { newBalance: 100 } 
}));
```

### Network Monitoring

1. Open **Network** tab in DevTools
2. Filter by `skipcash` or `payment`
3. Look for:
   - `skipcash-payment` request (POST)
   - `skipcash-verify` request (POST)
   - Redirects to `skipcashtest.azurewebsites.net`

---

## Expected Console Logs

### During Payment Creation

```
SkipCash config loaded: { useSandbox: true, ... }
Payment request being sent to SkipCash: { ... }
SkipCash payment request successful: { paymentId: "...", hasPaymentUrl: true }
```

### During Payment Verification

```
Verifying payment: { transactionId: "...", paymentId: "..." }
SkipCash verify response: { status: "paid", statusId: 2 }
Payment verified successfully
Credits updated: { oldBalance: 0, newBalance: 50 }
```

---

## Common Issues

### Issue: "Payment URL is undefined"

**Solution:**
- Check browser console for `Payment initiation failed:` log
- Verify the response structure:
  ```javascript
  // The code checks multiple possible paths:
  // result.data.paymentUrl
  // result.data.resultObj.paymentUrl
  // result.data.payUrl
  // result.data.resultObj.payUrl
  ```
- Check Supabase logs for actual SkipCash response
- Verify Edge Function is mapping `payUrl` → `paymentUrl` correctly
- Check Network tab → Response tab for the actual response structure

### Issue: "Redirect blocked by browser"

**Solution:**
- Allow pop-ups/redirects for `localhost:5173`
- Check browser security settings
- Try in incognito mode

### Issue: "Callback page shows error"

**Solution:**
- Verify `paymentId` is stored in localStorage before redirect
- Check if SkipCash is sending correct return URL
- Verify callback route exists: `/customer/credit-topup-callback`

### Issue: "Credits not updating"

**Solution:**
- Check if `creditTopUpSuccess` event is dispatched
- Verify event listener is set up in CustomerNav
- Check localStorage for `blox_credits` value

---

## Success Criteria

✅ Payment request creates successfully  
✅ User is redirected to SkipCash payment page  
✅ Payment can be completed with test card  
✅ SkipCash redirects back to callback URL  
✅ Payment status is verified correctly  
✅ Credits are added to user's account  
✅ Navigation bar shows updated credits balance  
✅ Success message is displayed  

---

## Next Steps

After testing the redirect flow:

1. Test with different card types (Visa, MasterCard, Debit)
2. Test error scenarios (failed payments, cancellations)
3. Test with different credit amounts
4. Verify transaction history (if implemented)
5. Test on different browsers/devices

---

**Last Updated:** January 2026  
**Environment:** Development/Testing  
**Payment Gateway:** SkipCash Sandbox
