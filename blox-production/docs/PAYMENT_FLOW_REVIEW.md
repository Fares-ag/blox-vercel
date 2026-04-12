# Payment Flow Review – Gaps and Fixes

## Implemented (all gaps addressed)

1. **Blox Credit payment** – Customer RPC `customer_pay_installment_with_credits(application_id, due_date, amount)`:
   - Checks auth, application ownership, and `current_user_can_pay_for_application`.
   - Verifies sufficient Blox Credits balance.
   - Deducts credits, updates `payment_schedules`, and syncs `application.installment_plan`.
   - Frontend: balance check before submit, `creditsService.payInstallmentWithCredits()` for single and settlement; balance shown when Blox Credit is selected.

2. **Receipt download**
   - **PaymentConfirmationPage:** Fetches application by `id`, finds payment (by `dueDate` from state or first paid), then `receiptService.generateAndDownload()` for PDF. Falls back to print on error.
   - **PaymentCallbackPage:** Fetches application by `applicationId`, builds payment from `paymentData`, then `receiptService.generateAndDownload()`. Falls back to print on error.

3. **Card type in DB** – `payment_transactions.card_type` added (nullable). Frontend sends `paymentMethod` (credit_card/debit_card) in `custom1`; SkipCash edge function parses it and sets `card_type` ('credit' or 'debit') on insert.

4. **Payment method constraint** – `payment_transactions.method` check updated to allow `'blox_credit'`.

5. **payment_schedules columns** – Migration ensures `paid_amount` and `remaining_amount` exist for the RPC and API.

6. **Double-submit** – Pay button disabled when `processing` is true.

7. **Confirmation state** – `dueDate` passed in state for receipt generation on PaymentConfirmationPage.

---

## Flow summary

| Step                    | Credit card | Debit (QPay) | Bank transfer | Blox credit   |
|-------------------------|------------|--------------|---------------|---------------|
| User selects method     | ✓          | ✓            | ✓             | ✓ (balance shown) |
| Redirect / mark paid    | SkipCash   | QPay         | mark as paid  | RPC deduct + mark paid |
| Callback / confirmation | Callback   | Callback     | Confirmation  | Confirmation  |
| Receipt                 | PDF + print | PDF + print | PDF + print   | PDF + print   |

---

## Return URL and gateway

- **returnUrl** includes `transactionId` and `applicationId`; callback reads `paymentId` from query if present.
- Confirm with SkipCash/QPay that they redirect to this URL and append `paymentId` when applicable.
