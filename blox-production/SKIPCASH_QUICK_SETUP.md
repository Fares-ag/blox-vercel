# SkipCash Quick Setup Checklist

## ✅ Your Credentials (Ready to Use)

- **Client ID**: `1333b59f-f3ef-4d76-92b6-8cd2c24f528b` ✅
- **Webhook Key**: `7a189879-5091-4f43-a2cf-a542cf218827` ✅
- **Key Id**: `eaddac8b-b46b-4996-9c1e-8ab5bf618566` ✅
- **Key Secret**: `+ZzRLkgRSz+QV9qH17J6HyQ5W77mlaZkX5JIAS9oNoVqkPGFLucBcF75uTU+8DAzh6cj14Bei+MBulM1IFyoEd2rdxeOAVB7kH+ZNKRJlNxj+mNquTKIrjJJx4+Q+o2OQjUGZ8iPf4HuK8nXjD2sHcU6UBjJRS0S0DCEELt/HfWQJlycRkejbpFlAQkXRzixzRwfwF7hERlyt4moQyabxIeuAgDu7XYe48sqnKBMjoOEcc8Z/RjV9zg8z4uwHIPec8rVVrFXoF8IYZFdNlAExEs1Z0qxONAbvJOw110X/AQeeYQAxYV6lLOMk4kDtJR6EqLmEIy9DuAA6rb8M+Cijdvf7ZX1FeGDaevW+RznhKnTbJAfa+JMJyab+NKJlg6nWUwsWnMzajT38e+hv10J3vuDs1f/apNAtMxFqL8JLsE+DIsBb36/dGo9f7lcU4f5b6tqaS/rkFQ8CKihUrKy6CcioA5fds73mAnbKqygVMV0cBrLDZznazis1tz1uYLrSfF4cCiv4noFDDNh4Wg==` ✅

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
SKIPCASH_CLIENT_ID = 1333b59f-f3ef-4d76-92b6-8cd2c24f528b
SKIPCASH_KEY_ID = 536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed
SKIPCASH_SECRET_KEY = BJZAz2n0CduW8O2+27u6XLLiZlqsdhia99coxTuVe6ZMlv9b7etZ0KNn0106y89RI279OBmC0TzI0Q+B6SQe0Bx8nQ1Vz7alzpqlHRlDcDrQG4DrizrTN2kY33UYX8d/63AAJbM8w5iSmYSvsile6kR5eZ9Z4bTSA0uxGu7+VIrK9AXdfHV7hLdi0iruVUC8BAcJYqrGvrA9mkClrXy9tsN7GQqxNMvBa3BvQnuKJBwU/ebq0cE1s+ugGqUyF5PPNG3OG3yjCb0NbZ6hTRcrXAqvhUcevK1lMiNfQtjLbTMLvv42fMiLgDbuabqNs11kErYeiuEXpkkazfnRysDAC0aS3bOxm6XBjgHucvfUMAehMNycfDi6eUSroPgfh3ZfPE/gcLZPgj2ptCmGYPHUyPnzXJG+MDcNDR9ZjOKGJ1EnN3pEgljMQcCmerDtux+yGx1QJBVe+SJW9w/UyzFEWxMuPyvzBmvWk4+NbErxiBVWEZQFiFJElHAh8hSDTBN6j76Bvt+7qwsMHeA86wH2kQ==
SKIPCASH_WEBHOOK_KEY = 7a189879-5091-4f43-a2cf-a542cf218827
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
3. Set Webhook Key: `7a189879-5091-4f43-a2cf-a542cf218827`
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

