# BLOX — Cross-Platform Alignment QA Report

**Date:** 2026-07-23  
**Scope:** Admin · Customer web · Dealer · Credit · Flutter · Supabase  
**Method:** Static seam audit + live API smoke (`scripts/qa-cross-platform-smoke.mjs`)  
**Verdict:** **ALIGNED WITH GAPS**  
**Score:** **74 / 100**

---

## Executive summary

Status transitions, portal role gates, credit queue loading, and the dealer→credit→activate path are **aligned** between shared TypeScript, DB trigger, and live API. The platforms are **not** fully aligned on **document reupload for dealers**: credit can request resubmission and dealers can flip status back, but dealers cannot replace files (no detail UI + storage RLS denies `dealer_agent`).

Live smoke artifact: **`application-77`** (created as dealer, resubmitted by credit, resubmitted by dealer, activated by credit).

---

## Score breakdown

| Area | Points | Notes |
|------|--------|--------|
| Status matrix TS ↔ DB | 18/20 | Matrices match; credit `down_payment_*` UI incomplete |
| Auth / RBAC portals | 15/15 | Strict role gates work after RLS recursion fixes |
| API / schema lean selects | 12/15 | Fixed `model_year` / removed `tenure_months`; residual risk on other lean paths |
| Documents cross-actor | 6/20 | Customer web + Flutter OK; **dealer Fail** |
| Live smoke critical path | 18/20 | 10/11 checks; S7 dealer docs Fail |
| Ops notifications / UX parity | 5/10 | Resubmission still customer-centric |
| **Total** | **74/100** | |

---

## Phase 1 — Static seams

| Seam | Result | Evidence |
|------|--------|----------|
| Status matrix client ↔ DB | **Pass** | [`application-status-transitions.ts`](../packages/shared/src/utils/application-status-transitions.ts) matches SQL CASE in `20260723000000_showroom_dealer_credit_workflow.sql` |
| Portal auth gates | **Pass** | Admin `isFullAdminRole`; dealer `isDealerPortalRole`; credit `isCreditPortalRole`; customer exact |
| Credit decide UI (`under_review`) | **Pass** | Shared `ApplicationDetailPage`: Approve & Activate, Request Resubmission, Generate Contract |
| Credit UI (`down_payment_*`) | **Partial** | Allowed in matrix; no dedicated activate buttons on detail |
| Lean `getApplications` vs schema | **Pass** | Selects `model_year`; no `tenure_months` (column absent) |
| RLS role helpers | **Pass** | `current_user_role` / `is_*` + `current_user_company_id` with `row_security=off` |
| Dealer document reupload | **Fail** | Detail Docs view-only; create wizard only |
| Storage policies for dealer | **Fail** | Policies: customer path helper OR `is_admin()` only — no `is_dealer_agent()` |
| Customer web ↔ Flutter docs | **Partial** | Web: `resubmission_required` only; Flutter also allows `draft` |
| Resubmission notifications | **Partial** | Customer email/deep-link; dealer sees **Needs resubmission** tab |

### Flutter cancel parity

`kCancellableApplicationStatuses` in Flutter matches customer cancel edges: `draft`, `under_review`, `contract_signing_required`, `down_payment_required`.

---

## Phase 2 — Live smoke

Portals listening: dealer `:5176`, credit `:5177`, customer `:5180`.

| ID | Check | Result | Detail |
|----|-------|--------|--------|
| S1 | Dealer login + role | **Pass** | `dealer_agent`, company QAuto |
| S2 | Create + submit | **Pass** | `application-77` → `under_review` |
| S3 | Credit queue lean select | **Pass** | 8 rows; smoke app visible |
| S4 | Credit detail | **Pass** | Loaded |
| S5 | Request resubmission | **Pass** | → `resubmission_required` |
| S6 | Dealer resubmit status | **Pass** | → `under_review` |
| S7 | Dealer doc upload | **Fail** | UI gap + storage RLS deny (app path and flat path) |
| S8 | Credit activate | **Pass** | → `active` |
| H1–H3 | HTTP portals | **Pass** | 200 on login/home |

**Reproduce:**

```bash
cd blox-production
# Credit password used for smoke (reset during QA): BloxCredit2026!
set SMOKE_CREDIT_PASSWORD=BloxCredit2026!
node scripts/qa-cross-platform-smoke.mjs
```

---

## Findings (fix order)

### ALIGN-001 — Critical — Dealer cannot upload documents
**Impact:** Credit→dealer resubmission loop cannot complete for dealer-originated deals without involving the customer portal/Flutter or an admin.  
**Evidence:** Live S7 storage deny; `DocumentUploadStep` only on add; detail page read-only; storage policies lack `dealer_agent`.  
**Fix:**  
1. Dealer detail Docs tab: upload/replace when `draft` or `resubmission_required`  
2. Paths: `application-documents/{applicationId}/…`  
3. Storage RLS: allow `is_dealer_agent()` for company-scoped applications  

### ALIGN-002 — Medium — Credit `down_payment_*` UI gap
Matrix allows credit → `active` from down-payment statuses; queue lists them; detail actions do not expose activate.  
**Fix:** Wire Approve/Activate (or hide those statuses from queue until UI exists).

### ALIGN-003 — Low — Flutter vs customer web document gates
Flutter allows upload on `draft` (+ resubmit); customer web DocumentUploadPage requires `resubmission_required`.  
**Fix:** Document as intentional or align gates.

### ALIGN-004 — Medium — Dealer create wizard storage path
`DocumentUploadStep` uses `application-documents/{filename}` (no app id). Even with future dealer RLS, prefer app-scoped paths.  
**Fix:** Create app id first, then upload under `{appId}/`.

### ALIGN-005 — Low — Resubmission UX customer-centric
Comments/email/deep-link target customer; dealer only gets list tab + buried Comments.  
**Fix:** Dealer notification + overview banner with `resubmission_comments`.

---

## What is aligned (do not regress)

1. Shared transition matrix == DB trigger for all actors.  
2. Strict portal role isolation (dealer/credit cannot enter each other’s shells).  
3. Credit queue lean select after product/app column fixes.  
4. Dealer company-scoped create/submit with `company_id`.  
5. Credit can request resubmission and activate (`under_review` → `active`).  
6. Dealer can resubmit status `resubmission_required` → `under_review`.

---

## Recommendation

**Ship showroom ops with gate:** do not rely on dealer-only document correction until **ALIGN-001** is fixed. Until then, resubmission must go through **customer web / Flutter** (or admin upload).

Next implementation priority: **ALIGN-001** (dealer document upload UI + storage RLS), then **ALIGN-004**, then **ALIGN-002**.

---

## Related artifacts

- Canvas: `cross-platform-alignment-qa.canvas.tsx`  
- Smoke script: [`scripts/qa-cross-platform-smoke.mjs`](../scripts/qa-cross-platform-smoke.mjs)  
- Prior readiness report: [`QA_PRODUCTION_READINESS_REPORT.md`](./QA_PRODUCTION_READINESS_REPORT.md) (payments/SkipCash out of scope for this run)
