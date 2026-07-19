# Update SkipCash Secrets in Supabase

## New Credentials

You have new SkipCash credentials that need to be updated in Supabase:

- **Key ID**: `<REDACTED_KEY_ID>`
- **Key Secret**: `<REDACTED_SKIPCASH_SECRET_KEY>`

## Quick Update Steps

### Step 1: Go to Supabase Secrets

1. Go to **Supabase Dashboard**
2. Navigate to: **Settings** → **Edge Functions** → **Secrets**

### Step 2: Update the Two Secrets

#### Update SKIPCASH_KEY_ID:
1. Find `SKIPCASH_KEY_ID` in the list
2. Click on it (or click "Edit")
3. Update the value to: `<REDACTED_KEY_ID>`
4. Click "Save"

#### Update SKIPCASH_SECRET_KEY:
1. Find `SKIPCASH_SECRET_KEY` in the list
2. Click on it (or click "Edit")
3. Update the value to:
   ```
   <REDACTED_SKIPCASH_SECRET_KEY>
   ```
4. ⚠️ **Important**: Copy the ENTIRE value - it's very long!
5. Click "Save"

### Step 3: Verify All Secrets

Make sure you have all 5 secrets:

- ✅ `SKIPCASH_CLIENT_ID` = `<REDACTED_CLIENT_ID>`
- ✅ `SKIPCASH_KEY_ID` = `<REDACTED_KEY_ID>` (UPDATED)
- ✅ `SKIPCASH_SECRET_KEY` = `<REDACTED_SKIPCASH_SECRET_KEY>` (UPDATED)
- ✅ `SKIPCASH_WEBHOOK_KEY` = `<REDACTED_WEBHOOK_KEY>`
- ✅ `SKIPCASH_USE_SANDBOX` = `true`

### Step 4: Test Again

After updating the secrets:

1. **Try the payment again** in your app
2. **Check function logs** if there are still errors
3. The new credentials should resolve the authentication issues

## Important Notes

1. **No Redeploy Needed**: Edge Functions automatically pick up new secret values - no need to redeploy!

2. **Copy Entire Secret**: The Key Secret is very long - make sure you copy it completely, including the `==` at the end.

3. **No Spaces**: Make sure there are no leading or trailing spaces when pasting.

4. **Case Sensitive**: Secret names are case-sensitive - use exactly:
   - `SKIPCASH_KEY_ID` (all uppercase)
   - `SKIPCASH_SECRET_KEY` (all uppercase)

## Verification

After updating, you can verify by:

1. **Check Supabase Dashboard** → Secrets should show updated values
2. **Try a test payment** - should work now
3. **Check function logs** - should show successful authentication

## If Still Having Issues

1. Double-check the secret values are correct
2. Verify no extra spaces
3. Check function logs for specific errors
4. Make sure all 5 secrets are present

