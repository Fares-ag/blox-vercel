# SkipCash Integration - Final Setup Instructions

## ✅ All Credentials Ready!

You now have all the credentials needed to complete the setup:

- ✅ **Client ID**: `<REDACTED_CLIENT_ID>`
- ✅ **Key ID**: `<REDACTED_KEY_ID>`
- ✅ **Key Secret**: `<REDACTED_SKIPCASH_SECRET_KEY>`
- ✅ **Webhook Key**: `<REDACTED_WEBHOOK_KEY>`

## 🚀 Complete Setup in 3 Steps

### Step 1: Set Environment Variables in Supabase (5 minutes)

1. Go to your Supabase Dashboard
2. Navigate to: **Settings** → **Edge Functions** → **Secrets** (or **Environment Variables**)
3. Add these 5 secrets:

```
SKIPCASH_CLIENT_ID
Value: <REDACTED_CLIENT_ID>

SKIPCASH_KEY_ID
Value: <REDACTED_KEY_ID>

SKIPCASH_SECRET_KEY
Value: <REDACTED_SKIPCASH_SECRET_KEY>

SKIPCASH_WEBHOOK_KEY
Value: <REDACTED_WEBHOOK_KEY>

SKIPCASH_USE_SANDBOX
Value: true
```

**Important**: 
- Copy the Key Secret value exactly (it's very long)
- Make sure there are no extra spaces
- Set `SKIPCASH_USE_SANDBOX=false` when ready for production

### Step 2: Deploy Edge Functions (5 minutes)

Open terminal in your project directory and run:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project ref)
supabase link --project-ref your-project-ref

# Deploy all three functions
supabase functions deploy skipcash-payment
supabase functions deploy skipcash-verify
supabase functions deploy skipcash-webhook
```

**To find your project ref**:
- Go to Supabase Dashboard → Settings → General
- Look for "Reference ID" (format: `abcdefghijklmnop`)

### Step 3: Configure Webhook in SkipCash (3 minutes)

1. Go to SkipCash Dashboard → **Sandbox** → **Credentials** (or **Settings** → **Webhooks**)
2. Set **Webhook URL** to:
   ```
   https://[your-project-ref].supabase.co/functions/v1/skipcash-webhook
   ```
   Replace `[your-project-ref]` with your actual Supabase project reference ID
3. Click **Save**

**Example**:
If your project ref is `abcdefghijklmnop`, the webhook URL would be:
```
https://abcdefghijklmnop.supabase.co/functions/v1/skipcash-webhook
```

## ✅ Testing

### Test Payment Flow

1. Go to your application's payment page
2. Select "Credit/Debit Card" payment method
3. Fill in test card details (provided by SkipCash)
4. Submit payment
5. You should be redirected to SkipCash payment page
6. Complete the payment
7. Verify:
   - ✅ Returns to your application
   - ✅ Payment appears in `payment_transactions` table
   - ✅ Payment schedule is updated

### Test Webhook

1. Go to SkipCash Sandbox → **Webhooks Simulator**
2. Configure test parameters
3. Click **Send**
4. Check **Webhook Events** tab for logs
5. Verify your Supabase function logs show successful processing

## 🔒 Security Reminders

1. ✅ Credentials are stored in Supabase (not in code)
2. ✅ `.gitignore` includes credentials files
3. ⚠️ Never commit credentials to Git
4. ⚠️ Use different credentials for production
5. ⚠️ Rotate keys periodically

## 📋 Quick Checklist

- [ ] All 5 environment variables set in Supabase
- [ ] Edge Functions deployed (3 functions)
- [ ] Webhook URL configured in SkipCash
- [ ] Test payment completed successfully
- [ ] Payment appears in database
- [ ] Webhook received and processed

## 🐛 Troubleshooting

### "Credentials not configured" Error
- ✅ Verify all 5 variables are set in Supabase
- ✅ Check variable names are exact (case-sensitive)
- ✅ Ensure no extra spaces in values
- ✅ Redeploy functions after adding variables

### Payment Not Redirecting
- ✅ Check browser console for errors
- ✅ Verify Edge Function is deployed
- ✅ Check Supabase function logs
- ✅ Verify environment variables

### Webhook Not Working
- ✅ Verify webhook URL is correct
- ✅ Check Supabase function logs
- ✅ Verify webhook key matches
- ✅ Test with webhook simulator

## 📚 Documentation

- **Quick Setup**: `SKIPCASH_QUICK_SETUP.md`
- **Detailed Setup**: `SKIPCASH_INTEGRATION_SETUP.md`
- **Credentials Guide**: `SKIPCASH_CREDENTIALS_SETUP.md`
- **Webhook Guide**: `SKIPCASH_WEBHOOK_GUIDE.md`

## 🎉 You're Ready!

Once you complete these 3 steps, your SkipCash integration will be fully functional!

**Total Setup Time**: ~15 minutes

Need help? Check the troubleshooting section or review the detailed documentation files.

