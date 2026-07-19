# SkipCash Quick Setup Checklist

## ✅ Your Credentials (Ready to Use)

- **Client ID**: `<REDACTED_CLIENT_ID>` ✅
- **Webhook Key**: `<REDACTED_WEBHOOK_KEY>` ✅
- **Key Id**: `<REDACTED_KEY_ID>` ✅
- **Key Secret**: `<REDACTED_SKIPCASH_SECRET_KEY>` ✅

## 🚀 Quick Setup Steps

### 1. ✅ Credentials Ready

All credentials have been provided:
- ✅ Client ID
- ✅ Key Id
- ✅ Key Secret
- ✅ Webhook Key

### 2. Set Supabase Environment Variables (5 minutes)

1. Go to: https://supabase.com/dashboard/project/[your-project]/settings/functions
2. Add these secrets:

```
SKIPCASH_CLIENT_ID = <REDACTED_CLIENT_ID>
SKIPCASH_KEY_ID = <REDACTED_KEY_ID>
SKIPCASH_SECRET_KEY = <REDACTED_SKIPCASH_SECRET_KEY>
SKIPCASH_WEBHOOK_KEY = <REDACTED_WEBHOOK_KEY>
SKIPCASH_USE_SANDBOX = true
```

### 3. Deploy Edge Functions (2 minutes)

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref [your-project-ref]

# Deploy functions
supabase functions deploy skipcash-payment
supabase functions deploy skipcash-verify
supabase functions deploy skipcash-webhook
```

### 4. Configure Webhook in SkipCash (3 minutes)

1. Go to SkipCash Dashboard → **Settings** → **Webhooks**
2. Set Webhook URL to:
   ```
   https://[your-project-ref].supabase.co/functions/v1/skipcash-webhook
   ```
3. Set Webhook Key: `<REDACTED_WEBHOOK_KEY>`
4. Enable events: Payment Completed, Payment Failed, Payment Cancelled
5. Save

### 5. Set Return URL (Optional - 2 minutes)

In SkipCash Dashboard → **Settings** → **Return URL**:
```
https://[your-domain]/customer/my-applications/[application-id]/payment-confirmation
```

Or use a general confirmation page:
```
https://[your-domain]/payment/confirmation
```

### 6. Test Payment (5 minutes)

1. Go to your app's payment page
2. Select "Credit/Debit Card"
3. Use SkipCash test card details
4. Complete payment
5. Verify:
   - ✅ Redirects to SkipCash payment page
   - ✅ Payment completes
   - ✅ Returns to your app
   - ✅ Payment appears in database

## 📋 Pre-Deployment Checklist

- [x] Key Id obtained from SkipCash ✅
- [x] Key Secret obtained from SkipCash ✅
- [ ] All environment variables set in Supabase
- [ ] Edge Functions deployed
- [ ] Webhook URL configured in SkipCash
- [ ] Return URL configured (optional)
- [ ] Test payment completed successfully
- [ ] Payment appears in `payment_transactions` table
- [ ] Payment schedule updated correctly

## 🔒 Security Checklist

- [ ] Credentials stored in Supabase (not in code)
- [ ] `.env` files in `.gitignore` ✅ (already done)
- [ ] Using sandbox mode for testing
- [ ] Different credentials for production
- [ ] Webhook key validation enabled

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Credentials not configured" | Check all env vars are set in Supabase |
| Webhook not receiving | Verify webhook URL is correct |
| Payment not redirecting | Check Edge Function logs |
| Status not updating | Verify webhook is working |

## 📚 Full Documentation

- **Detailed Setup**: See `SKIPCASH_INTEGRATION_SETUP.md`
- **Credentials Guide**: See `SKIPCASH_CREDENTIALS_SETUP.md`

## ⏱️ Total Setup Time: ~20 minutes

Once you have Key Id and Key Secret, the setup takes about 20 minutes!

