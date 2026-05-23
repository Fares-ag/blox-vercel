# Payment Structure – Production Readiness

**Summary:** The payment flows (installment card, installment Blox Credit, credit top-up) and edge functions are **implemented and hardened**. You can go to production after completing the checklist below.

---

## ✅ What’s in place

| Area | Status |
|------|--------|
| **Installment (card)** | Return URL, callback verification (verify + DB poll), receipt download, webhook updates schedule + `payment_transactions`. |
| **Installment (Blox Credit)** | RPC deducts credits, updates schedule + `paymentMethod`/`transactionId`, inserts `payment_transactions`; confirmation + receipt (incl. settlement description). |
| **Credit top-up** | Callback + webhook; idempotent claim (no double-add); toast when already added. |
| **skipcash-payment** | Auth, permission RPCs, rate limit, body read once, amount validation, no secret/PII in logs, credit top-up price check. |
| **skipcash-webhook** | Signature verification, idempotency, transactionId from Custom1, amount/credits sanitized, card_type preserved. |
| **skipcash-verify** | Empty body check, status from string/number, Deno env, no full response in logs. |
| **Settlement** | Blox Credit partial-failure message; receipt description “Settlement of N installments”. |
| **Tests** | credits.service (payInstallmentWithCredits), PaymentConfirmationPage (receipt + settlement), card_type contract. |

---

## ⚠️ Before going to production

### 1. Database migrations (run in order)

In the **production** Supabase SQL editor (or `supabase db push`):

1. **`20250215000000_customer_pay_with_credits_and_payment_improvements.sql`**  
   - `payment_schedules` columns, `customer_pay_installment_with_credits` RPC (credits + schedule + `payment_transactions` + `paymentMethod`/`transactionId`), `payment_transactions` method check + `card_type`.

2. **`20250215100000_credit_topup_claim_idempotency.sql`**  
   - `customer_claim_payment_credits` idempotency vs `credit_transactions` (no double-add with webhook).

**Dependency:** `customer_claim_payment_credits` uses the **`credit_history`** table (SELECT + INSERT). If that table does not exist in production, create it (or adapt the RPC to use only `credit_transactions`). The repo references `credit_history` in `ADD_CUSTOMER_CLAIM_CREDITS_RPC.sql`; ensure the same schema exists in prod.

### 2. Permission RPCs

Confirm these exist and are granted to `authenticated` (or the right role):

- `current_user_can_pay_for_application(p_application_id)`
- `current_user_can_pay_for_any_application()`

(Your cutover doc mentions `current_user_can_pay()`; the edge function uses the two above. Ensure the scripts that add companies and payment permissions are applied so these RPCs exist.)

### 3. Edge function secrets (production)

In Supabase → Settings → Edge Functions → Secrets:

| Secret | Value (production) |
|--------|--------------------|
| `SKIPCASH_USE_SANDBOX` | `false` |
| `SKIPCASH_CLIENT_ID` | Production client ID |
| `SKIPCASH_KEY_ID` | Production key ID |
| `SKIPCASH_SECRET_KEY` | Production secret key |
| `SKIPCASH_WEBHOOK_KEY` | Production webhook key |

Optional (defaults in code):

- `SKIPCASH_PRODUCTION_URL=https://api.skipcash.app`
- `SKIPCASH_SANDBOX_URL=https://skipcashtest.azurewebsites.net`

### 4. SkipCash dashboard

- Set **production webhook URL** to:  
  `https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/skipcash-webhook`
- Use **production** API credentials (not sandbox) when `SKIPCASH_USE_SANDBOX=false`.

### 5. Customer app production build

- Build with production env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` for the **production** project.
- Deploy so the app is served from the **final production domain**.  
  Return URLs use `window.location.origin`, so callbacks will be:
  - Installment: `https://<YOUR_DOMAIN>/customer/applications/<id>/payment-callback?...`
  - Top-up: `https://<YOUR_DOMAIN>/customer/credit-topup-callback?...`

### 6. Smoke tests (after cutover)

- **Installment (card):** One small real payment → redirect to SkipCash → return to callback → success, download receipt, back to application. Check `payment_transactions` and application schedule in DB.
- **Installment (Blox Credit):** Pay one installment with credits → confirmation → download receipt (and optional settlement with 2+ installments).
- **Credit top-up:** Add credits → pay → return to callback → balance updated; refresh/call claim again → “Your credits are already in your account” (no double-add).

---

## Optional / later

- **Top-up callback:** If SkipCash does not always send `status`/`statusId` on the return URL, consider polling `payment_transactions` by `transaction_id` until `status = 'completed'` then calling claim once (like the installment callback).
- **skipcash-verify:** No explicit auth check; it relies on being invoked from your frontend with the user’s session. Acceptable if the function URL is only used by your app; add explicit auth if you expose it more broadly.
- **Schedule `id`:** Webhook matches schedule by `payment.id === paymentScheduleId`. Ensure each schedule entry has a stable `id` (from `payment_schedules` or generated) so the correct installment is updated.

---

## Verdict

**Yes – the payment structure is ready for production** once:

1. Both migrations are applied (and `credit_history` exists or is adapted).
2. Permission RPCs and Edge Function secrets are set for production.
3. SkipCash production webhook URL is configured.
4. Customer app is built and deployed from the production domain.
5. Smoke tests pass for card installment, Blox Credit installment, and credit top-up.

Use **PRODUCTION_SKIPCASH_CUTOVER.md** for the exact project ref, deploy commands, and env details.
