# Deploy Edge Functions - Quick Guide

## Option 1: Deploy via Command Line (Current Directory)

### Step 1: Login to Supabase
```bash
npx supabase login
```
This will open a browser for authentication.

### Step 2: Link Your Project
```bash
npx supabase link --project-ref [your-project-ref]
```
Replace `[your-project-ref]` with your Supabase project reference ID.

**To find your project ref:**
- Go to Supabase Dashboard → Settings → General
- Look for "Reference ID" (short string like `xyz123abc`)

### Step 3: Deploy All Functions
```bash
npx supabase functions deploy skipcash-payment
npx supabase functions deploy skipcash-verify
npx supabase functions deploy skipcash-webhook
```

## Option 2: Deploy via Dashboard (No CLI Needed)

1. Go to **Supabase Dashboard** → **Edge Functions**
2. For each function:
   - Click **"Create a new function"**
   - Name the function
   - Copy code from the corresponding file
   - Click **"Deploy"**

### Files to Deploy:
- `supabase/functions/skipcash-payment/index.ts` → Function name: `skipcash-payment`
- `supabase/functions/skipcash-verify/index.ts` → Function name: `skipcash-verify`
- `supabase/functions/skipcash-webhook/index.ts` → Function name: `skipcash-webhook`

## After Deployment

1. Verify functions are listed in Supabase Dashboard
2. Configure webhook URL in SkipCash dashboard
3. Test payment flow

