# QA Portal Scale & Alignment — 2026-07-24

**Scope:** Dealer → Credit → Finance activation pipeline, cross-portal/Supabase alignment, scale readiness (10k–50k apps).  
**Environment:** Production project `zqwsxewuppexvjyakuqf` (**read-only** SQL / advisors / structural checks). No bulk seed on prod. Preview branch API unavailable (`list_branches` failed).  
**Portals:** `@blox/dealer` :5176 · `@blox/credit` :5177 · `@blox/finance` :5179 · shared `@blox/shared` · Flutter `blox-app`.

## Verdict: **CONDITIONAL GO**

Happy-path **status matrix and roles are live** (`is_finance_officer`, finance user `finance@blox.test`, credit/dealer users present). Credit/finance/finance portals **build**. Several P0/P1 alignment + scale hardening fixes were shipped in code. Remaining holds:

1. **Interactive UI E2E** (dealer submit → credit Approve for Finance → finance Activate) not run in this pass (no authenticated browser session).  
2. Migration [`20260724220000_scale_indexes_finance_storage.sql`](../supabase/migrations/20260724220000_scale_indexes_finance_storage.sql) **not applied** remotely (MCP apply read-only) — finance Storage read policy still missing; extra indexes pending push.  
3. **25k seed load** not executed on prod (by design); use [`scripts/qa-scale-seed-applications.sql`](../scripts/qa-scale-seed-applications.sql) on a branch/local DB.  
4. **Atomic activate RPC** still absent (client update + separate schedule sync).  
5. Finance may still skip `pending_finance_activation` on some contract/DP statuses (intentional per matrix; document for ops).

| Area | Result |
|------|--------|
| Preconditions | **PASS** |
| Static code / builds | **PASS** (finance/credit build; lint: pre-existing `set-state-in-effect` in layouts) |
| Client ↔ DB status matrix | **PASS** (happy path aligned) |
| Alignment gaps (known list) | **PARTIAL** — P0/P1 code fixes shipped; remote DDL pending |
| E2E dealer→finance UI | **BLOCKED** (structural/matrix **PASS**) |
| Scale (prod-readonly) | **PASS** at current ~57 apps; **CONDITIONAL** for 10k+ until seed + migration applied |
| Flutter parity | **PASS** (fixes shipped) |

---

## Preconditions

| Check | Result |
|-------|--------|
| Migration `20260724210000_finance_officer_activation_handoff` | **Applied** (`list_migrations`) |
| `is_finance_officer` / `finance_can_access_application` / `finance_scope` | **Present** |
| Roles | admin×2, credit_officer×3, dealer_agent×3, finance_officer×1 (`finance@blox.test`), customer×55 |
| `send-email` edge function | **ACTIVE** (v1); template `application_credit_approved` exists in `_shared/email-templates.ts` |
| Preview branch for write load | **Unavailable** |
| Prod volume | applications **57**, schedules **684**, transactions **215**, products **104** |
| Apps in `pending_finance_activation` | **0** (queue empty at QA time) |

---

## Phase 1 — Static code QA

- `npm run build:finance` / `build:credit` — **PASS** after fixes.  
- Lint finance/credit — **FAIL** on pre-existing `react-hooks/set-state-in-effect` in `MainLayout.tsx` (not introduced this pass).  
- Client matrix [`application-status-transitions.ts`](../packages/shared/src/utils/application-status-transitions.ts) vs live `enforce_application_status_transition()` — **aligned** for:
  - credit: `under_review` → `pending_finance_activation`
  - finance: `pending_finance_activation` → `active`
  - customer cancel from `pending_finance_activation`
- Shared API: `getApplications` now **defaults limit 500**; `getProducts` defaults **2000**; reserved vehicle query capped + expanded statuses.

---

## Phase 2 — Alignment audit (gaps)

### Fixed this pass (code)

| Gap | Fix |
|-----|-----|
| `withPortalBase` omitted `/finance` | Strip `finance` in [`portal-base-path.tsx`](../packages/shared/src/contexts/portal-base-path.tsx) |
| Reserve statuses omitted handoff | Web `getReservedVehicleIds` + Flutter `kReservedVehicleApplicationStatuses` add `pending_finance_activation`, `down_payment_submitted` |
| Flutter cancel omitted pending finance | `kCancellableApplicationStatuses` updated |
| Flutter dashboard metrics missed handoff | `_activeStatuses` adds `pending_finance_activation`, `contract_under_review` |
| Admin list hid finance queue | `contracts` tab includes `pending_finance_activation` |
| Queues hard-capped at 100 | Credit + Finance queues: **Load more** paging |
| Unbounded list fetches | Default limits on `getApplications` / `getProducts` |
| Scale indexes + finance Storage | Migration file written (apply pending) |

### Still open

| Sev | Gap | Notes |
|-----|-----|-------|
| **P0** | Finance Storage read policy not live | Migration pending remote apply |
| **P1** | No atomic activate RPC | Race if schedule sync fails after status=`active` |
| **P1** | Finance can skip pending (`contracts_*` / `down_payment_submitted` → `active`) | Allowed in DB + client; ops should prefer queue path |
| **P2** | UI E2E not executed | Roles ready: `dealer@blox.test` / credit / `finance@blox.test` |
| **P2** | PLATFORM / CROSS_PLATFORM docs stale | Credit-direct activate wording; link this report from FINANCE_PORTAL |
| **P2** | N+1 `current_user_can_pay_for_application` on customer dashboard/calendar | Deferred (not handoff-blocking) |
| **P3** | Notification short-id still `#applicat` in some copies | Backend/templates |
| **P3** | Advisors: unindexed FKs e.g. `application_settlements.application_id` | Included in migration intent for company/status; settlements FK still open |
| **P3** | Lint `set-state-in-effect` in credit/finance MainLayout | Pre-existing |

---

## Phase 3 — E2E (dealer → finance)

| Hop | Expected | Result |
|-----|----------|--------|
| Dealer → `under_review` | Dealer submit | **NOT RUN** (UI) |
| Credit → `pending_finance_activation` | `handleApproveForFinance` | **Code PASS**; DB allows; **UI NOT RUN** |
| Finance → `active` + schedules | `handleFinanceActivate` + `syncPaymentSchedulesFromPlan` | **Code PASS**; DB allows; **UI NOT RUN** |
| Negatives (credit cannot `active`, dealer cannot activate) | Matrix | **PASS** (DB function inspection) |

**Structural smoke (SQL):** matrix contains `pending_finance_activation` + `finance_officer`; role users present; 5× `under_review` available for a manual smoke with portal logins.

**Manual smoke recipe (ops):**

1. Dealer `dealer@blox.test` → submit app → `under_review`.  
2. Credit (`mafifi@q-auto.com` or `credit@blox.test`) → **Approve for Finance**.  
3. Finance `finance@blox.test` → Activation Queue → **Activate Financing**.  
4. Confirm `payment_schedules` rows + Active Book.

---

## Phase 4 — Scale readiness

### 4a Prod-readonly measurements

| Query | Plan summary | Time |
|-------|--------------|------|
| Credit-like status IN + LIMIT 100 | Index scan `idx_applications_status` | ~5 ms |
| Finance pending_finance queue | Index scan `idx_applications_status_submitted_at` | ~0.1 ms (0 rows) |
| Reserved vehicle_ids LIMIT 5000 | Bitmap index on status | ~6 ms |

Current volume is tiny vs 10k; plans are index-backed. **`idx_applications_company_id` already live**; pending migration still needed for finance Storage policy + `(company_id, status, updated_at)` / vehicle partial indexes.

### 4b Seed script

[`scripts/qa-scale-seed-applications.sql`](../scripts/qa-scale-seed-applications.sql) — ~25k `qa-scale-*` applications + schedules for an active subset. **Do not run on production.**

### 4c Code-level scale fixes shipped

- Default `getApplications` limit 500  
- Default `getProducts` limit 2000  
- Reserved vehicle query `limit 5000`  
- Credit/Finance queue Load more  
- Migration SQL for indexes + finance Storage (apply pending)

---

## Fixes shipped (files)

**Web (`blox-production`):**

- `packages/shared/src/contexts/portal-base-path.tsx`  
- `packages/shared/src/services/supabase-api.service.ts`  
- `packages/admin/.../ApplicationsListPage.tsx`  
- `packages/credit/.../CreditQueuePage.tsx`  
- `packages/finance/.../FinanceQueuePage.tsx`  
- `supabase/migrations/20260724220000_scale_indexes_finance_storage.sql`  
- `scripts/qa-scale-seed-applications.sql`  
- `docs/FINANCE_PORTAL.md` (link + notes)

**Flutter (`blox-app`):**

- `lib/features/applications/actions/application_action_screen_v2.dart`  
- `lib/data/vehicles_repository.dart`  
- `lib/core/dashboard_metrics.dart`

---

## Remaining for unconditional GO

1. Apply `20260724220000_scale_indexes_finance_storage.sql` on remote.  
2. Run interactive dealer→credit→finance smoke with test users; attach screenshots.  
3. Run seed on a Supabase preview/local DB; time queues/lists under ~25k.  
4. (Recommended) Atomic `activate_application` RPC wrapping status + schedule bootstrap.  
5. Batch can-pay RPC for customer dashboard at higher per-user app counts.

---

## Platform doc debt

`PLATFORM_DOCUMENTATION.md` and `QA_CROSS_PLATFORM_ALIGNMENT_REPORT.md` still describe older credit-direct activation. Prefer this report + `FINANCE_PORTAL.md` until those docs are rewritten.
