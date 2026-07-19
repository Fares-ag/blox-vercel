# Verify SkipCash Secrets in Supabase

## ✅ Your SkipCash Dashboard Shows:

- **Client ID**: `<REDACTED_CLIENT_ID>` ✅
- **Webhook Key**: `<REDACTED_WEBHOOK_KEY>` ✅
- **Webhook URL**: `https://zqwsxewuppexvjyakuqf.supabase.co/functions/v1/skipcash-webhook` ✅ (Already configured!)
- **Key Id**: `<REDACTED_KEY_ID>` ✅
- **Key Secret**: `<REDACTED_SKIPCASH_SECRET_KEY>` (verify length ~600+ chars in dashboard)

## ⚠️ Critical: Verify Full Key Secret

The Key Secret is **truncated** in the SkipCash dashboard. You need to make sure the **COMPLETE** secret is in Supabase.

### Full Key Secret (should be in Supabase):
```
<REDACTED_SKIPCASH_SECRET_KEY>
```

**Important**: 
- The secret should end with `==`
- Total length should be around 600+ characters
- No spaces before or after

## Verification Steps

### Step 1: Check Supabase Secrets

1. Go to **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. Find `SKIPCASH_SECRET_KEY`
3. Click on it to view/edit
4. Verify:
   - ✅ Starts with: `<REDACTED_SKIPCASH_SECRET_KEY>`
   - ✅ Ends with: `==`
   - ✅ No spaces at the beginning or end
   - ✅ Length is approximately 600+ characters

### Step 2: Verify Key ID

1. In Supabase Secrets, find `SKIPCASH_KEY_ID`
2. Verify it's exactly: `<REDACTED_KEY_ID>`
3. No extra spaces or characters

### Step 3: Test Payment Again

After verifying secrets:
1. Try a payment in your app
2. Check Supabase function logs
3. Look for:
   - "Secret key length:" - Should show ~600+
   - "Using KeyId:" - Should match `<REDACTED_KEY_ID>`
   - Any signature errors

## If Secret is Incomplete

If the secret in Supabase is incomplete or different:

1. **Get the full secret from SkipCash**:
   - Click "Copy Key" in SkipCash dashboard
   - Make sure you copy the ENTIRE secret

2. **Update in Supabase**:
   - Go to Secrets
   - Edit `SKIPCASH_SECRET_KEY`
   - Paste the COMPLETE secret
   - Save

3. **No redeploy needed** - Edge Functions automatically use updated secrets

## Expected Secret Length

The Key Secret should be approximately **600-700 characters** long. If it's much shorter, it's likely incomplete.

## Quick Check

In Supabase function logs, after a payment attempt, you should see:
```
Secret key length: 600+ (or similar)
```

If it shows a much smaller number (like 50-100), the secret is incomplete.

