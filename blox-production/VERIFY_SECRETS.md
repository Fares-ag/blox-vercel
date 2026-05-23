# Verify SkipCash Secrets in Supabase

## ✅ Your SkipCash Dashboard Shows:

- **Client ID**: `1333b59f-f3ef-4d76-92b6-8cd2c24f528b` ✅
- **Webhook Key**: `7a189879-5091-4f43-a2cf-a542cf218827` ✅
- **Webhook URL**: `https://zqwsxewuppexvjyakuqf.supabase.co/functions/v1/skipcash-webhook` ✅ (Already configured!)
- **Key Id**: `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed` ✅
- **Key Secret**: `BJZAz2n0CduW8O2+27u6XLLiZlqsdh...` (truncated in dashboard)

## ⚠️ Critical: Verify Full Key Secret

The Key Secret is **truncated** in the SkipCash dashboard. You need to make sure the **COMPLETE** secret is in Supabase.

### Full Key Secret (should be in Supabase):
```
BJZAz2n0CduW8O2+27u6XLLiZlqsdhia99coxTuVe6ZMlv9b7etZ0KNn0106y89RI279OBmC0TzI0Q+B6SQe0Bx8nQ1Vz7alzpqlHRlDcDrQG4DrizrTN2kY33UYX8d/63AAJbM8w5iSmYSvsile6kR5eZ9Z4bTSA0uxGu7+VIrK9AXdfHV7hLdi0iruVUC8BAcJYqrGvrA9mkClrXy9tsN7GQqxNMvBa3BvQnuKJBwU/ebq0cE1s+ugGqUyF5PPNG3OG3yjCb0NbZ6hTRcrXAqvhUcevK1lMiNfQtjLbTMLvv42fMiLgDbuabqNs11kErYeiuEXpkkazfnRysDAC0aS3bOxm6XBjgHucvfUMAehMNycfDi6eUSroPgfh3ZfPE/gcLZPgj2ptCmGYPHUyPnzXJG+MDcNDR9ZjOKGJ1EnN3pEgljMQcCmerDtux+yGx1QJBVe+SJW9w/UyzFEWxMuPyvzBmvWk4+NbErxiBVWEZQFiFJElHAh8hSDTBN6j76Bvt+7qwsMHeA86wH2kQ==
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
   - ✅ Starts with: `BJZAz2n0CduW8O2+27u6XLLiZlqsdhia99coxTuVe6ZMlv9b7etZ0KNn0106y89RI279OBmC0TzI0Q+B6SQe0Bx8nQ1Vz7alzpqlHRlDcDrQG4DrizrTN2kY33UYX8d/63AAJbM8w5iSmYSvsile6kR5eZ9Z4bTSA0uxGu7+VIrK9AXdfHV7hLdi0iruVUC8BAcJYqrGvrA9mkClrXy9tsN7GQqxNMvBa3BvQnuKJBwU/ebq0cE1s+ugGqUyF5PPNG3OG3yjCb0NbZ6hTRcrXAqvhUcevK1lMiNfQtjLbTMLvv42fMiLgDbuabqNs11kErYeiuEXpkkazfnRysDAC0aS3bOxm6XBjgHucvfUMAehMNycfDi6eUSroPgfh3ZfPE/gcLZPgj2ptCmGYPHUyPnzXJG+MDcNDR9ZjOKGJ1EnN3pEgljMQcCmerDtux+yGx1QJBVe+SJW9w/UyzFEWxMuPyvzBmvWk4+NbErxiBVWEZQFiFJElHAh8hSDTBN6j76Bvt+7qwsMHeA86wH2kQ==`
   - ✅ Ends with: `==`
   - ✅ No spaces at the beginning or end
   - ✅ Length is approximately 600+ characters

### Step 2: Verify Key ID

1. In Supabase Secrets, find `SKIPCASH_KEY_ID`
2. Verify it's exactly: `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed`
3. No extra spaces or characters

### Step 3: Test Payment Again

After verifying secrets:
1. Try a payment in your app
2. Check Supabase function logs
3. Look for:
   - "Secret key length:" - Should show ~600+
   - "Using KeyId:" - Should match `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed`
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

