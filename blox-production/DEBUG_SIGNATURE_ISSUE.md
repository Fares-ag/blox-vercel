# Debugging Signature Mismatch Issue

## Current Error
- **Error**: "Signature does not match!" (403 Forbidden)
- **Also seen**: "Missing or invalid key"

## Root Cause Analysis

The signature calculation is failing. This could be due to:

1. **Wrong KeyId or Secret Key**
   - Verify the KeyId `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed` matches SkipCash dashboard
   - Verify the Secret Key is the correct one (not webhook key)

2. **Combined Data String Format**
   - The order of fields must be exact
   - Empty fields might need special handling

3. **Base64 Encoding**
   - The HMAC result needs proper base64 encoding

## Verification Steps

### Step 1: Verify Credentials in SkipCash Dashboard

1. Go to SkipCash Dashboard → **Sandbox** → **Credentials**
2. Verify:
   - **Key ID** matches: `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed`
   - **Key Secret** matches the long string we added
   - These are the **API credentials**, not webhook credentials

### Step 2: Check Supabase Secrets

1. Go to Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**
2. Verify:
   - `SKIPCASH_KEY_ID` = `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed`
   - `SKIPCASH_SECRET_KEY` = The long string (starts with `BJZAz2n0CduW8O2+27u6XLLiZlqsdhia99coxTuVe6ZMlv9b7etZ0KNn0106y89RI279OBmC0TzI0Q+B6SQe0Bx8nQ1Vz7alzpqlHRlDcDrQG4DrizrTN2kY33UYX8d/63AAJbM8w5iSmYSvsile6kR5eZ9Z4bTSA0uxGu7+VIrK9AXdfHV7hLdi0iruVUC8BAcJYqrGvrA9mkClrXy9tsN7GQqxNMvBa3BvQnuKJBwU/ebq0cE1s+ugGqUyF5PPNG3OG3yjCb0NbZ6hTRcrXAqvhUcevK1lMiNfQtjLbTMLvv42fMiLgDbuabqNs11kErYeiuEXpkkazfnRysDAC0aS3bOxm6XBjgHucvfUMAehMNycfDi6eUSroPgfh3ZfPE/gcLZPgj2ptCmGYPHUyPnzXJG+MDcNDR9ZjOKGJ1EnN3pEgljMQcCmerDtux+yGx1QJBVe+SJW9w/UyzFEWxMuPyvzBmvWk4+NbErxiBVWEZQFiFJElHAh8hSDTBN6j76Bvt+7qwsMHeA86wH2kQ==`)
   - Make sure there are NO extra spaces
   - Make sure the entire secret is copied (ends with `==`)

### Step 3: Check Function Logs

After trying a payment, check the logs for:
- "Combined data for signature:" - This shows what we're hashing
- "Using KeyId:" - Verify it matches
- "Secret key length:" - Should be around 600+ characters
- "Generated signature:" - First part of the signature

### Step 4: Compare with SkipCash Documentation

The combined data string should be:
```
Uid={uuid},KeyId={keyId},Amount={amount},FirstName={firstName},LastName={lastName},Phone={phone},Email={email},Street={street},City={city},State={state},Country={country},PostalCode={postalCode},TransactionId={transactionId},Custom1={custom1}
```

All fields must be included, even if empty.

## Possible Solutions

### Solution 1: Verify KeyId Matches

The KeyId in Supabase secrets must EXACTLY match the KeyId in SkipCash dashboard.

### Solution 2: Verify Secret Key

Make sure you're using the **Key Secret** (for API calls), not the **Webhook Key** (for webhooks).

### Solution 3: Check for Extra Spaces

When copying secrets, make sure there are no:
- Leading spaces
- Trailing spaces
- Line breaks in the middle

### Solution 4: Test with SkipCash Test Tool

If SkipCash provides a test/sandbox tool, use it to verify your credentials work.

## Next Steps

1. **Double-check credentials** in both SkipCash and Supabase match exactly
2. **Try payment again** and check the new detailed logs
3. **Compare** the "Combined data for signature" in logs with SkipCash requirements
4. **Contact SkipCash support** if credentials are confirmed correct but still failing

## What the Logs Will Show

With the updated function, you'll see:
- The exact combined data string being hashed
- The KeyId being used
- The secret key length (to verify it's complete)
- The first part of the generated signature

This will help identify where the mismatch is occurring.

