# Troubleshooting Edge Function Error

## Error: "Edge Function returned a non-2xx status code"

This means the `skipcash-payment` Edge Function is returning an error (400 or 500 status).

## Step 1: Check Supabase Function Logs

1. **Go to Supabase Dashboard** → **Edge Functions** → `skipcash-payment`
2. **Click "Logs" tab**
3. **Look for error messages** - this will tell you exactly what's wrong

## Common Issues & Solutions

### Issue 1: Missing Credentials

**Error in logs**: "SkipCash credentials not configured"

**Solution**:
1. Go to Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**
2. Verify all 5 secrets are present:
   - `SKIPCASH_CLIENT_ID`
   - `SKIPCASH_KEY_ID`
   - `SKIPCASH_SECRET_KEY`
   - `SKIPCASH_WEBHOOK_KEY`
   - `SKIPCASH_USE_SANDBOX`
3. If any are missing, add them
4. **Redeploy the function** after adding secrets:
   ```bash
   npx supabase functions deploy skipcash-payment
   ```

### Issue 2: Invalid Credentials

**Error in logs**: "Payment request failed" or "401 Unauthorized"

**Solution**:
1. Double-check credentials are correct:
   - No extra spaces
   - Copied completely (Key Secret is very long)
   - Case-sensitive names
2. Verify credentials in SkipCash dashboard match
3. Check you're using sandbox credentials (not production)

### Issue 3: SkipCash API Error

**Error in logs**: "SkipCash API returned invalid response" or specific API error

**Solution**:
1. Check SkipCash API status
2. Verify API URL is correct:
   - Sandbox: `https://skipcashtest.azurewebsites.net`
   - Production: `https://api.skipcash.app`
3. Check if `SKIPCASH_USE_SANDBOX` is set correctly
4. Verify request format matches SkipCash requirements

### Issue 4: Missing Required Fields

**Error in logs**: "Missing required payment fields"

**Solution**:
1. Check browser console for the request payload
2. Verify all required fields are being sent:
   - `amount`
   - `firstName`
   - `lastName`
   - `phone`
   - `email`
   - `transactionId`
3. Check PaymentPage is sending all required data

### Issue 5: Database Error

**Error in logs**: "Failed to create payment transaction record"

**Solution**:
1. Check database connection
2. Verify `payment_transactions` table exists
3. Check RLS policies allow inserts
4. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

## Step 2: Check Browser Console

1. **Open browser DevTools** (F12)
2. **Go to Console tab**
3. **Look for errors** when clicking "Pay Now"
4. **Check Network tab**:
   - Find the request to `skipcash-payment`
   - Check request payload
   - Check response status and body

## Step 3: Test Edge Function Directly

You can test the function directly using curl or Postman:

```bash
curl -X POST https://zqwsxewuppexvjyakuqf.supabase.co/functions/v1/skipcash-payment \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "firstName": "Test",
    "lastName": "User",
    "phone": "+1234567890",
    "email": "test@example.com",
    "transactionId": "TEST-123"
  }'
```

Replace `YOUR_ANON_KEY` with your Supabase anon key (from Settings → API).

## Step 4: Verify Function Deployment

1. **Check function is deployed**:
   - Go to Supabase Dashboard → **Edge Functions**
   - Verify `skipcash-payment` is listed
   - Check it has the latest code

2. **Redeploy if needed**:
   ```bash
   npx supabase functions deploy skipcash-payment
   ```

## Step 5: Check Environment Variables

The function needs these environment variables (secrets):

1. `SKIPCASH_CLIENT_ID` - Your SkipCash Client ID
2. `SKIPCASH_KEY_ID` - Your SkipCash Key ID
3. `SKIPCASH_SECRET_KEY` - Your SkipCash Secret Key
4. `SKIPCASH_WEBHOOK_KEY` - Your SkipCash Webhook Key
5. `SKIPCASH_USE_SANDBOX` - Set to `true` for testing

**Note**: Supabase automatically provides:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Debugging Tips

### Enable More Logging

The function now includes detailed logging. Check logs for:
- Credential loading status
- API request details
- Response from SkipCash
- Error details

### Check Request Payload

In browser DevTools → Network tab:
1. Find the request to `skipcash-payment`
2. Click on it
3. Check "Payload" or "Request" tab
4. Verify all fields are present and correct

### Verify Function Code

Make sure the deployed function has the latest code:
1. Compare deployed code with local file
2. Redeploy if code is outdated

## Quick Fix Checklist

- [ ] All 5 secrets are set in Supabase
- [ ] Function is deployed
- [ ] Check function logs for specific error
- [ ] Verify credentials are correct (no spaces)
- [ ] Check browser console for request/response
- [ ] Test function directly with curl
- [ ] Redeploy function if needed

## Still Having Issues?

1. **Copy the exact error message** from:
   - Supabase function logs
   - Browser console
   - Network tab response

2. **Check**:
   - All secrets are set correctly
   - Function is deployed
   - Credentials match SkipCash dashboard

3. **Common fixes**:
   - Redeploy function: `npx supabase functions deploy skipcash-payment`
   - Double-check secret values
   - Verify SkipCash sandbox is accessible

