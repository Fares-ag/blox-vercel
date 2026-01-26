# Super Admin Environment Variables Setup

## Quick Fix

The super-admin package needs environment variables to connect to Supabase. Create a `.env.development` file in the `packages/super-admin/` directory.

## Steps

1. **Create the file**: `packages/super-admin/.env.development`

2. **Add these lines**:
```env
VITE_SUPABASE_URL=https://zqwsxewuppexvjyakuqf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxd3N4ZXd1cHBleHZqeWFrdXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjQ3ODMsImV4cCI6MjA4MTE0MDc4M30.R-eBBZAE8M8YX3fLKcBrh9R2wRvnwrDPQblNtbleywM
```

3. **Restart your dev server**:
```bash
# Stop the current server (Ctrl+C)
npm run dev:super-admin
```

## Alternative: Copy from Admin Package

If you already have the admin package working, you can copy its `.env.development` file:

```bash
# Windows PowerShell
Copy-Item "packages\admin\.env.development" -Destination "packages\super-admin\.env.development"

# Linux/Mac
cp packages/admin/.env.development packages/super-admin/.env.development
```

## Verify It's Working

After restarting, check the browser console - you should NOT see the Supabase warning anymore.
