# Next Steps After Adding Secrets ✅

## ✅ Step 1: Secrets Added (DONE!)

Great! You've added all 5 secrets to Supabase.

## 🚀 Step 2: Deploy Edge Functions

You have **two options** to deploy:

### Option A: Deploy via Supabase Dashboard (Easiest - Recommended)

1. **Go to Supabase Dashboard** → **Edge Functions**

2. **For each function, create it:**

   #### Function 1: `skipcash-payment`
   - Click **"Create a new function"**
   - Name: `skipcash-payment`
   - Copy the entire contents from: `supabase/functions/skipcash-payment/index.ts`
   - Paste into the code editor
   - Click **"Deploy"**

   #### Function 2: `skipcash-verify`
   - Click **"Create a new function"**
   - Name: `skipcash-verify`
   - Copy the entire contents from: `supabase/functions/skipcash-verify/index.ts`
   - Paste into the code editor
   - Click **"Deploy"**

   #### Function 3: `skipcash-webhook`
   - Click **"Create a new function"**
   - Name: `skipcash-webhook`
   - Copy the entire contents from: `supabase/functions/skipcash-webhook/index.ts`
   - Paste into the code editor
   - Click **"Deploy"**

### Option B: Deploy via CLI (If you prefer command line)

Install Supabase CLI using one of these methods:
- **Windows**: Download from https://github.com/supabase/cli/releases
- **Or use**: `scoop install supabase` (if you have Scoop)

Then run:
```bash
supabase login
supabase link --project-ref [your-project-ref]
supabase functions deploy skipcash-payment
supabase functions deploy skipcash-verify
supabase functions deploy skipcash-webhook
```

## 🔗 Step 3: Configure Webhook URL in SkipCash

1. **Go to SkipCash Dashboard** → **Sandbox** → **Credentials** (or **Settings** → **Webhooks**)

2. **Find your Supabase Project Reference ID:**
   - Go to Supabase Dashboard → **Settings** → **General**
   - Look for **"Reference ID"** (it's a short string like `abcdefghijklmnop`)

3. **Set Webhook URL:**
   ```
   https://[your-project-ref].supabase.co/functions/v1/skipcash-webhook
   ```
   
   **Example**: If your project ref is `xyz123abc`, the URL would be:
   ```
   https://xyz123abc.supabase.co/functions/v1/skipcash-webhook
   ```

4. **Click "Save"**

## ✅ Step 4: Verify Everything Works

### Test 1: Check Functions are Deployed
- Go to Supabase Dashboard → **Edge Functions**
- You should see all 3 functions listed:
  - ✅ `skipcash-payment`
  - ✅ `skipcash-verify`
  - ✅ `skipcash-webhook`

### Test 2: Test Payment Flow
1. Go to your application's payment page
2. Select "Credit/Debit Card"
3. Fill in test payment details
4. Submit payment
5. You should be redirected to SkipCash payment page

### Test 3: Test Webhook (Optional)
1. Go to SkipCash Sandbox → **Webhooks Simulator**
2. Configure test parameters
3. Click **"Send"**
4. Check **"Webhook Events"** tab for logs
5. Check Supabase function logs to see if webhook was received

## 📋 Quick Checklist

- [x] Secrets added to Supabase ✅
- [ ] Edge Functions deployed (3 functions)
- [ ] Webhook URL configured in SkipCash
- [ ] Test payment completed
- [ ] Payment appears in database

## 🐛 Troubleshooting

### Functions Not Deploying
- Check you copied the entire file contents
- Verify no syntax errors in the code
- Check Supabase function logs for errors

### Webhook Not Working
- Verify webhook URL is correct (check project ref)
- Check Supabase function logs
- Test with webhook simulator in SkipCash

### Payment Not Redirecting
- Check browser console for errors
- Verify Edge Functions are deployed
- Check Supabase function logs
- Verify all secrets are set correctly

## 🎉 You're Almost Done!

Once you complete Steps 2 and 3, your SkipCash integration will be fully functional!

**Estimated Time**: 10-15 minutes

Need help? Check the detailed guides:
- `SKIPCASH_FINAL_SETUP.md` - Complete setup guide
- `SKIPCASH_WEBHOOK_GUIDE.md` - Webhook details

