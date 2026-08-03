# QA — Credit activates; finance views activation

**Date:** 2026-08-03  
**Scope:** Verification of activation ownership swap (credit/admin activate → `active`; finance decides + money ops only).  
**Method:** Static review + remote SQL on Supabase `zqwsxewuppexvjyakuqf` + matrix unit checks + API smoke `scripts/qa-credit-activates-finance-views-smoke.mjs`.  
**Accounts:** credit `mafifi@q-auto.com` (`credit_scope=all`), finance `finance@blox.test`, money-ops regression on schedules/credits.  
**Primary smoke app:** `application-106`.

---

## Recommendation

**SHIP WITH GATES**

DB trigger, client matrix, schedule RLS (including credit UPDATE for mark-paid), and API smoke are green (14/14). Residual gates are stale status/toast copy and browser click-through — not P0 blockers for the ownership swap.

---

## Phase 0 — Static / DB

| Check | Result | Evidence |
|-------|--------|----------|
| Credit matrix `PFA → active` | **PASS** | `CREDIT_OFFICER_ALLOWED.pending_finance_activation` includes `active`; unit: `true` |
| Finance matrix cannot → `active` | **PASS** | `FINANCE_OFFICER_ALLOWED.pending_finance_activation` = `rejected`, `under_review` only; `contracts_*` / DP paths lack `active` |
| `CREDIT_QUEUE_STATUSES` includes PFA | **PASS** | Shared util + credit queue `statusIn` + pipeline tab filter |
| Migrations remote | **PASS** | `20260803180000`, `20260803181000`, `20260803182000` in `schema_migrations` |
| Trigger: credit activate / finance blocked | **PASS** | Smoke `F-BLOCK-ACTIVE` / `C-ACTIVATE`; trigger body includes credit PFA→active path |
| Credit schedule RLS: insert/select/delete/update | **PASS** | Policies with `credit_can_access_application`; UPDATE added in `20260803210000_credit_mark_paid_schedules` |
| UI `canActivateFinancing` | **PASS** | `isCreditOfficer \|\| isFullAdmin` (finance excluded) |
| Schedule rebuild allows credit | **PASS** | `replacePaymentSchedulesFromInstallmentPlan` role gate includes `credit_officer` |
| Activate notifies finance + admin | **PASS** | `notifyStaff(['finance_officer','admin','super_admin'], …)` on activate |
| Finance queue view-only copy | **PASS** | Activation empty state + subtitle: activate is on credit portal |
| `FINANCE_PORTAL.md` | **PASS** | Documents credit activate / finance view |
| Shared typecheck | **PASS** | `tsc -p packages/shared --noEmit` clean |

---

## Phase 1 — Happy path (API)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| C1 | Seed → under_review | **PASS** | `application-106` |
| C2 | Decide → PFA | **PASS** | Via finance actor into `pending_finance_activation` |
| C3 | Finance blocked → active | **PASS** | `Illegal status transition for finance_officer: pending_finance_activation -> active` |
| C4 | Credit activates | **PASS** | `mafifi@q-auto.com` → `active` |
| C5 | Schedules created | **PASS** | ≥1 `payment_schedules` row after activate |
| C6 | Activate staff notify fan-out | **SKIPPED** | Code path present; not asserted in smoke (no bell/websocket check this run) |

Reproduce:

```bash
cd blox-production
node scripts/qa-credit-activates-finance-views-smoke.mjs
```

---

## Phase 2 — Money-ops regression

| # | Check | Result | Notes |
|---|--------|--------|-------|
| F1 | Credit + finance mark-paid | **PASS** | Both can UPDATE schedule → `paid` |
| F2 | Finance credits add/subtract | **PASS** | `admin_*_user_credits` OK for finance |
| F3 | Credit denied credits RPC | **PASS** | `not authorized: … requires admin or finance_officer` |

---

## Phase 3 — Matrix / queue

| Check | Result | Notes |
|-------|--------|-------|
| Credit `PFA→active` / `contracts→active` | **PASS** | Client unit checks |
| Finance `PFA→active` / `contracts→active` | **PASS** | Both `false` |
| Admin `PFA→active` | **PASS** | `true` |
| Credit queue includes PFA | **PASS** | Constant + tab filter |
| Finance Activation tab still lists PFA | **PASS** | `FINANCE_ACTIVATION_QUEUE_STATUSES` unchanged (view queue) |

---

## Gaps / gates

| Gate | Severity | Notes |
|------|----------|-------|
| Stale detail copy | Low | Status label still **"Approved — awaiting finance activation"**; toast **"Approved for finance — awaiting activation."** — ownership is credit, wording lags |
| Handler comment | Low | `handleFinanceActivate` comment still says "Finance (or admin)" |
| Browser click-through | Medium | Credit Activate Financing + finance no-button not exercised in a live portal session this run |
| Assigned-scope credit activate | Low | Smoke used all-scope credit; assigned-only credit not covered |
| Status enum name `pending_finance_activation` | Info | Naming debt only; behavior is credit-owned activate |

---

## Smoke summary

```
pass: 14, fail: 0
M-CREDIT-PFA-ACTIVE, M-FINANCE-PFA-ACTIVE, M-QUEUE-PFA,
AUTH-C, AUTH-F, SEED, C-PFA, F-BLOCK-ACTIVE, C-ACTIVATE,
C-SCHEDULES, C-MARK-PAID, F-MARK-PAID, F-CREDITS, C-CREDITS-DENY
```

---

## Verdict

Activation ownership swap is enforced end-to-end (client + trigger + smoke). Finance retains decide + credits and cannot flip to `active`. Mark-paid is shared by credit, finance, and admin. **Ship with gates** above; optional follow-up: rename/refresh PFA-facing copy and a short browser pass on credit/finance portals.
