# Testing SkipCash Signature Calculation

## Current Issue
- Error: "Signature does not match!" (403 Forbidden)
- This means the HMAC SHA256 signature we're generating doesn't match what SkipCash expects

## What to Check in Logs

After trying a payment, check Supabase function logs for:

1. **Secret key length**: Should be ~600+ characters
   - If less than 500, the secret is incomplete
   
2. **Secret key starts with**: Should be `BJZAz2n0CduW8O2+27u6XLLiZlqsdhia99coxTuVe6ZMlv9b7etZ0KNn0106y89RI279OBmC0TzI0Q+B6SQe0Bx8nQ1Vz7alzpqlHRlDcDrQG4DrizrTN2kY33UYX8d/63AAJbM8w5iSmYSvsile6kR5eZ9Z4bTSA0uxGu7+VIrK9AXdfHV7hLdi0iruVUC8BAcJYqrGvrA9mkClrXy9tsN7GQqxNMvBa3BvQnuKJBwU/ebq0cE1s+ugGqUyF5PPNG3OG3yjCb0NbZ6hTRcrXAqvhUcevK1lMiNfQtjLbTMLvv42fMiLgDbuabqNs11kErYeiuEXpkkazfnRysDAC0aS3bOxm6XBjgHucvfUMAehMNycfDi6eUSroPgfh3ZfPE/gcLZPgj2ptCmGYPHUyPnzXJG+MDcNDR9ZjOKGJ1EnN3pEgljMQcCmerDtux+yGx1QJBVe+SJW9w/UyzFEWxMuPyvzBmvWk4+NbErxiBVWEZQFiFJElHAh8hSDTBN6j76Bvt+7qwsMHeA86wH2kQ==`

3. **Secret key ends with**: Should be `==`

4. **Combined data for signature**: Shows the exact string being hashed

5. **Using KeyId**: Should be `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed`

## Possible Causes

### 1. Incomplete Secret Key
- **Symptom**: Secret key length < 500 characters
- **Fix**: Copy the complete secret from SkipCash (click "Copy Key")
- **Verify**: Should be ~600+ characters, ends with `==`

### 2. Wrong Secret Key
- **Symptom**: Secret doesn't start/end correctly
- **Fix**: Make sure you're using the **Key Secret** (for API), not Webhook Key
- **Verify**: Check SkipCash dashboard → Credentials → Key Secret

### 3. KeyId Mismatch
- **Symptom**: KeyId in logs doesn't match SkipCash dashboard
- **Fix**: Update `SKIPCASH_KEY_ID` in Supabase to match exactly
- **Verify**: Should be `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed`

### 4. Signature Calculation Issue
- **Symptom**: Secret is complete but signature still wrong
- **Possible causes**:
  - Field order in combined data string
  - Encoding differences
  - Empty field handling

## Next Steps

1. **Check the logs** and share:
   - Secret key length
   - Secret key starts with (first 20 chars)
   - Secret key ends with (last 10 chars)
   - Any WARNING messages

2. **If secret is incomplete**:
   - Copy complete secret from SkipCash
   - Update in Supabase
   - Try again

3. **If secret is complete but still failing**:
   - Verify KeyId matches exactly
   - Contact SkipCash support to verify credentials
   - Ask SkipCash for a test signature example

## Contact SkipCash Support

If credentials are confirmed correct but signature still fails:
- Ask them to verify the KeyId and Key Secret are active
- Request a test signature example with your credentials
- Ask if there are any special requirements for the signature format

