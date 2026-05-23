# 🔍 Quick Check: Is Supabase Connected?

## Quick Test

Open your browser console (F12) and run:

```javascript
// Check environment variables
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

// Test connection
import { supabase } from '@shared/services/supabase.service';
supabase.from('offers').select('count').then(r => {
  console.log('Connection test:', r.error ? '❌ Failed' : '✅ Success');
  if (r.error) console.error('Error:', r.error);
});
```

## Common Fixes

### 1. Restart Dev Server
Environment variables only load when the server starts:
```bash
# Stop server (Ctrl+C)
npm run dev:unified
```

### 2. Check All .env Files
Make sure these files have Supabase credentials:
- Root: `.env.development`
- Admin: `packages/admin/.env.development`
- Customer: `packages/customer/.env.development`

### 3. Verify Supabase Project
1. Go to https://supabase.com/dashboard
2. Make sure project is **active** (not paused)
3. Check **Settings** → **API** for correct URL and key

### 4. Check Browser Console
Look for:
- ❌ "Supabase URL or Anon Key not found" → Missing env vars
- ❌ Network errors → Connection issue
- ❌ RLS policy errors → Database permissions

## All Offers Pages Status

✅ **AddOfferPage** - Uses Supabase  
✅ **EditOfferPage** - Uses Supabase  
✅ **OffersListPage** - Uses Supabase (load + delete)  
✅ **OfferDetailPage** - Uses Supabase (load + delete)

All pages try Supabase first, then fallback to API, then localStorage.

