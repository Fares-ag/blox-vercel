# QA — Staff realtime notifications (admin / credit / finance)

**Date:** 2026-08-03  
**Scope:** Verify staff notification bells + cross-portal fan-out + Realtime plumbing (dealer out of scope).  
**Method:** Static code review + remote SQL + API smokes (`qa-staff-realtime-notifications-smoke.mjs`, `qa-staff-notifications-e2e-smoke.mjs`) + HTTP portal checks.

---

## Recommendation

**SHIP WITH GATES**

RPC fan-out, RLS, inbox read/mark-read, and portal HTTP are green. Residual gate is a short **browser** check that the bell badge updates live over the websocket (API inbox is proven; UI subscription not click-tested in this run).

---

## Phase 0 — Static / DB

| Check | Result | Evidence |
|-------|--------|----------|
| Migrations applied | **PASS** | `20260803120000`, `20260803121000` in `schema_migrations` |
| RPCs present | **PASS** | `notify_roles`, `notify_users`, `notify_users_internal`, `is_staff_notifier` |
| Realtime publication | **PASS** | `notifications` in `supabase_realtime` |
| Own-email RLS | **PASS** | `Users can read/update own notifications` (CI email policies) |
| Shared `NotificationCenter` + Realtime | **PASS** | `@shared` component with `postgres_changes`; `portalPrefix` link resolve |
| `notifyRoles` / `notifyUsers` API | **PASS** | `supabase-api.service.ts` |
| Mounted on admin/credit/finance | **PASS** | Each `MainLayout` top-right bell |
| Customer uses shared component | **PASS** | `CustomerNav` → `@shared/components` |
| Lifecycle fan-out wired | **PASS** | `ApplicationDetailPage` `notifyStaff` + customer submit/contract/docs |
| Money-ops fan-out wired | **PASS** | Mark paid (detail), settlements, finance/admin credits |
| Staff email bridge | **PASS** | Client `notifyRoles` → `staff_alert`; DB trigger backup when GUCs set (`20260803220000` + `staff-notify-email`) |
| Dealer bell absent | **PASS** | No dealer mount (by design) |

---

## Phase 1 — Core smoke (`qa-staff-realtime-notifications-smoke.mjs`)

| # | Check | Result |
|---|--------|--------|
| AUTH | credit / finance / admin / customer login | **PASS** |
| RPC-STAFF | credit `notify_roles` inserts ≥1 | **PASS** (4) |
| READ-F / READ-A | finance + admin see rows | **PASS** |
| READ-C | actor self-skip (credit rows=0 when actor=credit) | **PASS** |
| CUSTOMER-ROLES | customer may call `notify_roles` | **PASS** |
| CUSTOMER-USERS | customer denied `notify_users` | **PASS** |
| RLS-CROSS | credit cannot read finance mailbox | **PASS** |

**Summary:** 11/11 pass.

---

## Phase 2 — Lifecycle + money e2e (`qa-staff-notifications-e2e-smoke.mjs`)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| L1 | Approve-for-finance style → finance inbox | **PASS** | + mark-read works |
| L2 | Activate style → credit inbox | **PASS** | |
| M1 | Mark-paid style → admin | **PASS** | |
| M2 | Settlement + credits style → admin | **PASS** | |
| N1 | Dealer denied `notify_users`; allowed `notify_roles` | **PASS** | Handoff whitelist |
| N2 | Credit RLS vs admin mailbox | **PASS** | 0 foreign rows |
| H-A/C/F | Login pages HTTP | **PASS** | `:5173` / `:5177` / `:5179` → 200 |

**Summary:** 17/17 pass.

---

## Gates (before full SHIP)

1. **Browser realtime:** Log in as finance + credit side-by-side; credit Approve for Finance → finance bell increments without refresh.
2. **Optional:** Click notification → lands on `${portalPrefix}/applications/view/:id`.
3. **Note:** New pending settlement create path was not exercised (no customer/portal create site in scope); approve/reject path is covered via RPC/UI wiring.

---

## Reproduce

```bash
cd blox-production
npm run dev:admin    # :5173 (or package default)
npm run dev:credit   # :5177
npm run dev:finance  # :5179
node scripts/qa-staff-realtime-notifications-smoke.mjs
node scripts/qa-staff-notifications-e2e-smoke.mjs
```

---

## Verdict

| Area | Outcome |
|------|---------|
| DB + Realtime publication | PASS |
| Shared UI + staff mounts | PASS |
| Lifecycle / money fan-out wiring | PASS |
| API security (RPC + RLS) | PASS |
| Staff email parity (bell → email) | PASS (after migrate + deploy) |
| Portal HTTP | PASS |
| Browser live badge | NOT RUN (gate) |
| **Recommendation** | **SHIP WITH GATES** |
