# Payment Flows – Check Results

Summary of checks on **installment payment** (card + Blox Credit) and **Blox credits top-up**, and fixes applied.

---

## 1. Installment payment (card via SkipCash)

| Check | Status | Notes |
|-------|--------|--------|
| Return URL | OK | `returnUrl` = `/customer/applications/:id/payment-callback?transactionId=...&applicationId=...`. Route is `applications/:id/payment-callback` under `/customer`. |
| Callback verification | OK | Calls SkipCash verify, then polls `payment_transactions` until `status = 'completed'` (webhook has run). |
| Success UI | OK | Success state shows transaction details, **Download Receipt**, **Back to Application**. |
| Webhook | OK | Upserts `payment_transactions`, updates application `installment_plan.schedule` when `applicationId` and (for single payment) `paymentScheduleId` are present. |
| Receipt | OK | Callback builds payment from `paymentData` and calls `receiptService.generateAndDownload`. |

**Potential gap (non-blocking):** Webhook matches schedule by `payment.id === paymentScheduleId`. Ensure each schedule entry has a stable `id` (e.g. from `payment_schedules` or generated) so the correct installment is updated.

---

## 2. Installment payment (Blox Credit)

| Check | Status | Notes |
|-------|--------|--------|
| Flow | OK | No redirect. `creditsService.payInstallmentWithCredits` → RPC updates credits, schedule, and inserts `payment_transactions`. |
| Navigation | OK | Navigate to `payment-confirmation` with state (amount, method, dueDate, isSettlement, etc.). |
| Receipt | OK | Confirmation page uses state + optional `description` for settlement. |
| RPC | OK | Migration sets `paymentMethod`/`transactionId` on schedule and inserts into `payment_transactions`. |

Nothing missing for this flow.

---

## 3. Blox credits top-up (card via SkipCash)

| Check | Status | Notes |
|-------|--------|--------|
| Return URL | OK | `returnUrl` = `/customer/credit-topup-callback?transactionId=...&credits=...`. |
| Pending data | OK | `paymentId` and `credits` stored in `localStorage` under `pending_credit_topup_${transactionId}` for callback. |
| Callback success detection | OK | Uses URL `status`/`statusId` when present, else SkipCash verify (may 403); otherwise shows "pending". |
| **Double-add (webhook + claim)** | **Fixed** | Webhook calls `admin_add_user_credits` (writes to `credit_transactions`). Callback calls `customer_claim_payment_credits` (previously only checked `credit_history`), so credits could be added twice. **Fix:** Migration `20250215100000_credit_topup_claim_idempotency.sql` updates `customer_claim_payment_credits` to treat as already claimed if a row in `credit_transactions` for this user has `description` containing the transaction ID (webhook writes that). So claim is idempotent when webhook already added credits. |
| Toast when already added | **Fixed** | When claim returns `success: true` and `credits_added: 0`, callback now shows "Payment successful. Your credits are already in your account." instead of "Successfully added 0 credits". |
| Webhook | OK | For `type === 'credit_topup'` and completed, calls `admin_add_user_credits` with email and amount. |

**Note:** `customer_claim_payment_credits` reads/writes `credit_history`. If your deployment only has `credit_transactions`, you may need to either create `credit_history` or change the RPC to use only `credit_transactions` for idempotency and audit.

---

## 4. Summary of code changes

1. **Migration `20250215100000_credit_topup_claim_idempotency.sql`**  
   - `customer_claim_payment_credits`: idempotency extended to `credit_transactions` (so if webhook already added credits, claim returns success with `credits_added = 0` and does not add again).

2. **CreditTopUpCallbackPage**  
   - When claim returns success with `credits_added === 0`, show: "Payment successful. Your credits are already in your account." and still refresh balance and clear pending data.

---

## 5. What you should do

1. **Apply migrations** (in order):  
   - `20250215000000_customer_pay_with_credits_and_payment_improvements.sql` (if not already applied)  
   - `20250215100000_credit_topup_claim_idempotency.sql`

2. **Smoke-test**  
   - Installment (card): pay → callback → receipt → back to application.  
   - Installment (Blox Credit): pay → confirmation → receipt → back to application.  
   - Top-up: add credits → pay → callback; confirm balance and that refreshing/claiming again does not double credits and shows the “already in your account” message when applicable.

3. **Optional**  
   - If SkipCash does not always send `status`/`statusId` on the top-up return URL, consider polling `payment_transactions` (by `transaction_id`) until `status = 'completed'` then calling claim once (same pattern as installment callback), so the user sees success without relying on URL params.
