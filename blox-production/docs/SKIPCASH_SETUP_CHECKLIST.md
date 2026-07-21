# SkipCash Setup Checklist

> **Purpose:** Complete guide for configuring SkipCash integration and running a
> sandbox payment end-to-end. Required before any real payments can be processed.

---

## 1. Required Edge Function Secrets

Navigate to: **Supabase Dashboard → Project `zqwsxewuppexvjyakuqf` → Edge Functions → Secrets**

Set each secret below. Values must be exact (no trailing spaces, no quotes).

| Secret Name | Format / Source | Required |
|---|---|---|
| `SKIPCASH_USE_SANDBOX` | `true` (sandbox) or `false` (production) | ✅ Must be set |
| `SKIPCASH_SANDBOX_URL` | `https://skipcashtest.azurewebsites.net` | ✅ Must be set |
| `SKIPCASH_PRODUCTION_URL` | `https://api.skipcash.app` | ✅ Must be set |
| `SKIPCASH_KEY_ID` | UUID string from SkipCash merchant portal → API Keys | ✅ Must be set |
| `SKIPCASH_SECRET_KEY` | Base64-encoded RSA private key from SkipCash portal (typically 700+ chars) | ✅ Must be set |
| `SKIPCASH_CLIENT_ID` | Merchant Client ID from SkipCash portal | ✅ Must be set |
| `SKIPCASH_WEBHOOK_KEY` | Webhook signing key from SkipCash portal | ✅ Must be set |

> **How to get SkipCash credentials:**
> 1. Log in to the SkipCash merchant portal (sandbox: https://skipcashtest.azurewebsites.net/merchant)
> 2. Navigate to Settings → API Keys
> 3. Copy `Key ID`, `Client ID`, and the RSA Private Key (base64)
> 4. Copy the Webhook Secret from Settings → Webhooks

---

## 2. Sandbox Environment Setup

### 2.1 Set secrets for sandbox

In Supabase Dashboard → Edge Functions → Secrets:

```
SKIPCASH_USE_SANDBOX = true
SKIPCASH_SANDBOX_URL = https://skipcashtest.azurewebsites.net
SKIPCASH_KEY_ID      = <your sandbox key ID>
SKIPCASH_SECRET_KEY  = <your sandbox RSA private key base64>
SKIPCASH_CLIENT_ID   = <your sandbox client ID>
SKIPCASH_WEBHOOK_KEY = <your sandbox webhook key>
```

### 2.2 Configure webhook URL in SkipCash portal

Set the Webhook URL to:
```
https://zqwsxewuppexvjyakuqf.supabase.co/functions/v1/skipcash-webhook
```

### 2.3 Configure return URL

The frontend sends `ReturnUrl` as the customer-facing redirect after payment.
Ensure the Customer app's deep link / web URL is whitelisted in SkipCash portal:
```
https://customer.blox.market/customer/payments/complete
bloxcustomer://payments/complete
```

---

## 3. Step-by-Step Sandbox Test Procedure

1. **Verify secrets are set** — check Supabase Dashboard → Edge Functions → Secrets all 7 values are present.

2. **Login as a test customer** on Customer web or Flutter app.

3. **Select an active application** and navigate to Payments.

4. **Click Pay** on an unpaid installment.

5. **Verify logs** — Supabase Dashboard → Edge Functions → skipcash-payment → Logs should show:
   - `SkipCash config loaded: { useSandbox: true, ... }`
   - `SkipCash payment request successful: { paymentId: "...", hasPaymentUrl: true }`

6. **You should be redirected** to the SkipCash sandbox checkout page at `skipcashtest.azurewebsites.net`.

7. **Complete payment** using SkipCash test card: `4111 1111 1111 1111` / any future date / any CVV.

8. **Verify webhook** — Supabase Dashboard → Edge Functions → skipcash-webhook → Logs should show the payment_id and a `200 OK` response.

9. **Verify DB** — run these queries in Supabase Dashboard → SQL Editor:
   ```sql
   -- Payment transaction should be 'completed'
   SELECT id, status, skipcash_payment_id, payment_schedule_id
   FROM payment_transactions
   ORDER BY created_at DESC LIMIT 5;

   -- Schedule should be 'paid'
   SELECT id, status, paid_date
   FROM payment_schedules
   ORDER BY updated_at DESC LIMIT 5;

   -- Ledger entry should be created
   SELECT * FROM ledgers ORDER BY created_at DESC LIMIT 5;
   ```

---

## 4. Transitioning to Production

1. Change `SKIPCASH_USE_SANDBOX` to `false` in Edge Function Secrets.
2. Update `SKIPCASH_KEY_ID`, `SKIPCASH_SECRET_KEY`, `SKIPCASH_CLIENT_ID`,
   and `SKIPCASH_WEBHOOK_KEY` to production values from SkipCash merchant portal.
3. Update webhook URL in SkipCash production portal to the same Supabase function URL.
4. Run the sandbox test procedure using a real QAR 1 test transaction to verify.

---

## 5. Diagnosing Payment Failures

| Symptom | Likely Cause | Fix |
|---|---|---|
| `SKIPCASH_USE_SANDBOX must be explicitly set` | Secret not set | Set `SKIPCASH_USE_SANDBOX=true` |
| `Missing: SKIPCASH_SECRET_KEY` | Secret not set | Add secret in Dashboard |
| `SkipCash API returned invalid response: 401` | Wrong `SKIPCASH_KEY_ID` or `SKIPCASH_SECRET_KEY` | Re-copy from portal |
| `SkipCash API returned invalid response: 400` | Signature mismatch | Check key format (must be raw base64, no PEM headers) |
| `Webhook signature mismatch` | `SKIPCASH_WEBHOOK_KEY` incorrect | Re-copy webhook key from portal |
| `payment_transactions.skipcash_payment_id = NULL` | Old code path before fix | Apply migrations + redeploy function |
