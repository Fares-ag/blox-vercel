# QA — Finance credit-decision parity & money ops

**Date:** 2026-08-02  
**Scope:** Verification only (no product code changes). Migration `20260802120000_finance_credit_decision_parity` already applied on Supabase `zqwsxewuppexvjyakuqf`.  
**Method:** Static code review + remote SQL evidence + API-level smoke (`scripts/qa-finance-credit-parity-smoke.mjs`) against live project; finance/credit Vite portals up for HTTP checks.  
**Accounts:** `finance@blox.test`, `credit@blox.test`, `admin@blox.test`, dealer seed via `dealer@blox.market`.  
**Primary smoke app:** `application-98` (and helpers `application-99`…`100`).

---

## Recommendation

**SHIP WITH GATES**

API/DB/matrix evidence for finance credit parity + mark-paid / settlements / credits is solid. Residual gates are UI click-through confirmation and one untested assigned-scope case—not P0 blockers.

---

## Phase 0 — Static / DB

| Check | Result | Evidence |
|-------|--------|----------|
| `FINANCE_OFFICER_ALLOWED` includes credit edges + `→ active` | **PASS** | `application-status-transitions.ts`: `under_review → pending_finance_activation`; `pending_finance_activation → active`; contract paths include `active` where intended |
| `FINANCE_REVIEW_QUEUE_STATUSES` exported | **PASS** | Same file; used by `FinanceQueuePage.tsx` |
| Migration remote | **PASS** | `schema_migrations`: `20260802120000` present |
| Trigger finance `under_review → pending_finance_activation` | **PASS** | `enforce_application_status_transition` body includes finance branch + PFA |
| Policy `Finance officers update application settlements` | **PASS** | `pg_policies` UPDATE policy present (plus SELECT) |
| `admin_*_user_credits` allow `is_finance_officer()` | **PASS** | SQL: add/subtract/set prosrc contain `is_finance_officer` |
| UI gates `canCreditDecide` / `canMarkPaid` / `canFinanceActivate` | **PASS** | `ApplicationDetailPage.tsx`: finance in decide + mark-paid + activate; credit excluded from activate/mark-paid |
| Queue tabs Activation + Review | **PASS** | `FinanceQueuePage.tsx` MainTab + Pipeline/Rejected |
| Settlements / Credits write UI | **PASS** | Approve/Reject on settlements; Adjust + `ManageCreditsDialog` on credits |
| Typecheck shared | **PASS** | `tsc -p packages/shared` clean (no errors reported) |
| Typecheck finance | **FAIL (pre-existing, out of scope)** | Pulls admin module; `PartnerDetailPage.tsx` `Company \| undefined` — unrelated to finance parity |

---

## Phase 1 — Finance happy path

| # | Check | Result | Notes |
|---|--------|--------|-------|
| F1 | Queue tabs load apps | **PASS** | Activation filter OK (0 rows at run start); Review filter returned 7–13 apps. HTTP `/finance/auth/login` → 200 |
| F2 | Approve for Finance | **PASS** | `application-98`: `under_review` → `pending_finance_activation`. Customer notif/email template path **not observed** in this run |
| F3 | Activate Financing | **PASS** | → `active` + 2 `payment_schedules` rows via finance dual-write (same shape as `replacePaymentSchedulesFromInstallmentPlan`) |
| F4 | Contract / resubmit / reject / reopen | **PASS** | `application-99` matrix path: resubmit → under_review → reject → reopen → contract_signing_required |
| F5 | Contract review → PFA (not active) | **PASS** | `application-100`: `contract_under_review` → `pending_finance_activation`. Client contract approve also hard-codes PFA in detail page |
| F6 | Mark paid | **PASS** | Unpaid schedule → `paid` (`paid_date` / amounts updated) on smoke app |
| F7 | Settlement approve/reject | **PASS** | No pre-existing pending rows; admin-seeded pending on smoke app; finance UPDATE → `approved` |
| F8 | Credits adjust | **PASS** | Finance `admin_add_user_credits` + `admin_subtract_user_credits` on `customer@blox.test`; `credit_transactions` rows present; balance restored to 0 |

Reproduce:

```bash
cd blox-production
npm run dev:finance   # :5179
npm run dev:credit    # :5177
node scripts/qa-finance-credit-parity-smoke.mjs
```

---

## Phase 2 — Regression (credit + admin)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| C1 | Credit cannot → `active` | **PASS** | Client matrix: `credit_officer` `under_review → active` = false. Live: forced update did not yield `active`. UI: `canFinanceActivate` / `canMarkPaid` exclude credit |
| C2 | Credit portal unchanged | **PASS** | Credit login + queue select on credit statuses OK; credit package still loads shared `ApplicationDetailPage` with credit-only activate gate |
| A1 | Admin mark-paid / activate / credits | **PASS** | `admin@blox.test` `is_admin=true`; schedules readable; credit RPCs remain admin-capable (finance already proven on F8) |

---

## Phase 3 — Negative / security

| Check | Result | Notes |
|-------|--------|-------|
| Finance illegal `active → under_review` | **PASS** | DB: `Illegal status transition for finance_officer: active -> under_review` |
| Credit denied credit RPCs | **PASS** | `not authorized: admin_add_user_credits requires admin or finance_officer` |
| Credit mark-paid / settlement client gates | **PASS** | API service role checks; credit schedule mutate gated / ineffective in smoke |
| Assigned-scope finance | **SKIPPED** | No assigned-only finance test user in environment |

---

## Gates (before calling full SHIP)

1. **Manual UI walkthrough** (5–10 min): finance login → Review tab buttons (Approve for Finance / Reject / Resubmit) → Activation → Activate Financing → mark-paid icon → Settlements Approve → Credits Adjust. Credit login → confirm **no** Activate / mark-paid.
2. **Optional:** Observe customer notification/email on Approve for Finance (`templateId` path already wired in detail page).
3. **Optional:** Add an assigned-scope finance user and re-run N3.
4. **Unrelated:** Fix pre-existing admin `PartnerDetailPage` typecheck when convenient (blocks clean `tsc -p packages/finance` via shared admin import).

---

## Out of scope (per plan)

Flutter app, credit portal redesign, role merge, settlement discount settings, SkipCash math.

---

## Verdict summary

| Area | Outcome |
|------|---------|
| DB migration + trigger + RLS + credit RPCs | PASS |
| Client matrix + UI gates | PASS |
| Finance decide / activate / mark-paid / settlements / credits | PASS (API smoke) |
| Credit cannot activate; credit portal queue | PASS |
| Negatives | PASS (assigned-scope SKIPPED) |
| **Recommendation** | **SHIP WITH GATES** |
