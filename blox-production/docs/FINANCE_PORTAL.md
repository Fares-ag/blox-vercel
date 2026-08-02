# Finance Portal

Operational finance portal for credit-parity decisions, activating financing, and day-to-day money ops (mark-paid, settlements, credits).

## Role

Assign with `admin_set_user_role` (or super-admin UI) using role `finance_officer`.

Credit and finance remain **separate roles**. Finance is a capability **superset** for application decisions + activation + money ops. Credit officers still cannot activate or adjust money.

## Local run

1. Ensure migrations are applied (including `20260802120000_finance_credit_decision_parity.sql`) via `npx supabase db push`.
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
| Review queue | Full credit-parity decisions: Approve for Finance, Generate Contract, Resubmit, Reject, Reopen, Contract Review |
| Activation | Activate Financing → `active` + payment schedules |
| Mark paid | Mark installments paid on application detail |
| Settlements | Approve / reject pending settlement requests |
| Credits | Add / subtract / set `user_credits` balances |
| Book / payments / exports | Read operational surfaces (unchanged) |

Credit-like approvals land on `pending_finance_activation`. Activation is an explicit second step via **Activate Financing**.

## Ops paths

**When both credit and finance exist (preferred):**

1. Dealer submits → `under_review`.
2. Credit portal → **Approve for Finance** → `pending_finance_activation`.
3. Finance portal → Activation tab → **Activate Financing** → `active` + schedules.
4. Customer can pay; email `application_approved` on activation.

**When finance operates solo:**

1. Finance Queue → **Review** tab → decide (Approve for Finance / contract / reject).
2. Finance Queue → **Activation** tab → **Activate Financing**.
3. Money ops on Settlements / Credits / application schedule as needed.

Admin / super_admin retain Activate override and all money ops on the shared application detail page.

Cross-portal scale / alignment QA: see `docs/QA_PORTAL_SCALE_ALIGNMENT_2026-07-24.md`.

## Nav

| Route | Purpose |
|-------|---------|
| `/finance/queue` | Queue — **Activation** (default) + **Review** (pipeline / rejected) |
| `/finance/book` | Active book (remaining + next installment) |
| `/finance/payments` | Schedules + payment transactions |
| `/finance/settlements` | Settlement requests (approve / reject) |
| `/finance/credits` | `user_credits` balances (adjust) |
| `/finance/exports` | CSV export of schedules / ledgers |

## Smoke checklist

1. `finance@blox.test` opens under_review app → Approve for Finance → `pending_finance_activation`
2. Same user Activate Financing → `active` + schedules
3. Finance Generate Contract / Resubmit / Reject / Reopen work
4. Finance Mark Paid on an active installment
5. Finance Approve and Reject a pending settlement
6. Finance add/subtract credits for a test email
7. Credit officer still cannot activate / mark-paid / settle / adjust credits
8. Admin still can do all of the above

## Intentionally unchanged

- Credit portal behavior
- Merging finance/credit into one role
- Flutter customer app copy
- SkipCash / settlement discount math
- Settlement discount settings editor (admin)
