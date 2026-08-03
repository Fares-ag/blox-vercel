# Finance Portal

Operational finance portal for credit-parity decisions, viewing the activation queue, and day-to-day money ops (mark-paid, settlements, credits).

## Role

Assign with `admin_set_user_role` (or super-admin UI) using role `finance_officer`.

Credit and finance remain **separate roles**. **Credit** (and admin) **Activate Financing** → `active`. Finance can decide into `pending_finance_activation` and **view** the activation queue / active book, but cannot activate. **Mark-paid** is shared by credit, finance, and admin. Settlements and Blox credits remain finance/admin.

## Local run

1. Ensure migrations are applied (including `20260803180000_credit_activates_finance_views.sql`) via `npx supabase db push`.
2. Ensure `packages/finance/.env.development` has Supabase URL + anon key (same project as credit/admin). `VITE_BYPASS_GUARDS=false` for real role checks.
3. Redeploy edge function `send-email` so templates `application_credit_approved` / `application_approved` are live.
4. From repo root: `npm run dev:finance` → http://localhost:5179/finance

Scripts: `dev:finance`, `build:finance`, `lint:finance`.

## Role + company scope

- Assign role `finance_officer` (Users detail or `admin_set_user_role`).
- Default `users.finance_scope = 'all'` (platform-wide). For partner-only finance, set `finance_scope = 'assigned'` and assign companies on **Admin → Partner → Assigned finance officers**.
- Settlement **discount settings** remain admin-only.

## Capabilities

| Area | Finance can |
|------|-------------|
| Review queue | Credit-parity decisions: Approve for Finance, Generate Contract, Resubmit, Reject, Reopen, Contract Review |
| Activation | **View** pending / adjacent apps (no Activate button) |
| Mark paid | Mark installments paid on application detail (shared with credit/admin) |
| Settlements | Approve / reject pending settlement requests |
| Credits | Add / subtract / set `user_credits` balances |
| Book / payments / exports | Read operational surfaces (unchanged) |

Credit-like approvals land on `pending_finance_activation`. Activation is an explicit second step on the **credit** (or admin) portal via **Activate Financing**.

## Ops paths

**When both credit and finance exist (preferred):**

1. Dealer submits → `under_review`.
2. Credit (or finance Review) → **Approve for Finance** → `pending_finance_activation`.
3. Credit portal → **Activate Financing** → `active` + schedules.
4. Finance views Activation tab / Active Book; mark-paid / settlements / credits as needed (credit can also mark-paid).
5. Customer can pay; email `application_approved` on activation.

**When finance operates solo on decisions:**

1. Finance Queue → **Review** tab → decide (Approve for Finance / contract / reject).
2. Credit (or admin) must still **Activate Financing** — finance cannot.
3. Money ops on Settlements / Credits / application schedule as needed.

Admin / super_admin retain Activate override and all money ops on the shared application detail page.

Cross-portal scale / alignment QA: see `docs/QA_PORTAL_SCALE_ALIGNMENT_2026-07-24.md`.

## Nav

| Route | Purpose |
|-------|---------|
| `/finance/queue` | Queue — **Activation** (view, default) + **Review** (pipeline / rejected) |
| `/finance/book` | Active book (remaining + next installment) |
| `/finance/payments` | Schedules + payment transactions |
| `/finance/settlements` | Settlement requests (approve / reject) |
| `/finance/credits` | `user_credits` balances (adjust) |
| `/finance/exports` | CSV export of schedules / ledgers |

## Smoke checklist

1. Credit (or finance) opens under_review app → Approve for Finance → `pending_finance_activation`
2. Credit Activate Financing → `active` + schedules
3. Finance has **no** Activate button; forced `→ active` is rejected by DB
4. Finance Generate Contract / Resubmit / Reject / Reopen work
5. Credit or Finance Mark Paid on an active installment
6. Finance Approve and Reject a pending settlement
7. Finance add/subtract credits for a test email
8. Credit officer can mark-paid; cannot settle / adjust credits
9. Admin still can activate and do money ops

## Intentionally unchanged

- Merging finance/credit into one role
- Flutter customer app copy
- SkipCash / settlement discount math
- Settlement discount settings editor (admin)
