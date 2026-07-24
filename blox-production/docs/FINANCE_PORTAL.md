# Finance Portal

Operational finance portal for activating credit-approved applications and reviewing the active book.

## Role

Assign with `admin_set_user_role` (or super-admin UI) using role `finance_officer`.

## Local run

1. **Apply migration** (required before finance login works against remote DB):
   `supabase/migrations/20260724210000_finance_officer_activation_handoff.sql`
   via `npx supabase db push` (after `supabase login`) or paste/run in the Supabase SQL editor.
2. Ensure `packages/finance/.env.development` has Supabase URL + anon key (same project as credit/admin). `VITE_BYPASS_GUARDS=false` for real role checks.
3. Redeploy edge function `send-email` so template `application_credit_approved` is live.
4. From repo root: `npm run dev:finance` → http://localhost:5179/finance

Scripts: `dev:finance`, `build:finance`, `lint:finance`.

## Role + company scope

- Assign role `finance_officer` (Users detail or `admin_set_user_role`).
- Default `users.finance_scope = 'all'` (platform-wide). For partner-only finance, set `finance_scope = 'assigned'` and assign companies on **Admin → Partner → Assigned finance officers**.
- Settlements remain **approve-in-admin only**; finance portal is read-only for settlements/credits.

## Activation handoff (smoke)

1. Dealer submits application → `under_review`.
2. Credit officer opens Credit portal → **Approve for Finance** (not Activate) → `pending_finance_activation`.
3. Customer sees badge/copy: “Approved — awaiting finance activation” (email: `application_credit_approved`).
4. Finance officer opens Finance portal → Activation Queue → **Activate Financing** → `active` + payment schedules.
5. Customer can pay installments; email `application_approved` fires on true activation.

Admin / super_admin retain an Activate override on the shared application detail page.

## Nav

| Route | Purpose |
|-------|---------|
| `/finance/queue` | Activation queue (`pending_finance_activation` + adjacent handoff states) |
| `/finance/book` | Active book (remaining + next installment) |
| `/finance/payments` | Schedules + payment transactions |
| `/finance/settlements` | Settlement requests (read) |
| `/finance/credits` | `user_credits` balances (read) |
| `/finance/exports` | CSV export of schedules / ledgers (not a full GL) |

## Intentionally unchanged

- SkipCash / settlement discount math
- Settlement approve workflow (admin)
- iOS / unrelated portals
