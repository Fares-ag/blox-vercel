# Quick Fix for Environment Variables

If you're still getting the Supabase URL error, try this:

## Option 1: Restart from Package Directory

1. **Stop the dev server** (Ctrl+C)

2. **Navigate to the super-admin package directory**:
   ```bash
   cd packages/super-admin
   ```

3. **Start Vite directly from there**:
   ```bash
   npm run dev
   ```

This ensures Vite runs from the correct directory and finds the `.env.development` file.

## Option 2: Use Root .env File

If Option 1 doesn't work, the root `.env.development` file should work. Make sure it exists at:
- `blox-production/.env.development`

And contains:
```
VITE_SUPABASE_URL=https://zqwsxewuppexvjyakuqf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxd3N4ZXd1cHBleHZqeWFrdXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjQ3ODMsImV4cCI6MjA4MTE0MDc4M30.R-eBBZAE8M8YX3fLKcBrh9R2wRvnwrDPQblNtbleywM
```

## Option 3: Check File Encoding

Make sure the `.env.development` file is saved as UTF-8 without BOM:
1. Open the file in your editor
2. Check encoding settings
3. Save as UTF-8

## Verify After Fix

After restarting, open browser console (F12) and run:
```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅' : '❌');
```

You should see the URL and a checkmark.
