# Payment Flow – What Else Is Missing (Optional / Nice-to-Have)

These are **optional** improvements and edge-case items, not blocking issues.

---

## 1. **Blox Credit: show method in Payment History**

- **Current:** When you pay with Blox Credit, the RPC updates `payment_schedules` and `application.installment_plan.schedule` (status, paidAmount, paidDate) but does **not** set `paymentMethod` on the schedule entry.
- **Effect:** Payment History is built from `installmentPlan.schedule`; paid rows appear, but **Payment Method** can show as "N/A" for Blox Credit payments.
- **Fix:** In the RPC `customer_pay_installment_with_credits`, when building the updated schedule JSON, add `'paymentMethod', 'blox_credit'` (and optionally a generated `transactionId` for reference) to the `jsonb_build_object` for the updated entry.

---

## 2. **Blox Credit: no row in `payment_transactions`**

- **Current:** Card/bank flows create or update rows in `payment_transactions`. Blox Credit only updates `user_credits`, `credit_transactions`, `payment_schedules`, and `application.installment_plan`.
- **Effect:** Admin or reporting that relies **only** on `payment_transactions` will not see Blox Credit payments. Payment History still works because it uses the schedule on the application.
- **Fix (optional):** After a successful Blox Credit payment (in the RPC or from the app), insert a row into `payment_transactions` with `method: 'blox_credit'`, `application_id`, `amount`, `status: 'completed'`, and optionally a generated `transaction_id`, for consistency and reporting.

---

## 3. **Settlement receipt is single-installment**

- **Current:** After a **settlement** (multiple installments), the confirmation page receives `isSettlement`, total `amount`, and `paymentsSettled`. Receipt generation uses the **first paid** schedule entry (or `dueDate` when present), so the PDF is effectively for one installment, not a “settlement summary.”
- **Effect:** For settlement, the downloaded receipt looks like one payment, not “Settlement of N installments, total X QAR.”
- **Fix (optional):** Add a settlement-specific receipt layout (e.g. list of settled installments + total) and pass enough data in state (or refetch) so the confirmation page can render that when `isSettlement` is true.

---

## 4. **Webhook upsert and `card_type`**

- **Current:** SkipCash payment edge function inserts `payment_transactions` with `card_type` when present. The webhook **upserts** by `transaction_id` with a fixed set of fields and does **not** send `card_type`.
- **Effect:** In Postgres/Supabase, an upsert that omits a column usually leaves that column unchanged on conflict update, so the `card_type` set at insert should be preserved. If your upsert is ever changed to a “full replace” semantics, `card_type` could be cleared.
- **Fix (optional):** If the webhook ever does a full row replace, include `card_type` in the webhook payload (e.g. by looking up the existing row or passing it through from initial payment creation if available in webhook context).

---

## 5. **Tests for new behavior**

- **Current:** New logic (Blox Credit RPC + UI, PDF receipt on confirmation/callback, `card_type` in edge function) may not be covered by tests.
- **Fix (optional):** Add tests for:
  - Blox Credit: balance check, `payInstallmentWithCredits` success/failure, settlement loop.
  - Receipt: confirmation page download (with mocked app/schedule), callback page download (with mocked app).
  - Edge function: `custom1.paymentMethod` → `card_type` in `payment_transactions` insert.

---

## 6. **Settlement with Blox Credit: partial failure**

- **Current:** Settlement with Blox Credit loops and calls `payInstallmentWithCredits` for each installment. If one call fails (e.g. insufficient credits mid-loop), earlier installments are already paid and credits already deducted; we don’t roll back.
- **Effect:** User can end up with a “partial settlement” (some installments paid, some not) and reduced balance.
- **Fix (optional):** Either:
  - **Pre-check:** Before the loop, ensure balance ≥ total settlement amount and reserve or block that amount, or
  - Document that partial settlement can occur and show a clear message when it does (e.g. “X of Y installments paid; insufficient credits for the rest”).

---

## 7. **Return URL / gateway behavior**

- **Current:** `returnUrl` includes `transactionId` and `applicationId`. Callback supports `paymentId` from the gateway.
- **Recommendation:** Confirm with SkipCash/QPay that they redirect to this URL and, if applicable, append `paymentId` (or any required params) so verification and receipts always have the right data.

---

## Summary table

| Item                               | Priority  | Effort |
|------------------------------------|-----------|--------|
| Blox Credit `paymentMethod` in schedule | Low       | Small  |
| Blox Credit row in `payment_transactions` | Low (reporting) | Small |
| Settlement summary receipt        | Low       | Medium |
| Webhook and `card_type`            | Low       | Small (only if upsert semantics change) |
| Tests for new flows                | Medium    | Medium |
| Settlement partial-failure handling| Medium    | Small–Medium |

Nothing here is required for the current payment flow to work; they are improvements and safeguards.
