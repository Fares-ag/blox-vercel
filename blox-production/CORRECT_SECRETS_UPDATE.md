# Update Supabase Secrets with Correct Values

## ⚠️ Issue Found

The secrets in Supabase appear to be incorrect. The Key Secret should be a **long base64 string** (~600+ characters), not a short hex string.

## ✅ Correct Values from SkipCash Dashboard

Based on your SkipCash dashboard:

- **Client ID**: `1333b59f-f3ef-4d76-92b6-8cd2c24f528b`
- **Key ID**: `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed`
- **Key Secret**: `BJZAz2n0CduW8O2+27u6XLLiZlqsdhia99coxTuVe6ZMlv9b7etZ0KNn0106y89RI279OBmC0TzI0Q+B6SQe0Bx8nQ1Vz7alzpqlHRlDcDrQG4DrizrTN2kY33UYX8d/63AAJbM8w5iSmYSvsile6kR5eZ9Z4bTSA0uxGu7+VIrK9AXdfHV7hLdi0iruVUC8BAcJYqrGvrA9mkClrXy9tsN7GQqxNMvBa3BvQnuKJBwU/ebq0cE1s+ugGqUyF5PPNG3OG3yjCb0NbZ6hTRcrXAqvhUcevK1lMiNfQtjLbTMLvv42fMiLgDbuabqNs11kErYeiuEXpkkazfnRysDAC0aS3bOxm6XBjgHucvfUMAehMNycfDi6eUSroPgfh3ZfPE/gcLZPgj2ptCmGYPHUyPnzXJG+MDcNDR9ZjOKGJ1EnN3pEgljMQcCmerDtux+yGx1QJBVe+SJW9w/UyzFEWxMuPyvzBmvWk4+NbErxiBVWEZQFiFJElHAh8hSDTBN6j76Bvt+7qwsMHeA86wH2kQ==`
- **Webhook Key**: `7a189879-5091-4f43-a2cf-a542cf218827`
- **Use Sandbox**: `true`

## 🔧 Update Steps

### Step 1: Go to Supabase Secrets

1. Go to **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**

### Step 2: Update Each Secret

#### Update SKIPCASH_CLIENT_ID:
- **Current (wrong)**: `80e3bd93b6726e8b4a7dc9304e654dea4e77a884de7ff8354e11fc3c049a21a5`
- **Should be**: `1333b59f-f3ef-4d76-92b6-8cd2c24f528b`
- Click edit and replace with the correct value

#### Update SKIPCASH_KEY_ID:
- **Current (wrong)**: `f11a10dfb33928bdeb7f5142c51941e637b9dc7b510caf725b20dd030aca29c8`
- **Should be**: `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed`
- Click edit and replace with the correct value

#### Update SKIPCASH_SECRET_KEY:
- **Current (wrong)**: `ad50eae62b172ad4d0f957e1fd01c4f2c8e4f719851933a80a7b4e116c563fd2`
- **Should be**: `BJZAz2n0CduW8O2+27u6XLLiZlqsdhia99coxTuVe6ZMlv9b7etZ0KNn0106y89RI279OBmC0TzI0Q+B6SQe0Bx8nQ1Vz7alzpqlHRlDcDrQG4DrizrTN2kY33UYX8d/63AAJbM8w5iSmYSvsile6kR5eZ9Z4bTSA0uxGu7+VIrK9AXdfHV7hLdi0iruVUC8BAcJYqrGvrA9mkClrXy9tsN7GQqxNMvBa3BvQnuKJBwU/ebq0cE1s+ugGqUyF5PPNG3OG3yjCb0NbZ6hTRcrXAqvhUcevK1lMiNfQtjLbTMLvv42fMiLgDbuabqNs11kErYeiuEXpkkazfnRysDAC0aS3bOxm6XBjgHucvfUMAehMNycfDi6eUSroPgfh3ZfPE/gcLZPgj2ptCmGYPHUyPnzXJG+MDcNDR9ZjOKGJ1EnN3pEgljMQcCmerDtux+yGx1QJBVe+SJW9w/UyzFEWxMuPyvzBmvWk4+NbErxiBVWEZQFiFJElHAh8hSDTBN6j76Bvt+7qwsMHeA86wH2kQ==`
- ⚠️ **IMPORTANT**: This is a VERY long string (~600+ characters). Copy it COMPLETELY, including the `==` at the end
- Click edit and replace with the correct value

#### Update SKIPCASH_WEBHOOK_KEY:
- **Current (wrong)**: `e9c4aedacf01f71220bfcea07a620ca5fd18111bb3565292710cbc8e9ab108fb`
- **Should be**: `7a189879-5091-4f43-a2cf-a542cf218827`
- Click edit and replace with the correct value

#### Update SKIPCASH_USE_SANDBOX:
- **Current**: `b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b`
- **Should be**: `true`
- Click edit and replace with `true`

## 🚀 Quick Bulk Update (Easier)

Instead of updating one by one, use bulk paste:

1. Go to **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. Click **"Insert or update multiple secrets at once by pasting key-value pairs"**
3. Paste this:

```
SKIPCASH_CLIENT_ID=1333b59f-f3ef-4d76-92b6-8cd2c24f528b
SKIPCASH_KEY_ID=536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed
SKIPCASH_SECRET_KEY=BJZAz2n0CduW8O2+27u6XLLiZlqsdhia99coxTuVe6ZMlv9b7etZ0KNn0106y89RI279OBmC0TzI0Q+B6SQe0Bx8nQ1Vz7alzpqlHRlDcDrQG4DrizrTN2kY33UYX8d/63AAJbM8w5iSmYSvsile6kR5eZ9Z4bTSA0uxGu7+VIrK9AXdfHV7hLdi0iruVUC8BAcJYqrGvrA9mkClrXy9tsN7GQqxNMvBa3BvQnuKJBwU/ebq0cE1s+ugGqUyF5PPNG3OG3yjCb0NbZ6hTRcrXAqvhUcevK1lMiNfQtjLbTMLvv42fMiLgDbuabqNs11kErYeiuEXpkkazfnRysDAC0aS3bOxm6XBjgHucvfUMAehMNycfDi6eUSroPgfh3ZfPE/gcLZPgj2ptCmGYPHUyPnzXJG+MDcNDR9ZjOKGJ1EnN3pEgljMQcCmerDtux+yGx1QJBVe+SJW9w/UyzFEWxMuPyvzBmvWk4+NbErxiBVWEZQFiFJElHAh8hSDTBN6j76Bvt+7qwsMHeA86wH2kQ==
SKIPCASH_WEBHOOK_KEY=7a189879-5091-4f43-a2cf-a542cf218827
SKIPCASH_USE_SANDBOX=true
```

4. Click **"Save"**

## ✅ After Updating

1. **No redeploy needed** - Edge Functions automatically use updated secrets
2. **Try payment again** - Should work now!
3. **Check logs** - Should show correct secret key length (~600+)

## 🔍 Verification

After updating, the secrets should show:
- `SKIPCASH_SECRET_KEY` should be ~600+ characters (not 64)
- `SKIPCASH_KEY_ID` should be UUID format: `536f4a14-3f0a-42d6-b584-dfe2b8bdc3ed`
- `SKIPCASH_CLIENT_ID` should be UUID format: `1333b59f-f3ef-4d76-92b6-8cd2c24f528b`

