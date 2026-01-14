# Quick Test: Payment Redirect

## 🚀 Quick Start

1. **Open your browser** and go to: `http://localhost:5173/customer/dashboard`
2. **Open Developer Tools** (F12) → Go to **Console** tab
3. **Click the Blox Credits wallet** (top right) → Click **+** button
4. **Enter credits** (e.g., `50`) → Click **"Proceed to Payment"**

## ✅ What Should Happen

1. **Console shows:**
   ```
   Redirecting to SkipCash payment page: https://skipcashtest.azurewebsites.net/pay/...
   ```

2. **Browser redirects** to SkipCash payment page automatically

3. **Enter test card:**
   - Card: `5200 0000 0000 2151`
   - Expiry: `10/2028`
   - CVV: `237`

4. **After payment**, you're redirected back to callback page

5. **Credits update** in the navigation bar

## 🔍 If Redirect Doesn't Work

**Check Console:**
- Look for: `Payment initiation failed:` (expand to see details)
- Check if `paymentUrl` is `undefined`

**Check Network Tab:**
- Find request to `/functions/v1/skipcash-payment`
- Check Response → Should have `paymentUrl` or `payUrl`

**Manual Test:**
```javascript
// In console, after clicking "Proceed to Payment":
// Check what was stored:
const keys = Object.keys(localStorage).filter(k => k.includes('credit_topup'));
console.log('Pending transactions:', keys);
```

## 📋 Full Testing Guide

See `TEST_REDIRECT_FLOW.md` for complete testing instructions.
