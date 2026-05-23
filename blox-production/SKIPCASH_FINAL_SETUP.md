# SkipCash Integration - Final Setup Instructions

## ✅ All Credentials Ready!

You now have all the credentials needed to complete the setup:

- ✅ **Client ID**: `1333b59f-f3ef-4d76-92b6-8cd2c24f528b`
- ✅ **Key ID**: `eaddac8b-b46b-4996-9c1e-8ab5bf618566`
- ✅ **Key Secret**: `+ZzRLkgRSz+QV9qH17J6HyQ5W77mlaZkX5JIAS9oNoVqkPGFLucBcF75uTU+8DAzh6cj14Bei+MBulM1IFyoEd2rdxeOAVB7kH+ZNKRJlNxj+mNquTKIrjJJx4+Q+o2OQjUGZ8iPf4HuK8nXjD2sHcU6UBjJRS0S0DCEELt/HfWQJlycRkejbpFlAQkXRzixzRwfwF7hERlyt4moQyabxIeuAgDu7XYe48sqnKBMjoOEcc8Z/RjV9zg8z4uwHIPec8rVVrFXoF8IYZFdNlAExEs1Z0qxONAbvJOw110X/AQeeYQAxYV6lLOMk4kDtJR6EqLmEIy9DuAA6rb8M+Cijdvf7ZX1FeGDaevW+RznhKnTbJAfa+JMJyab+NKJlg6nWUwsWnMzajT38e+hv10J3vuDs1f/apNAtMxFqL8JLsE+DIsBb36/dGo9f7lcU4f5b6tqaS/rkFQ8CKihUrKy6CcioA5fds73mAnbKqygVMV0cBrLDZznazis1tz1uYLrSfF4cCiv4noFDDNh4Wg==`
- ✅ **Webhook Key**: `7a189879-5091-4f43-a2cf-a542cf218827`

## 🚀 Complete Setup in 3 Steps

### Step 1: Set Environment Variables in Supabase (5 minutes)

1. Go to your Supabase Dashboard
2. Navigate to: **Settings** → **Edge Functions** → **Secrets** (or **Environment Variables**)
3. Add these 5 secrets:

```
SKIPCASH_CLIENT_ID
Value: 1333b59f-f3ef-4d76-92b6-8cd2c24f528b

SKIPCASH_KEY_ID
Value: eaddac8b-b46b-4996-9c1e-8ab5bf618566

SKIPCASH_SECRET_KEY
Value: +ZzRLkgRSz+QV9qH17J6HyQ5W77mlaZkX5JIAS9oNoVqkPGFLucBcF75uTU+8DAzh6cj14Bei+MBulM1IFyoEd2rdxeOAVB7kH+ZNKRJlNxj+mNquTKIrjJJx4+Q+o2OQjUGZ8iPf4HuK8nXjD2sHcU6UBjJRS0S0DCEELt/HfWQJlycRkejbpFlAQkXRzixzRwfwF7hERlyt4moQyabxIeuAgDu7XYe48sqnKBMjoOEcc8Z/RjV9zg8z4uwHIPec8rVVrFXoF8IYZFdNlAExEs1Z0qxONAbvJOw110X/AQeeYQAxYV6lLOMk4kDtJR6EqLmEIy9DuAA6rb8M+Cijdvf7ZX1FeGDaevW+RznhKnTbJAfa+JMJyab+NKJlg6nWUwsWnMzajT38e+hv10J3vuDs1f/apNAtMxFqL8JLsE+DIsBb36/dGo9f7lcU4f5b6tqaS/rkFQ8CKihUrKy6CcioA5fds73mAnbKqygVMV0cBrLDZznazis1tz1uYLrSfF4cCiv4noFDDNh4Wg==

SKIPCASH_WEBHOOK_KEY
Value: 7a189879-5091-4f43-a2cf-a542cf218827

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

