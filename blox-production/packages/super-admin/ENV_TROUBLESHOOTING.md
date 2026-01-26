# Environment Variables Troubleshooting

If you're still getting the "supabaseUrl is required" error, try these steps:

## Step 1: Verify the .env file exists

Check that `packages/super-admin/.env.development` exists and has the correct content:

```bash
# Windows PowerShell
Get-Content packages\super-admin\.env.development

# Linux/Mac
cat packages/super-admin/.env.development
```

It should contain:
```
VITE_SUPABASE_URL=https://zqwsxewuppexvjyakuqf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 2: Stop and Restart the Dev Server

**IMPORTANT**: Environment variables are only loaded when Vite starts. You MUST restart:

```bash
# 1. Stop the server (Ctrl+C)
# 2. Start it again
npm run dev:super-admin
```

## Step 3: Clear Browser Cache

Sometimes the browser caches the old bundle. Try:
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or open in incognito/private mode

## Step 4: Check Browser Console

Open DevTools (F12) and run:

```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
```

If both show as `undefined`, the env vars aren't loading.

## Step 5: Verify Vite is Loading the File

Check the terminal output when starting the dev server. You should see:
```
VITE v7.x.x  ready in xxx ms
```

If you see warnings about missing env vars, the file isn't being read.

## Step 6: Alternative - Use Root .env File

If the package-level .env isn't working, create a root `.env.development` file:

```bash
# In the root directory (blox-production/)
# Create .env.development with the same content
```

## Step 7: Check File Encoding

Make sure the .env file is UTF-8 encoded and doesn't have a BOM (Byte Order Mark).

## Still Not Working?

1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules packages/super-admin/node_modules
   npm install
   ```

2. Check for typos in variable names (must start with `VITE_`)

3. Make sure there are no spaces around the `=` sign:
   ```env
   # ✅ Correct
   VITE_SUPABASE_URL=https://...
   
   # ❌ Wrong
   VITE_SUPABASE_URL = https://...
   ```
