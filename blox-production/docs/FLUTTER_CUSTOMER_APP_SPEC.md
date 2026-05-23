# Blox Customer Mobile App (Flutter) — Implementation Specification

This document is the **handoff spec** for building a **Flutter** customer application that mirrors the behaviour, data contracts, and flows of the existing **Blox production web customer** app (`packages/customer`, React + Vite). Use it in a separate Cursor/Flutter project as the single source of functional and integration requirements.

It includes **backend integration**, **frontend / IA**, **brand & design system**, **data models**, **navigation**, and **parity rules** so the mobile app looks and behaves like Blox web unless mobile UX intentionally differs.

### Document map

| Section | Contents |
|---------|----------|
| §1–4 | Repo layout, stack, env, Supabase client |
| §5 | Routes → screens |
| §6–11 | Auth, models, payments, credits, storage, help/AI |
| **§12** | **Brand, design system, frontend IA, assets, data dictionary** (detailed) |
| §13–19 | Observability, security, testing, RPC index, constraints, folder structure |

**Full platform (functional + technical, customer + admin + super-admin + backend):** [`PLATFORM_DOCUMENTATION.md`](PLATFORM_DOCUMENTATION.md).

**Companion doc (journeys + UX):** `docs/CUSTOMER_USER_FLOW_AND_DESIGN.md` — step-by-step customer flows, screens, and design notes for mobile.

**Per-screen inventory (information + design):** `docs/CUSTOMER_SCREENS_CATALOG.md` — what each routed customer screen contains and how it is laid out in the web app.

---

## 1. What exists today (reference implementation)

| Layer | Location in repo | Notes |
|--------|------------------|--------|
| Customer UI & routes | `packages/customer/` | React 19, MUI, React Router, Redux Toolkit |
| Shared business logic & API | `packages/shared/` | Supabase client, services, models, formatters |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) | RLS enforces row-level security |
| Payments | SkipCash via Edge Functions | Never call SkipCash secrets from the mobile client |

**There is no Dart/Flutter code in this repository.** Flutter must re-implement screens and navigation while calling the **same** Supabase project, auth session, RPCs, and Edge Functions.

---

## 2. Non-negotiable technical stack (Flutter)

| Concern | Requirement |
|---------|-------------|
| Backend | **Supabase** — same project as web (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` equivalents in Flutter env) |
| Auth | **Supabase Auth** (email/password, magic links, password reset as configured in Supabase dashboard) |
| HTTP to Edge Functions | Use **Supabase client** `functions.invoke(name, body)` with the user’s JWT (anon key + session), not raw REST unless you replicate auth headers |
| Local session | Persist refresh token securely (e.g. `flutter_secure_storage`); align storage key strategy with web if you need shared test accounts (web uses custom key `blox-supabase-auth` — see §4) |
| Deep links | **Required** for payment return URLs and credit top-up callback (§8) |

Recommended packages: `supabase_flutter`, `flutter_secure_storage`, `go_router` or equivalent, `intl` for dates/currency (Qatar: **QAR**).

---

## 3. Environment variables (parity with web)

Web customer reads (Vite):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` — REST API base (defaults in `packages/shared/src/config/app.config.ts`; used where `api.service` / legacy HTTP is used)
- `VITE_FILE_BASE_URL` — file CDN/base for downloads where applicable

**Flutter:** define the same logical values (e.g. `--dart-define` or `.env` via `flutter_dotenv`):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- **`SUPABASE_VEHICLES_TABLE`** — must be **`products`**. The web app loads inventory from `public.products` (`supabase-api.service.ts` → `.from('products')`). There is **no** `public.vehicles` table. If the Flutter template defaults to `vehicles`, set this to `products` in `env.json` or `--dart-define=SUPABASE_VEHICLES_TABLE=products`.
- Optional: `API_BASE_URL`, `FILE_BASE_URL` if the Flutter app calls the same REST endpoints as `packages/shared/src/services/api.service.ts`.

Never ship service role keys in the client.

---

## 4. Supabase client configuration (must match behaviour)

Reference: `packages/shared/src/services/supabase.service.ts`

- **Auth storage key:** `blox-supabase-auth` (web). For Flutter, you may use the default Supabase Flutter storage **or** implement a custom `LocalStorage` that uses the same key namespace if you ever need to reason about parallel sessions across web + mobile during QA.
- **Session:** `persistSession: true`, `autoRefreshToken: true`.

Row mapping: shared code often maps DB **snake_case** to **camelCase** via `mapSupabaseRow`. Flutter models should follow the same naming as `packages/shared/src/models/` for consistency.

---

## 5. Customer app routes → Flutter screens (1:1 functional map)

Source: `packages/customer/src/modules/customer/routes/AppRoutes.tsx`

Base path prefix on web is **`/customer`** for many routes; in Flutter use **route names** without requiring the same string path, but **deep links** for payments must match configured return URLs (§8).

### 5.1 Auth (guest only — `GuestGuard` on web)

| Web path | Screen purpose |
|----------|----------------|
| `/customer/auth/login` | Login |
| `/customer/auth/signup` | Sign up |
| `/customer/auth/forgot-password` | Forgot password |
| `/customer/auth/reset-password` | Reset password (token from email) |

### 5.2 Public (no auth)

| Web path | Screen purpose |
|----------|----------------|
| `/customer/home` | Landing / home |
| `/customer/vehicles` | Browse vehicles |
| `/customer/vehicles/:id` | Vehicle detail |

### 5.3 Authenticated (`AuthGuard` — layout shell with nav)

All under parent route **`/customer`** with nested paths (no second `/customer` segment in child paths in React Router v6):

| Web path | Screen purpose |
|----------|----------------|
| `/customer` or `/customer/dashboard` | Dashboard (index = dashboard) |
| `/customer/my-applications` | Applications list |
| `/customer/my-applications/:id` | Application detail |
| `/customer/applications/new` | Create application |
| `/customer/applications/:id/payment` | Payment (installment / settlement flows) |
| `/customer/applications/:id/payment/:paymentId` | Payment with specific schedule id |
| `/customer/applications/:id/payment-callback` | **SkipCash return** — verify + navigate |
| `/customer/applications/:id/payment-confirmation` | Post-payment confirmation |
| `/customer/applications/:id/documents/upload` | Document upload |
| `/customer/applications/:id/contract/sign` | Contract signing |
| `/customer/payment-calendar` | Payment calendar |
| `/customer/payment-history` | Payment history |
| `/customer/profile` | Profile |
| `/customer/profile/change-password` | Change password |
| `/customer/credit-topup-callback` | **Blox Credits top-up return** |

### 5.4 Help (public, with nav wrapper)

| Web path | Screen purpose |
|----------|----------------|
| `/customer/help/faq` | FAQ |
| `/customer/help/contact` | Contact support |

### 5.5 Default redirects

Web sends unknown routes to `/customer/home`. Flutter can mirror with a default route to home.

---

## 6. Auth & authorization

### 6.1 Sign-in flow

- Use `supabase.auth.signInWithPassword` (or OAuth if enabled — web uses email/password primarily).
- After login, resolve **role** for routing: `packages/shared/src/services/auth.service.ts` loads role from `users` table and/or `user_metadata` (`role`, `user_role`, `userRole`). Customer app expects **`customer`** for normal users.
- **Email verification:** `packages/customer/src/modules/customer/guards/AuthGuard.tsx` calls `customerAuthService.checkEmailVerificationStatus()` — replicate: block or warn unverified users per product rules.

### 6.2 Session restoration

On app launch: restore session from secure storage; if expired, refresh; if invalid, send to login.

---

## 7. Core domain models (align with shared package)

Primary references:

- `packages/shared/src/models/application.model.ts` — `Application`, statuses, `InstallmentPlan`, `Payment`, documents, `BloxMembership`, etc.
- `packages/shared/src/models/user.model.ts` — user shape for auth
- `packages/shared/src/models/payment.model.ts` — payment / schedule fields used in UI
- `packages/shared/src/config/app.config.ts` — **status display colours**, application screen statuses, payment status labels, currency formatting (**QAR**, precision 0 in `CurrencyConfig`)

**Application statuses** (string union) include: `draft`, `active`, `completed`, `under_review`, `rejected`, `contract_signing_required`, `resubmission_required`, `contracts_submitted`, `contract_under_review`, `down_payment_required`, `down_payment_submitted`, `submission_cancelled`.

**Config lists:** `applicationScreenStatuses`, `applicationStatuses`, `paymentStatuses`, `statusConfig` — use for labels and colours in Flutter theme.

---

## 8. Payments (SkipCash) — critical integration

### 8.1 Edge Functions (invoke from client with JWT)

Implemented under `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `skipcash-payment` | Create payment; returns payment URL / id for hosted checkout |
| `skipcash-verify` | Verify payment status after redirect |
| `skipcash-webhook` | Server-side webhook (not called by mobile app directly; SkipCash calls Supabase) |

Client usage: `packages/shared/src/services/skipcash.service.ts`

- **`processPayment`** → `supabase.functions.invoke('skipcash-payment', { body: SkipCashPaymentRequest })`
- Verify flows → `skipcash-verify` with `{ paymentId, transactionId }` variants

**Request shape (abbreviated):** `SkipCashPaymentRequest` includes:

- `amount`, `firstName`, `lastName`, `phone`, `email`, `transactionId` (unique)
- `custom1` — JSON string for app-specific metadata (installment vs credit top-up)
- `returnUrl` — **must be a URL your app can open** (universal link / app link)

Flutter must:

1. Build the same payload shape the web sends (inspect `PaymentPage`, `CustomerNav` top-up).
2. Open `paymentUrl` / `payUrl` in **external browser** or **SFSafariViewController** / Chrome Custom Tabs (recommended for 3DS), not opaque WebView without careful handling.
3. Handle **return** via deep link to in-app routes equivalent to `payment-callback` and `credit-topup-callback`.

### 8.2 Return URLs (web reference)

- Installment / application payment callback: path pattern  
  `/customer/applications/:id/payment-callback` with query params as implemented in `PaymentCallbackPage`.
- Credit top-up:  
  `CustomerNav` builds:  
  `{origin}/customer/credit-topup-callback?transactionId=...&credits=...`  
  Store pending metadata in **secure storage** (web uses `localStorage` key `pending_credit_topup_${transactionId}`).

### 8.3 Payment permission RPC

Before showing company-linked pay flows, web checks:

- `supabase.rpc('current_user_can_pay_for_application', { p_application_id })` → boolean  

See `packages/shared/src/services/payment-permissions.service.ts`. **Default deny** on failure.

---

## 9. Blox Credits

### 9.1 Balance

- Table: `user_credits` (via `credits.service.getUserCredits` — `user_email` key)
- Display format: align with `CurrencyConfig` / `formatCurrency` (QAR, 0 decimals)

### 9.2 Pay installment with credits

- RPC: **`customer_pay_installment_with_credits`**  
  Params: `p_application_id`, `p_due_date`, `p_amount`  
  Reference: `packages/shared/src/services/credits.service.ts` → `payInstallmentWithCredits`

### 9.3 Top-up after SkipCash

1. Webhook creates/updates `payment_transactions`.
2. Client claims credits via RPC: **`customer_claim_payment_credits`** with `p_transaction_id`.

Reference: `CreditTopUpCallbackPage.tsx` — **`claimCreditsWithRetry`**: polls on **“Payment transaction not found”** until webhook writes the row (max attempts, delay). Flutter **must** implement the same retry semantics to avoid race conditions.

---

## 10. Storage & files

- Application documents and signed contracts: web uploads via shared services / Supabase Storage. Flutter should use Supabase Storage with the same buckets/policies (inspect `supabase` migrations and `supabaseApiService` / document upload pages for bucket names and paths).
- Do **not** guess bucket names — confirm in repo migrations or Supabase dashboard.

---

## 11. Help / AI chat (optional but in web scope)

- `ChatModal` uses **`bloxAIClient`** (WebSocket) + **`supabaseApiService`** for uploads and application submission flows.
- Files: `packages/customer/.../ChatModal/ChatModal.tsx`, `packages/shared/src/services/bloxAiClient.ts`

Flutter port is non-trivial (WebSocket protocol, file upload, voice features). For MVP you may ship **FAQ + Contact** only; add AI parity in a later phase with the same backend contracts.

---

## 12. Brand, design, frontend & data (detailed)

Primary references: `packages/shared/src/config/theme.ts` (MUI `createTheme` + `brandColors`), `packages/customer/` layouts and nav, `packages/shared/src/models/`, `packages/shared/src/config/app.config.ts`.

### 12.1 Brand guidelines (official palette)

**Role of each colour**

| Name | Hex | Usage |
|------|-----|--------|
| **Lime Yellow (Primary)** | `#DAFF01` | Hero CTAs, primary buttons, highlights, active nav, checkbox checked, focused field outline, section accent bars, payment “due/active/upcoming” chips (see `app.config` paymentStatuses) |
| **Primary Dark (Hover)** | `#B8D900` | Primary button hover, stronger lime emphasis |
| **Primary Light** | `#E8FF33` | Light lime backgrounds if needed |
| **Blox Black** | `#0E1909` | Primary text, headings, contrast text on lime buttons |
| **Dark Grey** | `#787663` | Secondary text, captions, tertiary buttons, placeholders, destructive button border |
| **Mid Grey** | `#C9C4B7` | Dividers, borders, unchecked checkbox, subtle outlines |
| **Light Grey** | `#F3F0ED` | Page/card background (web uses this as default “paper”), secondary button fill, table row hover, section title strip background (with lime left border in content areas) |

**Semantic colours in `brandColors` (theme.ts)** — map 1:1 in Flutter `ColorScheme` / custom tokens:

- **Buttons:** `primaryBtnBg` `#DAFF01`, `primaryBtnColor` `#0E1909`, `primaryBtnHover` `#B8D900`; secondary on `#F3F0ED`; destructive: white bg, `#787663` border, `#0E1909` text; tertiary text-only `#787663`.
- **Forms:** label `#0E1909`, border `#C9C4B7`, focus border `#DAFF01` (2px), placeholder `#787663`, field bg `#FFFFFF`.
- **Tables:** header text on dark contexts per theme (`tableHeader` / `tableHeaderColor` in `brandColors` — lime on black for specific admin-style tables; customer UI often uses bordered light tables — match each screen’s React component).
- **Status (brandColors.status*):** e.g. `statusDue` / `statusActive` / `statusUnderReview` → `#DAFF01`; `statusPaid` → `#2E7D32` (green success in extended palette); align with `Config.statusConfig` and `Config.paymentStatuses` in `app.config.ts` for labels.

**Rules**

- Do **not** introduce arbitrary greens for brand CTAs; lime is the hero colour.
- Text on lime surfaces must stay **Blox Black** (`#0E1909`) for WCAG-style contrast.
- Use **IBM Plex Sans** for UI copy when bundling fonts; fallback: system UI (`SF Pro` / `Roboto`).

### 12.2 Typography scale (from MUI theme)

| Role | Size | Weight | Line height | Letter-spacing |
|------|------|--------|-------------|----------------|
| h1 | 32px | 700 | 40px | -0.02em |
| h2 | 28px | 700 | 36px | -0.02em |
| h3 | 20px | 600 | 28px | -0.01em |
| h4 | 16px | 600 | 24px | -0.01em |
| h5 | 14px | 500 | 20px | — |
| body1 | 14px | 400 | 22px | — |
| body2 | 12px | 400 | 18px | — |
| caption | 11px | 400 | 16px | — |

Flutter: define `TextTheme` with these sizes; use `height` to approximate line height (e.g. `height: 40/32` for h1).

### 12.3 Shape, elevation, motion

- **Global corner radius (theme.shape):** `12` (theme unit = px in MUI) — use `12` logical px for general radius.
- **Paper / cards:** `16px` radius, light shadow: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.04)`; hover elevation on cards in web — optional on mobile (use subtle scale or shadow on press).
- **Buttons:** `10px` radius, padding ~`10px 20px`, **no all-caps** (`textTransform: none`), font 15px weight 500, letter-spacing -0.01em; transition 200ms ease.
- **Text fields:** `10px` radius; hover border `#C9C4B7`; focused border `#DAFF01` **2px**.

### 12.4 Frontend architecture (web reference → Flutter)

| Web layer | Location | Flutter equivalent |
|-----------|----------|---------------------|
| Entry | `packages/customer/src/App.tsx` | `main.dart` + `MaterialApp.router` |
| Router | `react-router-dom`, `AppRoutes.tsx` | `go_router` / `auto_route` — mirror route **names** and deep links |
| Global state | Redux (`auth`, etc.) | `Riverpod` / `Bloc` / `Provider` — at minimum: `AuthState`, `CreditsBalance`, optional `ApplicationListCache` |
| Layout (authed) | `CustomerLayout` + `CustomerNav` | `Scaffold` + bottom nav or drawer + `AppBar` with logo |
| Layout (public) | `CustomerNavWrapper` | Same nav pattern without auth sections |
| Guards | `AuthGuard`, `GuestGuard` | redirect: unauthenticated → login; authenticated → block guest-only routes |
| API | `@blox/shared` services | Thin Dart repositories calling Supabase |

**Customer shell behaviour**

- **Top nav** (`CustomerNav`): logo → `/customer/home`; links: Home, Browse Vehicles (+ icon), and if authenticated: Dashboard, My Applications, Payment Calendar, Help (→ FAQ). Profile/menu: account, Blox Credits balance, top-up, logout.
- **Layout background:** `CustomerLayout` adds a green-tinted background class when **not** on dashboard (`with-green-background`) — inspect `CustomerLayout.scss` for exact CSS variables; Flutter should use the same **Light Grey** / subtle variant for non-dashboard screens for parity.
- **Mobile:** web uses hamburger `Menu` duplicating the same links — Flutter should use **one** primary pattern (bottom navigation + More, or drawer) covering the same destinations.

### 12.5 Screen-level UI patterns (parity)

- **Lists:** applications, payments — card list with status chips coloured from `Config.statusConfig` / payment status colours.
- **Section titles:** bilingual or single-line titles with **left lime bar** (`4px solid #DAFF01`) + **light grey background** `#F3F0ED` + padding (see MOU-style blocks in docs or payment/legal sections in app).
- **Dividers:** `1px` `#C9C4B7`.
- **Currency:** prefix **`QAR `**, thousands separator `,`, **0 decimals** (`CurrencyConfig` in `app.config.ts`).
- **Dates:** `dateFormat`, `dateFormatTable`, etc. from `Config` — use `intl` with same patterns for consistency.
- **Arabic:** where the web shows Arabic (`direction: rtl`, `text-align: right`), Flutter must use `Directionality`, `TextAlign.right`, and proper font fallback (IBM Plex Sans supports Arabic when configured).

### 12.6 Assets & logos

| Asset | Web path | Use |
|-------|----------|-----|
| Nav / dark surfaces | `public/BloxLogoNav.png` | App bar, dark header |
| Light / print | `public/BloxLogo.png` | Light backgrounds |
| MOU / docs | `docs/BloxLogoNav.png` copy | Legal only |

Provide `@2x/@3x` or vector if recreated; minimum: same PNGs in `pubspec.yaml` assets.

### 12.7 Data dictionary (customer-facing entities)

All shapes are defined in TypeScript under `packages/shared/src/models/`. Postgres uses **snake_case**; clients often map to **camelCase** (`mapSupabaseRow`).

#### Application (`Application`)

Key fields: `id`, `customerName`, `customerEmail`, `customerPhone`, `vehicleId`, `offerId`, `companyId?`, `status` (`ApplicationStatus`), `loanAmount`, `downPayment`, `installmentPlan?`, `documents?`, `paymentHistory?`, `createdAt`, `updatedAt`, `submissionDate?`, contract flags (`contractGenerated`, `contractSigned`, `contractData`, signatures, file refs), `bloxMembership?`, `customerInfo?`, `origin?` (`manual` | `ai` | `api`).

#### Installment plan (`InstallmentPlan`)

`tenure`, `interval`, `monthlyAmount`, `totalAmount`, `downPayment?`, `schedule[]`, `annualRentalRate?`, `calculationMethod?` (`dynamic_rent` | `amortized_fixed` | `balloon_payment`), `annualInterestRate?`, `balloonPayment?`, `paymentStructure?`.

#### Payment schedule item (`PaymentSchedule`)

`id?`, `dueDate`, `amount`, `status` (`PaymentStatus`: `due` | `active` | `paid` | `unpaid` | `partially_paid` | `upcoming`), `paidDate?`, `transactionId?`, partials (`paidAmount`, `remainingAmount`), deferral flags, `paymentMethod?`, `proofDocument?`, `receiptUrl?`, `paymentType?`, `isBalloon?`.

#### Document (`Document`)

`id`, `name`, `type`, `category`, `url`, `uploadedAt`.

#### User / auth

See `packages/shared/src/models/user.model.ts` — align with Supabase Auth `user` + `users` table role.

#### Credits (`user_credits` / service)

`user_email`, `balance` (numeric), timestamps; transactions include `transactionType` including `topup` | `payment` | etc. (see `credits.service.ts`).

#### Config-driven display (not DB schema)

- `Config.applicationStatuses`, `applicationScreenStatuses`, `paymentStatuses`, `statusConfig` — used for chips, colours, labels.
- `Config.tenure`, `Config.Interval` — dropdowns / filters.
- `MembershipConfig`: `costPerMonth` 50 QAR, `costPerYear` 500 QAR (reference values in `app.config.ts` — confirm product).

### 12.8 SkipCash / payment payload (client contract)

`SkipCashPaymentRequest` (`skipcash.service.ts`): `amount`, `firstName`, `lastName`, `phone`, `email`, `transactionId` (unique), optional address fields for card region, `custom1` (stringified JSON), `returnUrl`, `subject`, `description`, `webhookUrl?`, `onlyDebitCard?`.

Credit top-up `custom1` must include routing metadata (e.g. `type: 'credit_topup'`, credits amount) consistent with `skipcash-payment` and `CustomerNav` top-up flow.

### 12.9 What “100% parity” means in practice

- **Visual:** Same palette, typography scale, radii, button and field treatments, status colours from `Config` + `theme`.
- **Data:** Same Supabase reads/writes/RPCs as web customer (no duplicate business rules in app code beyond validation UX).
- **Flows:** Same order of steps for apply → documents → contract → pay → history; same payment return and credit claim retry behaviour.
- **Acceptable differences:** Native navigation (tabs vs top nav), platform keyboards, biometric login (optional), push notifications (if added) — as long as backend contracts unchanged.

---

## 13. Observability & errors

- Web may use Sentry (`@sentry/react`). Flutter: `sentry_flutter` recommended with same DSN policy as org standards.
- User-facing errors from `functions.invoke` may nest JSON in `error.context` — mirror `skipcash.service.ts` `extractFunctionsInvokeErrorMessage` behaviour for readable messages.

---

## 14. Security checklist (Flutter)

- [ ] Only **anon** key in the app; never service role.
- [ ] All sensitive payment operations go through **Edge Functions** or **RPC** with RLS.
- [ ] Deep links validated (signature / app link host) to avoid open redirects.
- [ ] Store refresh tokens in **secure storage**.
- [ ] Certificate pinning: optional product decision; not required by web today.

---

## 15. Testing matrix (minimum)

| Area | Cases |
|------|--------|
| Auth | login, logout, session refresh, password reset |
| Applications | list, detail, create, status transitions visible to customer |
| Payment | card redirect, return to callback route, verify, confirmation |
| Credits | balance, pay with credits RPC failure/success, top-up + `customer_claim_payment_credits` + retry |
| Permissions | `current_user_can_pay_for_application` false → UI hides or blocks pay |
| Offline | graceful errors when Supabase unreachable |

---

## 16. RPC & function index (customer-relevant)

**Invoke (Edge Functions):**

- `skipcash-payment`
- `skipcash-verify`
- (Admin-only / not for customer app: other functions — do not expose)

**RPC (Postgres):**

- `current_user_can_pay_for_application`
- `customer_pay_installment_with_credits`
- `customer_claim_payment_credits`
- Admin credit RPCs are **not** for end users: `admin_add_user_credits`, `admin_subtract_user_credits`, `admin_set_user_credits`, `admin_get_user_credit_transactions`

Exact signatures and return shapes: **read migrations and SQL in `supabase/migrations/`** in this repo or introspect Supabase.

---

## 17. Known product/backend constraints (read before shipping)

- Company payment eligibility is enforced in DB/RPC (`current_user_can_pay_for_application`). There is migration work in repo (e.g. company payments policy) — align QA with current Supabase branch.
- SkipCash `custom1` encoding for credit top-up includes `type: 'credit_topup'` (see `supabase/functions/skipcash-payment/index.ts` and `CustomerNav`).

---

## 18. Suggested Flutter project structure

```
lib/
  main.dart
  app_router.dart
  core/
    env.dart
    supabase_client.dart
    theme/
      app_theme.dart          # ThemeData + ColorScheme from §12
      blox_colors.dart        # Hex values from brandColors / palette
      blox_text_styles.dart   # Typography scale §12.2
      blox_spacing.dart       # 4/8/12/16/24 px spacing constants
  assets/
    images/
      blox_logo_nav.png
      blox_logo.png
  fonts/                      # Optional: IBM Plex Sans TTF if licensed/bundled
  features/
    auth/
    home/
    vehicles/
    applications/
    payments/
    profile/
    credits/
    help/
```

**Design tokens in code:** mirror `theme.ts` + `brandColors` so colours are not magic numbers scattered across widgets.

---

## 19. When in doubt

1. Trace the **React screen** for the feature in `packages/customer/`.
2. Trace **services** in `packages/shared/src/services/`.
3. Confirm **RPC/Edge** names in `supabase/functions/` and `supabase/migrations/`.

This spec is **descriptive** of current production-oriented code paths; if backend changes, update contracts from the same three places.

---

*Generated from the `blox-production` monorepo for handoff to a standalone Flutter Cursor project.*
