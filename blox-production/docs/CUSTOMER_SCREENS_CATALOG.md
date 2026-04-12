# Blox Customer Web — Screen Catalog (Information & Design)

This document describes **every routed customer screen** in the React customer app (`packages/customer`): **what information it shows**, **what the user can do**, and **how it is presented** (layout, patterns, brand cues). It is intended for **parity work** (e.g. Flutter) alongside:

- `docs/CUSTOMER_USER_FLOW_AND_DESIGN.md` — journeys, nav, design system summary  
- `docs/FLUTTER_CUSTOMER_APP_SPEC.md` — integration, data, technical constraints  

**Source of truth for routes:** `packages/customer/src/modules/customer/routes/AppRoutes.tsx`.

**Design system:** IBM Plex Sans; page background `#F3F0ED`; primary text `#0E1909`; primary CTA/highlight `#DAFF01`; cards ~16px radius; currency `QAR` with thousands separators. See `CUSTOMER_USER_FLOW_AND_DESIGN.md` §1 for the full table.

---

## How to read each entry

| Field | Meaning |
|--------|---------|
| **Route** | React Router path (web) |
| **Access** | `Public` (no login), `Guest only` (logged-out users), `Protected` (login required) |
| **Purpose** | One-line intent |
| **Information** | Data, labels, and states the UI surfaces |
| **Actions** | Primary user actions |
| **Design / layout** | Structure, components, responsive notes |

---

## Public & marketing (CustomerNavWrapper — no auth required)

### Landing (home)

| | |
|--|--|
| **Route** | `/customer/home` |
| **Access** | Public |
| **Purpose** | Marketing entry: explain Blox and drive browse or signup |
| **Information** | Hero: H1 (“Your Journey to Vehicle Ownership Starts Here”), subtitle about transparent financing; stats row (e.g. clear pricing & terms, vehicles available, support). **Features:** six cards (Wide Vehicle Selection, Flexible Financing, Secure & Transparent, Easy Payments, Quick Approval, Blox Membership) with icon + short copy. **Benefits:** bullet list (no hidden fees, transparent pricing, 24/7 support, etc.). **How it works:** four numbered steps (Browse → Apply → Get Approved → Drive Away). |
| **Actions** | Primary: Browse Vehicles → `/customer/vehicles`. Secondary: Get Started → `/customer/auth/signup`. |
| **Design / layout** | `LandingPage.scss`; `Container` + `GridLegacy`; stacked hero then sections; `CustomButton` primary/secondary; responsive `Stack` for CTAs (column on xs). |

### Vehicle browse

| | |
|--|--|
| **Route** | `/customer/vehicles` |
| **Access** | Public |
| **Purpose** | Search and filter catalog; open vehicle detail |
| **Information** | **SearchBar** (text search on make/model). **VehicleFilter** (make, model, condition, price range). **VehicleCard** grid with pagination (e.g. page size 12). Products from `getProducts()`; excludes vehicles tied to another user’s active application. |
| **Actions** | Change filters/search; paginate; open vehicle → `/customer/vehicles/:id`. |
| **Design / layout** | `VehicleBrowsePage.scss`; filter + grid pattern; empty/loading states per shared components. |

### Vehicle detail

| | |
|--|--|
| **Route** | `/customer/vehicles/:id` |
| **Access** | Public |
| **Purpose** | Vehicle specs, pricing context, and path to apply |
| **Information** | Product detail loaded by id; **promotions** (date-filtered). **InstallmentCalculator** (tenure, amounts). Currency via `formatCurrency`; status/chips as needed. |
| **Actions** | Back navigation; **Apply** → `/customer/applications/new` with query params from calculator. |
| **Design / layout** | `VehicleDetailPage.scss`; alerts for important notes; calculator prominent. |

---

## Auth (GuestGuard — logged-out only)

### Login

| | |
|--|--|
| **Route** | `/customer/auth/login` |
| **Access** | Guest only |
| **Purpose** | Sign in with email or phone + password |
| **Information** | Logo/branding; optional `location.state.message` (toast). Fields: identifier (validated as email **or** phone), password, **Remember me**. |
| **Actions** | Submit login; links to signup, forgot password; **Quick login** (dev/demo credentials) if present in code. |
| **Design / layout** | `LoginPage.scss`; form-centered; validation toasts for verification/phone errors. |

### Sign up

| | |
|--|--|
| **Route** | `/customer/auth/signup` |
| **Access** | Guest only |
| **Purpose** | Register customer account |
| **Information** | Fields: first name, last name, email, phone, QID, gender, password, confirm password, **nationality** (select). QID can **auto-fill nationality** when length ≥ 11. |
| **Actions** | Submit → `customerAuthService.signup`; success toast → login. Link to login. |
| **Design / layout** | `SignUpPage.scss`; `Input`/`Select` from shared; Yup validation. |

### Forgot password

| | |
|--|--|
| **Route** | `/customer/auth/forgot-password` |
| **Access** | Guest only |
| **Purpose** | Request Supabase password reset email |
| **Information** | Logo; title “Forgot Password”; subtitle; single **email** field. |
| **Actions** | Send reset link; back to login. |
| **Design / layout** | `ForgotPasswordPage.scss`; `/BloxLogoNav.png` header. |

### Reset password

| | |
|--|--|
| **Route** | `/customer/auth/reset-password` |
| **Access** | Guest only (expects session from email link) |
| **Purpose** | Set new password after magic link |
| **Information** | Initial “Validating token…”; then if session valid: **new password** + **confirm**; shows user email when available. Invalid session: error messaging. |
| **Actions** | Submit → `resetPassword`; navigate to login on success. |
| **Design / layout** | `ResetPasswordPage.scss`; same visual family as other auth pages. |

---

## Protected (AuthGuard + `CustomerLayout`)

Default authenticated landing: **`/customer` → `DashboardPage`** (index route).

### Dashboard

| | |
|--|--|
| **Route** | `/customer`, `/customer/dashboard` |
| **Access** | Protected |
| **Purpose** | Account overview: stats, membership, quick actions, next payment, recent activity |
| **Information** | **Stats cards:** Active Applications (count chip), Upcoming Payments (overdue chip if any), Total Paid, Remaining Balance. **Blox Membership** promo (if not active): “Become a Blox Member”, deferrals copy, CTA opens purchase flow. **Quick Actions:** Browse Vehicles, My Applications, Payment Calendar, Payment History. **Next payment** block (when `nextPaymentDate` set): date, amount, link to pay when allowed. **Recent activity** list (mixed application/payment/contract events, icons/colours by type). Loads applications + `membershipService.getMembershipStatus()` + `canPay` per app via `paymentPermissionsService`. |
| **Actions** | Navigate to vehicles, applications, calendar, history; membership CTA; payment shortcuts. |
| **Design / layout** | `DashboardPage.scss`; responsive stat grid (wraps to 50% then 100%); `Paper` section cards; `LinearProgress` where used; theme CSS variables (`--primary-color`, `--primary-text`, etc.). |

### My applications (list)

| | |
|--|--|
| **Route** | `/customer/my-applications` |
| **Access** | Protected |
| **Purpose** | List all applications for logged-in email |
| **Information** | Title + subtitle. Each card: **Application #id**, vehicle line (make/model/trim), **StatusBadge**, **Vehicle price**, **Down payment**, **Loan amount**, **Created** (datetime). Empty state: message + “Browse Vehicles”. |
| **Actions** | View details → `/customer/my-applications/:id`. If `contractGenerated`, secondary **Download Contract** (outlined). |
| **Design / layout** | `ApplicationsListPage.scss`; card grid; loading via `Loading` until user email ready. |

### Application detail

| | |
|--|--|
| **Route** | `/customer/my-applications/:id` |
| **Access** | Protected |
| **Purpose** | Full application hub: status, vehicle/financial summary, contract workflow, payments, schedule, ownership, achievements |
| **Information** | Header with back; **payment disabled** warning when `canPay` is false. Alerts for **resubmission** (comments + date). **Contract signing** inline card when contract generated and status not yet past submission: download/print/upload PDF (max 10MB), submit → status `contracts_submitted`. Action row: pending contract review message; download contract when signed; **Upload documents** if `resubmission_required`; **Cancel** when allowed. **Tabs:** Overview, Transactions, Installment Schedule, Ownership Journey, Achievements (mobile: shorter labels; icons hidden on very small screens). Tab panels include tables, `ApplicationTimeline`, `OwnershipTimeline`, `BadgeDisplay`, payment schedule rows, etc. |
| **Actions** | Pay (when permitted and schedule allows); download/print contract; upload signed contract; navigate to document upload; cancel (confirm dialog). |
| **Design / layout** | `ApplicationDetailPage.scss`; `Tabs` scrollable on small screens; lime accent buttons on contract actions (`#DAFF01`); dark green `#0E1909` alternate buttons. |

### New application (create)

| | |
|--|--|
| **Route** | `/customer/applications/new` |
| **Access** | Protected (also works for guests with account creation — see schema) |
| **Purpose** | Apply for financing for a selected vehicle (query params from vehicle detail) |
| **Information** | **Personal:** first/last name, email, national ID (11 digits), phone, nationality, gender. **Guest only:** password + confirm. **Documents:** tabs per category — Qatar ID, Bank Statement, Salary Certificates, Additional (optional); file upload per tab. **Legal:** checkbox to authorize credit bureau check; accept terms. Vehicle/offer context from URL/state. |
| **Actions** | Submit application (creates user if needed + uploads); back navigation. |
| **Design / layout** | `CreateApplicationPage.scss`; `Tabs` for document categories; `Alert` for validation; multi-section vertical form. |

### Payment (checkout)

| | |
|--|--|
| **Route** | `/customer/applications/:id/payment`, `/customer/applications/:id/payment/:paymentId` |
| **Access** | Protected |
| **Purpose** | Pay installment, settlement, or daily payment via selected method |
| **Information** | Title “Make Payment”; back to application. **Warning** if payments disabled for company. **Settlement** alert: remaining count. **Daily payment** alert: date label. **Payment method** radio: Credit Card (SkipCash redirect info), Debit Card QPay redirect, Bank Transfer (bank name/account fields + reference), Blox Credit (shows **credits balance**). **Summary** column: line items, discounts, totals (lime `#DAFF01` / green `#10B981` for savings where used), amount due. SSL note on card flow. |
| **Actions** | Select method; submit (redirect or RPC as implemented); back to application. |
| **Design / layout** | `PaymentPage.scss`; two-column `payment-layout` (method + summary); `Paper` cards. |

### Payment callback

| | |
|--|--|
| **Route** | `/customer/applications/:id/payment-callback` |
| **Access** | Protected |
| **Purpose** | Return URL after gateway: verify SkipCash, poll DB for webhook, show outcome |
| **Information** | Query: `transactionId`, optional `paymentId`/`applicationId`. States: loading, success, failed, pending. Success: amount/transaction summary; **download receipt** when available. Failure: error message + retry/back. |
| **Actions** | Continue to confirmation or application; refresh/retry; download receipt. |
| **Design / layout** | `PaymentCallbackPage.scss`; centered `Paper`; status icons; `Alert` for errors. |

### Payment confirmation

| | |
|--|--|
| **Route** | `/customer/applications/:id/payment-confirmation` |
| **Access** | Protected (expects `location.state` from flow) |
| **Purpose** | Simple success receipt view |
| **Information** | Large success icon; “Payment Successful!”; **Transaction ID**, **Amount paid**, **Payment method** (mapped labels: credit/debit/bank/Blox credit/card). |
| **Actions** | Download receipt (PDF via `receiptService` when possible, else print); back to application/dashboard. |
| **Design / layout** | `PaymentConfirmationPage.scss`; confirmation card; print-friendly. |

### Payment calendar

| | |
|--|--|
| **Route** | `/customer/payment-calendar` |
| **Access** | Protected |
| **Purpose** | Month view of all payments across applications |
| **Information** | Calendar navigation (prev/next); toggle views (day/month icons). Aggregated payments with status (paid/upcoming/overdue), amounts, application labels; **deferral** state when membership allows (`DeferPaymentDialog`). Respects `canPay` for actions. |
| **Actions** | Navigate months; open payment / pay flow; defer where eligible. |
| **Design / layout** | `PaymentCalendarPage.scss`; `ToggleButtonGroup` for view mode; responsive. |

### Payment history

| | |
|--|--|
| **Route** | `/customer/payment-history` |
| **Access** | Protected |
| **Purpose** | Tabular history of **paid** transactions with filters/export |
| **Information** | Table: application, vehicle, due date, paid date, amount, status, method, transaction id. Filters: **by application**, date range (`DatePicker`). Chips/tooltips as implemented. |
| **Actions** | Filter; export/download (PDF/icons in toolbar). |
| **Design / layout** | `PaymentHistoryPage.scss`; `TableContainer`; loading state. |

### Document upload

| | |
|--|--|
| **Route** | `/customer/applications/:id/documents/upload` |
| **Access** | Protected |
| **Purpose** | Upload/replace documents by category for an application |
| **Information** | Categories: National ID (required), Passport, Driving License, Salary Certificate, Bank Statement, Other — with **required** flags. Shows existing files per category when loaded from application. |
| **Actions** | Upload per category; remove; submit completion (per business rules in page). |
| **Design / layout** | `DocumentUploadPage.scss`; grid of upload slots; alerts for errors. |

### Contract signing (dedicated flow)

| | |
|--|--|
| **Route** | `/customer/applications/:id/contract/sign` |
| **Access** | Protected |
| **Purpose** | Stepper: download → print/sign → upload signed PDF |
| **Information** | **Stepper** steps: Download Contract, Print & Sign, Upload Signed Contract. Same PDF rules as application detail (generated contract + `contractData`). |
| **Actions** | Download via `ContractPdfService`; print; upload PDF; advance steps. |
| **Design / layout** | `ContractSigningPage.scss`; MUI `Stepper` + cards; consistent lime/dark CTA styling. |

### Profile

| | |
|--|--|
| **Route** | `/customer/profile` |
| **Access** | Protected |
| **Purpose** | View/edit profile from Supabase user metadata |
| **Information** | Avatar placeholder; fields: first/last name, email (read-only), phone, date of birth, nationality, **address** (street, city, state, postal, country default Qatar). Loaded from `supabase.auth.getUser()` metadata. |
| **Actions** | Toggle edit; save → `supabase.auth.updateUser` metadata; back navigation. |
| **Design / layout** | `ProfilePage.scss`; `Paper` + `GridLegacy`; edit icon pattern. |

### Change password

| | |
|--|--|
| **Route** | `/customer/profile/change-password` |
| **Access** | Protected |
| **Purpose** | Change password (UI present; wire-up may be TODO in code) |
| **Information** | Current password, new password (8+ chars, upper/lower/digit), confirm. |
| **Actions** | Submit; success toast → `navigate(-1)`. |
| **Design / layout** | `ChangePasswordPage.scss`; lock icon header; `Alert` for requirements. |

### Credit top-up callback

| | |
|--|--|
| **Route** | `/customer/credit-topup-callback` |
| **Access** | Protected |
| **Purpose** | After Blox Credits purchase: verify transaction, **claim credits** via RPC with retry/polling |
| **Information** | Query: `transactionId`, optional `credits`. States: loading, success, failed, pending. Success/failure copy; **credits added**; “Check again” / refresh when webhook delayed. |
| **Actions** | Retry claim; navigate home/dashboard; refresh credits hook. |
| **Design / layout** | `CreditTopUpCallbackPage.scss`; similar to payment callback (icons, `Paper`, alerts). |

---

## Help (public, CustomerNavWrapper)

### FAQ

| | |
|--|--|
| **Route** | `/customer/help/faq` |
| **Access** | Public |
| **Purpose** | Self-serve answers by category |
| **Information** | Static **FAQ_DATA**: categories General, Application, Payment, Contracts — questions on Blox, documents, approval time, payment methods, due dates, early payoff, signing, downloading contracts. |
| **Actions** | Expand/collapse accordions (single expanded panel). |
| **Design / layout** | `FAQPage.scss`; header + `Accordion` list; `Help` icon. |

### Contact support

| | |
|--|--|
| **Route** | `/customer/help/contact` |
| **Access** | Public |
| **Purpose** | Send a support request stored as notifications |
| **Information** | Topic select (application, payment, technical, contract, other); subject; message; email; optional phone. **Contact** strip: email, phone, location icons (static content in layout). |
| **Actions** | Submit → `createNotification` for admin + confirmation for customer email. |
| **Design / layout** | `ContactSupportPage.scss`; `GridLegacy` form + `Paper`; validation errors inline. |

---

## Layout shells (not separate routes)

| Shell | Role |
|--------|------|
| **CustomerNavWrapper** | Top nav + public pages (home, vehicles, help) without sidebar. |
| **CustomerLayout** | Authenticated shell: sidebar/nav + outlet for protected routes. |

---

## Route index (quick reference)

| Route | Screen |
|--------|--------|
| `/customer/home` | Landing |
| `/customer/vehicles` | Vehicle browse |
| `/customer/vehicles/:id` | Vehicle detail |
| `/customer/auth/login` | Login |
| `/customer/auth/signup` | Sign up |
| `/customer/auth/forgot-password` | Forgot password |
| `/customer/auth/reset-password` | Reset password |
| `/customer`, `/customer/dashboard` | Dashboard |
| `/customer/my-applications` | Applications list |
| `/customer/my-applications/:id` | Application detail |
| `/customer/applications/new` | Create application |
| `/customer/applications/:id/payment` | Payment |
| `/customer/applications/:id/payment/:paymentId` | Payment (specific installment) |
| `/customer/applications/:id/payment-callback` | Payment callback |
| `/customer/applications/:id/payment-confirmation` | Payment confirmation |
| `/customer/applications/:id/documents/upload` | Document upload |
| `/customer/applications/:id/contract/sign` | Contract signing |
| `/customer/payment-calendar` | Payment calendar |
| `/customer/payment-history` | Payment history |
| `/customer/profile` | Profile |
| `/customer/profile/change-password` | Change password |
| `/customer/credit-topup-callback` | Credit top-up callback |
| `/customer/help/faq` | FAQ |
| `/customer/help/contact` | Contact support |

---

## Notes for mobile parity

1. **Application detail tabs** shorten labels on small breakpoints (`Trans.`, `Schedule`, etc.) — replicate short titles on narrow widths.  
2. **Payment flows** depend on **external redirects** (SkipCash, QPay); mobile should use the same return URLs and query params.  
3. **Change password** may be stubbed; confirm backend before shipping parity.  
4. **Guest vs authenticated** create-application: password fields only when logged out (see Yup schema in `CreateApplicationPage.tsx`).

---

*Generated from `AppRoutes.tsx` and feature pages under `packages/customer/src/modules/customer/features/`. Update this file when routes or UI copy change materially.*
