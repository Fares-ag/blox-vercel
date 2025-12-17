# 🔧 Troubleshooting Supabase Connection

## Issue: "Backend not available, using localStorage: Network error"

This error means Supabase is failing to connect. Here's how to fix it:

### Step 1: Verify Environment Variables

Make sure your `.env.development` files have the correct Supabase credentials:

**Root `.env.development`:**
```env
VITE_SUPABASE_URL=https://zqwsxewuppexvjyakuqf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxd3N4ZXd1cHBleHZqeWFrdXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjQ3ODMsImV4cCI6MjA4MTE0MDc4M30.R-eBBZAE8M8YX3fLKcBrh9R2wRvnwrDPQblNtbleywM
```

**Also check:**
- `packages/admin/.env.development`
- `packages/customer/.env.development`

### Step 2: Restart Your Dev Server

After updating environment variables, **restart your dev server**:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev:unified
```

Environment variables are only loaded when the server starts!

### Step 3: Check Browser Console

Open your browser's Developer Tools (F12) and check the Console tab for:
- ❌ Supabase connection errors
- ⚠️ Missing environment variable warnings
- Any network errors

### Step 4: Verify Supabase is Running

1. Go to https://supabase.com/dashboard
2. Select your project
3. Check if the project is active (not paused)
4. Go to **Settings** → **API** to verify your URL and keys

### Step 5: Test Supabase Connection

In your browser console, try:

```javascript
// Check if Supabase is loaded
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
```

### Step 6: Check Network Tab

1. Open Developer Tools → **Network** tab
2. Try creating an offer
3. Look for requests to `supabase.co`
4. Check if they're failing (red) or succeeding (green)

### Common Issues:

1. **Environment variables not loaded**
   - ✅ Solution: Restart dev server

2. **Supabase project paused**
   - ✅ Solution: Go to Supabase Dashboard and resume project

3. **Wrong credentials**
   - ✅ Solution: Copy fresh credentials from Supabase Dashboard → Settings → API

4. **CORS issues**
   - ✅ Solution: Check Supabase Dashboard → Settings → API → CORS settings

5. **RLS (Row Level Security) blocking**
   - ✅ Solution: Check if RLS policies allow public access (for development)

## ✅ All Offers Pages Updated

I've updated **all** offers pages to use Supabase:

1. ✅ **AddOfferPage** - Creates offers via Supabase
2. ✅ **EditOfferPage** - Updates offers via Supabase
3. ✅ **OffersListPage** - Loads and deletes offers via Supabase
4. ✅ **OfferDetailPage** - Loads and deletes offers via Supabase

All pages follow this pattern:
1. Try Supabase first
2. Fallback to regular API
3. Final fallback to localStorage

## Still Having Issues?

If you're still seeing errors, check:
1. Browser console for detailed error messages
2. Network tab for failed requests
3. Supabase Dashboard → Logs for server-side errors

