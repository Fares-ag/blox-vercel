# Supabase Edge Functions Secrets Setup

## Quick Setup Guide

You need to add 5 secrets to your Supabase Edge Functions. There are two ways to do this:

## Method 1: Add One by One (Recommended for First Time)

1. Go to **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. Click **"Add or replace secrets"**
3. Add each secret one by one:

### Secret 1: SKIPCASH_CLIENT_ID
- **Name**: `SKIPCASH_CLIENT_ID`
- **Value**: `1333b59f-f3ef-4d76-92b6-8cd2c24f528b`
- Click **"Add another"**

### Secret 2: SKIPCASH_KEY_ID
- **Name**: `SKIPCASH_KEY_ID`
- **Value**: `eaddac8b-b46b-4996-9c1e-8ab5bf618566`
- Click **"Add another"**

### Secret 3: SKIPCASH_SECRET_KEY
- **Name**: `SKIPCASH_SECRET_KEY`
- **Value**: `+ZzRLkgRSz+QV9qH17J6HyQ5W77mlaZkX5JIAS9oNoVqkPGFLucBcF75uTU+8DAzh6cj14Bei+MBulM1IFyoEd2rdxeOAVB7kH+ZNKRJlNxj+mNquTKIrjJJx4+Q+o2OQjUGZ8iPf4HuK8nXjD2sHcU6UBjJRS0S0DCEELt/HfWQJlycRkejbpFlAQkXRzixzRwfwF7hERlyt4moQyabxIeuAgDu7XYe48sqnKBMjoOEcc8Z/RjV9zg8z4uwHIPec8rVVrFXoF8IYZFdNlAExEs1Z0qxONAbvJOw110X/AQeeYQAxYV6lLOMk4kDtJR6EqLmEIy9DuAA6rb8M+Cijdvf7ZX1FeGDaevW+RznhKnTbJAfa+JMJyab+NKJlg6nWUwsWnMzajT38e+hv10J3vuDs1f/apNAtMxFqL8JLsE+DIsBb36/dGo9f7lcU4f5b6tqaS/rkFQ8CKihUrKy6CcioA5fds73mAnbKqygVMV0cBrLDZznazis1tz1uYLrSfF4cCiv4noFDDNh4Wg==`
- ⚠️ **Important**: Copy the entire value, it's very long!
- Click **"Add another"**

### Secret 4: SKIPCASH_WEBHOOK_KEY
- **Name**: `SKIPCASH_WEBHOOK_KEY`
- **Value**: `7a189879-5091-4f43-a2cf-a542cf218827`
- Click **"Add another"**

### Secret 5: SKIPCASH_USE_SANDBOX
- **Name**: `SKIPCASH_USE_SANDBOX`
- **Value**: `true`
- Click **"Save"** (don't add another, this is the last one)

## Method 2: Bulk Paste (Faster)

1. Go to **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. Click **"Insert or update multiple secrets at once by pasting key-value pairs"**
3. Paste this entire block:

```
SKIPCASH_CLIENT_ID=1333b59f-f3ef-4d76-92b6-8cd2c24f528b
SKIPCASH_KEY_ID=eaddac8b-b46b-4996-9c1e-8ab5bf618566
SKIPCASH_SECRET_KEY=+ZzRLkgRSz+QV9qH17J6HyQ5W77mlaZkX5JIAS9oNoVqkPGFLucBcF75uTU+8DAzh6cj14Bei+MBulM1IFyoEd2rdxeOAVB7kH+ZNKRJlNxj+mNquTKIrjJJx4+Q+o2OQjUGZ8iPf4HuK8nXjD2sHcU6UBjJRS0S0DCEELt/HfWQJlycRkejbpFlAQkXRzixzRwfwF7hERlyt4moQyabxIeuAgDu7XYe48sqnKBMjoOEcc8Z/RjV9zg8z4uwHIPec8rVVrFXoF8IYZFdNlAExEs1Z0qxONAbvJOw110X/AQeeYQAxYV6lLOMk4kDtJR6EqLmEIy9DuAA6rb8M+Cijdvf7ZX1FeGDaevW+RznhKnTbJAfa+JMJyab+NKJlg6nWUwsWnMzajT38e+hv10J3vuDs1f/apNAtMxFqL8JLsE+DIsBb36/dGo9f7lcU4f5b6tqaS/rkFQ8CKihUrKy6CcioA5fds73mAnbKqygVMV0cBrLDZznazis1tz1uYLrSfF4cCiv4noFDDNh4Wg==
SKIPCASH_WEBHOOK_KEY=7a189879-5091-4f43-a2cf-a542cf218827
SKIPCASH_USE_SANDBOX=true
```

4. Click **"Save"**

## Verification

After adding secrets, verify they're all there:

1. Go to **Settings** → **Edge Functions** → **Secrets**
2. You should see all 5 secrets listed:
   - ✅ SKIPCASH_CLIENT_ID
   - ✅ SKIPCASH_KEY_ID
   - ✅ SKIPCASH_SECRET_KEY
   - ✅ SKIPCASH_WEBHOOK_KEY
   - ✅ SKIPCASH_USE_SANDBOX

## Important Notes

1. **Key Secret is Very Long**: Make sure you copy the entire `SKIPCASH_SECRET_KEY` value - it's over 600 characters!

2. **No Extra Spaces**: When pasting values, make sure there are no leading or trailing spaces

3. **Case Sensitive**: Secret names are case-sensitive. Use exactly:
   - `SKIPCASH_CLIENT_ID` (all uppercase)
   - `SKIPCASH_KEY_ID` (all uppercase)
   - `SKIPCASH_SECRET_KEY` (all uppercase)
   - `SKIPCASH_WEBHOOK_KEY` (all uppercase)
   - `SKIPCASH_USE_SANDBOX` (all uppercase)

4. **Sandbox vs Production**: 
   - Set `SKIPCASH_USE_SANDBOX=true` for testing
   - Set `SKIPCASH_USE_SANDBOX=false` for production

5. **After Adding Secrets**: 
   - Redeploy your Edge Functions for changes to take effect
   - Secrets are automatically available to all Edge Functions

## Troubleshooting

### "Secret not found" Error
- Verify secret name is exactly correct (case-sensitive)
- Check you clicked "Save" after adding
- Redeploy Edge Functions after adding secrets

### "Invalid credentials" Error
- Double-check you copied the entire Key Secret value
- Verify no extra spaces in values
- Check all 5 secrets are added

### Secrets Not Working
- Make sure you redeployed Edge Functions after adding secrets
- Check Supabase function logs for specific errors
- Verify secret names match exactly what's in the code

## Next Steps

After adding all secrets:

1. ✅ Verify all 5 secrets are listed
2. ✅ Deploy Edge Functions (see deployment guide)
3. ✅ Test payment flow
4. ✅ Configure webhook URL in SkipCash

## Files Reference

- **Copy-Paste Format**: See `SUPABASE_SECRETS_COPY_PASTE.txt`
- **Bulk Format**: See `SUPABASE_SECRETS_KEY_VALUE_PAIRS.txt`
- **Full Setup**: See `SKIPCASH_FINAL_SETUP.md`

