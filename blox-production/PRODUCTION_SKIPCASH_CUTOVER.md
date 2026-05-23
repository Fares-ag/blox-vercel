# Production SkipCash Cutover (Supabase + Edge Functions)

Target Supabase project ref (production): `zqwsxewuppexvjyakuqf`

## 1) Customer domain (ReturnUrl)
The customer app builds `ReturnUrl` from **`window.location.origin`** in:
- `packages/customer/src/modules/customer/features/payments/pages/PaymentPage/PaymentPage.tsx`

So whichever domain users visit in production becomes the callback base:
- `https://<YOUR_PROD_CUSTOMER_DOMAIN>/customer/applications/<id>/payment-callback?...`

If you deploy under a subfolder (e.g. `/customer/`), tell me first—Vite `base` may need changes.

## 2) Supabase Edge Function secrets (production)
In Supabase Dashboard → Settings → Edge Functions → Secrets:

- `SKIPCASH_USE_SANDBOX=false`
- `SKIPCASH_CLIENT_ID=<PROD_CLIENT_ID>`
- `SKIPCASH_KEY_ID=<PROD_KEY_ID>`
- `SKIPCASH_SECRET_KEY=<PROD_SECRET_KEY>`
- `SKIPCASH_WEBHOOK_KEY=<PROD_WEBHOOK_KEY>`

Optional (defaults exist in code):
- `SKIPCASH_PRODUCTION_URL=https://api.skipcash.app`
- `SKIPCASH_SANDBOX_URL=https://skipcashtest.azurewebsites.net`

## 3) Deploy Edge Functions to production project
Use CLI (preferred) or Dashboard (manual).

CLI:
```bash
npx supabase login
npx supabase link --project-ref zqwsxewuppexvjyakuqf
npx supabase functions deploy skipcash-payment
npx supabase functions deploy skipcash-verify
npx supabase functions deploy skipcash-webhook
```

## 4) Configure SkipCash production webhook URL
Set the production webhook URL in SkipCash dashboard to:
- `https://zqwsxewuppexvjyakuqf.supabase.co/functions/v1/skipcash-webhook`

## 5) Customer app production build env
Create (locally, do not commit):
- `packages/customer/.env.production`

Minimum required:
```env
VITE_SUPABASE_URL=https://zqwsxewuppexvjyakuqf.supabase.co
VITE_SUPABASE_ANON_KEY=<PROD_ANON_KEY>
```

Then build + deploy your `packages/customer/dist/` to your production domain.

## 6) Permission enforcement consistency
Production card payment initiation (`skipcash-payment`) now uses:
- `public.current_user_can_pay()` RPC (same as the customer UI)

Ensure `ADD_COMPANIES_AND_PAYMENT_PERMISSIONS.sql` has been run in production so:
- `current_user_can_pay()` exists
- it returns **FALSE** if `company_id` is NULL
- `GRANT EXECUTE ON FUNCTION public.current_user_can_pay() TO authenticated;` is applied

## 7) Smoke test
- Make a very small real payment
- Confirm:
  - Redirect goes to SkipCash production checkout
  - Callback returns to your production customer domain
  - Webhook hits Supabase Edge Function logs
  - `payment_transactions` updated + schedule updated

