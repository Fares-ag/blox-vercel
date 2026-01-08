# Testing SkipCash Payment Integration

## 🧪 Complete Testing Guide

### Prerequisites Checklist

Before testing, verify:
- [x] ✅ Secrets added to Supabase
- [x] ✅ Edge Functions deployed
- [ ] ⚠️ Webhook URL configured in SkipCash (if not done yet)

## Step 1: Access Payment Page

### Option A: From Customer Application

1. **Start your development server** (if not running):
   ```bash
   npm run dev:customer
   ```

2. **Navigate to a payment page**:
   - Go to: `http://localhost:5173/customer/my-applications`
   - Click on an active application
   - Click "Make Payment" or navigate to payment page
   - URL should be: `/customer/my-applications/[application-id]/payment`

### Option B: Direct URL

If you have an application ID:
```
http://localhost:5173/customer/my-applications/[application-id]/payment
```

## Step 2: Test Card Payment Flow

### 1. Select Payment Method
- On the payment page, select **"Credit/Debit Card"**
- You should see card input fields

### 2. Fill in Test Card Details

**SkipCash Sandbox Test Cards** (use these for testing):

#### Successful Payment:
- **Card Number**: `4111111111111111` (Visa test card)
- **Expiry Month**: `12`
- **Expiry Year**: `2025` (or any future year)
- **CVV**: `123`
- **Cardholder Name**: `Test User`

#### Failed Payment (for testing failures):
- **Card Number**: `4000000000000002` (declined card)
- **Expiry Month**: `12`
- **Expiry Year**: `2025`
- **CVV**: `123`
- **Cardholder Name**: `Test User`

**Note**: SkipCash may provide specific test cards. Check your SkipCash sandbox documentation for the exact test card numbers.

### 3. Enter Payment Amount
- Enter the amount you want to pay
- Or use the default amount from the payment schedule

### 4. Submit Payment
- Click **"Pay Now"** or **"Process Payment"**
- You should be **redirected to SkipCash payment page**

## Step 3: Verify Payment Flow

### What Should Happen:

1. **✅ Redirect to SkipCash**
   - After clicking "Pay Now", you should be redirected to SkipCash payment page
   - URL should be something like: `https://skipcashtest.azurewebsites.net/...`

2. **✅ Complete Payment on SkipCash**
   - Fill in payment details on SkipCash page
   - Click "Pay" or "Confirm"
   - Payment should process

3. **✅ Return to Your App**
   - After successful payment, you should be redirected back
   - Should go to payment confirmation page or application page

4. **✅ Database Updates**
   - Payment transaction should be created in `payment_transactions` table
   - Payment schedule should be updated
   - Application installment plan should reflect the payment

## Step 4: Check Database

### Check Payment Transaction

1. **Go to Supabase Dashboard** → **Table Editor** → `payment_transactions`

2. **Look for your transaction**:
   - Should have `status = 'pending'` initially
   - After webhook, should be `status = 'completed'`
   - Should have `transaction_id` matching your payment
   - Should have `application_id` matching your application

### Check Application Payment Schedule

1. **Go to Supabase Dashboard** → **Table Editor** → `applications`

2. **Find your application**:
   - Click on the application
   - Check `installment_plan` JSON field
   - Payment schedule should show updated status

## Step 5: Test Webhook (Optional)

### Using SkipCash Webhook Simulator

1. **Go to SkipCash Dashboard** → **Sandbox** → **Webhooks Simulator**

2. **Configure test parameters**:
   - **Payment ID**: Use a payment ID from a previous test (optional)
   - **Event Type**: Select "Successful Payment"
   - **Amount**: Enter test amount
   - **Transaction ID**: Enter your test transaction ID

3. **Click "Send"**

4. **Check results**:
   - Go to **Webhook Events** tab
   - Should see the webhook call
   - Check Supabase function logs to see if it was received

### Check Supabase Function Logs

1. **Go to Supabase Dashboard** → **Edge Functions** → `skipcash-webhook`

2. **Click "Logs"** tab

3. **Look for**:
   - Webhook received messages
   - Payment processing logs
   - Any errors

## Step 6: Verify Integration Points

### ✅ Frontend → Backend
- Payment request should call `skipCashService.processPayment()`
- Should receive payment URL from Edge Function
- Should redirect to SkipCash

### ✅ Backend → SkipCash
- Edge Function should create payment request
- Should receive payment URL
- Should return to frontend

### ✅ SkipCash → Webhook
- SkipCash should call webhook after payment
- Webhook should update database
- Payment status should be updated

## Common Issues & Solutions

### Issue: Payment Not Redirecting

**Symptoms**: Clicking "Pay Now" doesn't redirect

**Check**:
1. Browser console for errors
2. Supabase function logs for `skipcash-payment`
3. Network tab to see if API call was made
4. Verify Edge Function is deployed

**Solution**:
- Check all secrets are set correctly
- Verify Edge Function is deployed
- Check browser console for specific errors

### Issue: Webhook Not Received

**Symptoms**: Payment completes but database not updated

**Check**:
1. Webhook URL is configured in SkipCash
2. Supabase function logs for `skipcash-webhook`
3. SkipCash webhook events log

**Solution**:
- Verify webhook URL: `https://zqwsxewuppexvjyakuqf.supabase.co/functions/v1/skipcash-webhook`
- Check webhook key matches
- Test with webhook simulator

### Issue: "Credentials not configured" Error

**Symptoms**: Error message about missing credentials

**Check**:
1. All 5 secrets are added in Supabase
2. Secret names are exact (case-sensitive)
3. No extra spaces in values

**Solution**:
- Verify all secrets in Supabase Dashboard
- Redeploy Edge Functions after adding secrets

### Issue: Payment Status Not Updating

**Symptoms**: Payment completes but status stays "pending"

**Check**:
1. Webhook is being called
2. Webhook handler is processing correctly
3. Database RLS policies allow updates

**Solution**:
- Check webhook function logs
- Verify transaction_id matches
- Check database permissions

## Testing Checklist

- [ ] Payment page loads without errors
- [ ] Card payment method is selectable
- [ ] Card form fields are visible
- [ ] Payment submission redirects to SkipCash
- [ ] SkipCash payment page loads
- [ ] Payment can be completed on SkipCash
- [ ] Redirects back to app after payment
- [ ] Payment transaction created in database
- [ ] Payment schedule updated
- [ ] Webhook received (check logs)
- [ ] Payment status updated to "completed"

## Quick Test Script

1. **Start app**: `npm run dev:customer`
2. **Navigate**: Go to payment page
3. **Select**: Credit/Debit Card
4. **Enter**: Test card `4111111111111111`
5. **Submit**: Click "Pay Now"
6. **Verify**: Redirects to SkipCash
7. **Complete**: Payment on SkipCash
8. **Check**: Database updated

## Production Testing

Before going live:

1. **Switch to Production**:
   - Set `SKIPCASH_USE_SANDBOX=false` in Supabase
   - Update webhook URL in SkipCash production settings
   - Use production credentials

2. **Test with Real Card** (small amount):
   - Use a real card with small amount
   - Verify complete flow
   - Check all database updates

3. **Monitor**:
   - Check function logs regularly
   - Monitor payment transactions
   - Set up alerts for failures

## Need Help?

If something doesn't work:
1. Check browser console for errors
2. Check Supabase function logs
3. Check SkipCash webhook events
4. Review the troubleshooting section above

