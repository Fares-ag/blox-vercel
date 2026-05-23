# SkipCash Credentials Setup

## Your SkipCash Credentials

All credentials have been provided:

- **Client ID**: `1333b59f-f3ef-4d76-92b6-8cd2c24f528b` ✅
- **Webhook Key**: `7a189879-5091-4f43-a2cf-a542cf218827` ✅
- **Key Id**: `eaddac8b-b46b-4996-9c1e-8ab5bf618566` ✅
- **Key Secret**: `+ZzRLkgRSz+QV9qH17J6HyQ5W77mlaZkX5JIAS9oNoVqkPGFLucBcF75uTU+8DAzh6cj14Bei+MBulM1IFyoEd2rdxeOAVB7kH+ZNKRJlNxj+mNquTKIrjJJx4+Q+o2OQjUGZ8iPf4HuK8nXjD2sHcU6UBjJRS0S0DCEELt/HfWQJlycRkejbpFlAQkXRzixzRwfwF7hERlyt4moQyabxIeuAgDu7XYe48sqnKBMjoOEcc8Z/RjV9zg8z4uwHIPec8rVVrFXoF8IYZFdNlAExEs1Z0qxONAbvJOw110X/AQeeYQAxYV6lLOMk4kDtJR6EqLmEIy9DuAA6rb8M+Cijdvf7ZX1FeGDaevW+RznhKnTbJAfa+JMJyab+NKJlg6nWUwsWnMzajT38e+hv10J3vuDs1f/apNAtMxFqL8JLsE+DIsBb36/dGo9f7lcU4f5b6tqaS/rkFQ8CKihUrKy6CcioA5fds73mAnbKqygVMV0cBrLDZznazis1tz1uYLrSfF4cCiv4noFDDNh4Wg==` ✅

## ✅ All Credentials Ready

All required credentials have been provided. You can proceed directly to setting up environment variables in Supabase.

## Setting Up Environment Variables in Supabase

### Step 1: Access Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Click on **Environment Variables** or **Secrets**

### Step 2: Add Environment Variables

Add the following environment variables:

```
SKIPCASH_CLIENT_ID=1333b59f-f3ef-4d76-92b6-8cd2c24f528b
SKIPCASH_KEY_ID=eaddac8b-b46b-4996-9c1e-8ab5bf618566
SKIPCASH_SECRET_KEY=+ZzRLkgRSz+QV9qH17J6HyQ5W77mlaZkX5JIAS9oNoVqkPGFLucBcF75uTU+8DAzh6cj14Bei+MBulM1IFyoEd2rdxeOAVB7kH+ZNKRJlNxj+mNquTKIrjJJx4+Q+o2OQjUGZ8iPf4HuK8nXjD2sHcU6UBjJRS0S0DCEELt/HfWQJlycRkejbpFlAQkXRzixzRwfwF7hERlyt4moQyabxIeuAgDu7XYe48sqnKBMjoOEcc8Z/RjV9zg8z4uwHIPec8rVVrFXoF8IYZFdNlAExEs1Z0qxONAbvJOw110X/AQeeYQAxYV6lLOMk4kDtJR6EqLmEIy9DuAA6rb8M+Cijdvf7ZX1FeGDaevW+RznhKnTbJAfa+JMJyab+NKJlg6nWUwsWnMzajT38e+hv10J3vuDs1f/apNAtMxFqL8JLsE+DIsBb36/dGo9f7lcU4f5b6tqaS/rkFQ8CKihUrKy6CcioA5fds73mAnbKqygVMV0cBrLDZznazis1tz1uYLrSfF4cCiv4noFDDNh4Wg==
SKIPCASH_WEBHOOK_KEY=7a189879-5091-4f43-a2cf-a542cf218827
SKIPCASH_USE_SANDBOX=true
```

### Step 3: Configure Webhook URL

In your SkipCash dashboard, set the webhook URL to:

```
https://[your-supabase-project-ref].supabase.co/functions/v1/skipcash-webhook
```

Replace `[your-supabase-project-ref]` with your actual Supabase project reference.

**To find your project reference:**
1. Go to Supabase Dashboard → Settings → General
2. Look for "Reference ID" or "Project URL"
3. It will be in the format: `abcdefghijklmnop`

So your webhook URL will be:
```
https://abcdefghijklmnop.supabase.co/functions/v1/skipcash-webhook
```

### Step 4: Set Return URL (Optional)

The return URL is where users are redirected after completing payment. Set it to:

```
https://[your-domain]/customer/my-applications/[application-id]/payment-confirmation
```

Or if you have a general payment confirmation page:
```
https://[your-domain]/payment/confirmation
```

## Testing Your Setup

### 1. Verify Environment Variables

After setting up, you can test the Edge Function:

```bash
# Test payment function
curl -X POST https://[your-project-ref].supabase.co/functions/v1/skipcash-payment \
  -H "Authorization: Bearer [your-anon-key]" \
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

### 2. Check Function Logs

1. Go to Supabase Dashboard → Edge Functions
2. Click on `skipcash-payment`
3. View logs to see if there are any errors

## Security Reminders

⚠️ **IMPORTANT SECURITY NOTES:**

1. **Never commit credentials to Git**
   - Add `.env` to `.gitignore`
   - Never push credentials to version control

2. **Use different credentials for sandbox and production**
   - Sandbox: Use test credentials
   - Production: Use live credentials

3. **Rotate credentials regularly**
   - Change API keys periodically
   - Revoke old keys when not in use

4. **Monitor access**
   - Check Supabase logs regularly
   - Set up alerts for failed payments

## Next Steps

1. ✅ Get Key Id and Key Secret from SkipCash dashboard
2. ✅ Add all credentials to Supabase environment variables
3. ✅ Configure webhook URL in SkipCash dashboard
4. ✅ Set return URL in SkipCash dashboard
5. ✅ Deploy Edge Functions
6. ✅ Test payment flow in sandbox mode

## Troubleshooting

### "SkipCash credentials not configured" Error

- Verify all environment variables are set in Supabase
- Check variable names are exact (case-sensitive)
- Ensure no extra spaces in values
- Redeploy Edge Functions after adding variables

### Webhook Not Working

- Verify webhook URL is correct
- Check webhook key matches in both places
- Ensure webhook URL is publicly accessible
- Check Supabase function logs for errors

### Payment Not Processing

- Verify Key Id and Key Secret are correct
- Check you're using the right environment (sandbox vs production)
- Verify Client ID matches
- Check SkipCash dashboard for API status

## Support

If you need help:
1. Check SkipCash API documentation
2. Review Supabase Edge Function logs
3. Contact SkipCash support for API credential issues
4. Check the main setup guide: `SKIPCASH_INTEGRATION_SETUP.md`

