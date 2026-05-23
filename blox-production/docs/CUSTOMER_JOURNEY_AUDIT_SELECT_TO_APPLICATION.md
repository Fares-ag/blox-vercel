# Customer journey audit — vehicle selection → account → application

**Scope:** End-to-end path from **choosing a vehicle** through **account creation/login** to **submitting a financing application** (customer web app, `packages/customer`).

**Audit date:** 2026-04-06 (against current repo behaviour).

**Related docs:** [`PLATFORM_DOCUMENTATION.md`](PLATFORM_DOCUMENTATION.md), [`CUSTOMER_SCREENS_CATALOG.md`](CUSTOMER_SCREENS_CATALOG.md), [`CUSTOMER_USER_FLOW_AND_DESIGN.md`](CUSTOMER_USER_FLOW_AND_DESIGN.md).

---

## 1. Intended journey (product view)

1. Discover vehicles (**landing** / **browse**).
2. Open **vehicle detail**, use **installment calculator**, tap **Apply Now**.
3. If not signed in, **sign up** or **log in**.
4. Complete **application form** (identity, documents, consents) and submit.
5. Land on **My applications** with a new row in **`under_review`**.

---

## 2. Actual journey (as implemented)

| Step | What happens | Auth |
|------|----------------|------|
| **Browse** `/customer/vehicles` | Grid, filters, search; may hide vehicles reserved by others (see platform doc). | Public |
| **Detail** `/customer/vehicles/:id` | Vehicle data, calculator, promotions. | Public |
| **Apply Now** | `navigate('/customer/applications/new?' + queryParams)` built from `vehicleId` + stringified calculator fields. | Navigates to a **protected** route |
| **Auth** | If not logged in, **`AuthGuard`** redirects to **`/customer/auth/login`** with **`state: { from: location }`**, where `location` includes **pathname + search** (so the apply URL with query string is preserved in state). | — |
| **Login success** | **`useAuth.login`** navigates to **`redirectTo`** when **`AuthGuard`** provided a safe **`state.from`**; otherwise **`/customer/my-applications`**. | Authenticated |
| **Sign up** | After registration, **`navigate('/customer/auth/login', { state: location.state })`** preserves the apply intent when the user opened signup from login with that state. | Guest |
| **After login** | User lands on **Create application** with query string when they came from **Apply**; otherwise **My applications** (default). | — |
| **Create application** | **`/customer/applications/new`** requires **`vehicleId`** query param; **`CreateApplicationPage`** redirects away if missing. User must **manually** go back to the vehicle (or re-enter URL) after login. | Protected + **email verified** |

**Update:** Post-login resume is **implemented**; the table above reflects current behaviour.

---

## 3. Findings (severity)

### Critical — Guest “Apply” did not resume after login *(fixed)*

- **Was:** **`useAuth`** always navigated to **`/customer/my-applications`** after login, ignoring **`state.from`**.
- **Now:** **`login(credentials, { redirectTo })`** navigates to a **validated** in-app path from **`AuthGuard`**’s **`from`** when present; signup ↔ login preserves the same **router state**.

### High — Calculator query string may be corrupted

- **Symptom:** **Apply Now** builds query params with **`String(value)`** for every **`calculatorData`** field. Fields like **`paymentSchedule`** (array of objects) become useless strings (e.g. `"[object Object]"`), not JSON.
- **Impact:** Harmless if **CreateApplicationPage** ignores those keys; confusing URLs and potential for bugs if any code later parses them. **Risk:** unnecessary long/broken URLs.
- **Expected:** Only append **scalar** fields needed for apply, or serialize complex fields with **`encodeURIComponent(JSON.stringify(...))`** and parse safely on the create page.

### High — Email verification gate vs “happy path”

- **Symptom:** **`AuthGuard`** blocks **all** of `/customer/*` until email is verified (shows **Email Verification Required**).
- **Impact:** New users who sign up and log in **before** clicking the verification link **cannot** open **Create application** until verified — correct for security, but the UI on vehicle detail does not explain this before **Apply**.
- **Recommendation:** On **Apply** when redirecting to login/signup, show a short note: “You’ll need a verified email to complete your application.”

### Medium — Sign up return path *(mitigated)*

- **Was:** Sign-up did not pass return context to login.
- **Now:** **`state`** is preserved from login → signup and after successful registration → login, so **Apply → login → sign up → login** can still resume **`applications/new?...`** when the user returns to login with preserved state.

### Medium — “Start new application” on login page

- **Symptom:** Button goes to **`/customer/vehicles`**, not to apply flow.
- **Impact:** Naming suggests starting an application, but it only opens browse — acceptable if intentional; otherwise misleading.

### Medium — Document upload on apply (already noted in platform doc)

- **Symptom:** Upload may be **simulated**; **URLs** in stored document metadata may be **empty**.
- **Impact:** Ops/compliance may not receive real files from this path until storage is integrated.

### Low — Quick login (dev/demo)

- **Symptom:** **Quick login** with fixed credentials may appear in production builds if not stripped.
- **Recommendation:** Gate behind **`import.meta.env.DEV`** or remove for production.

### Low — Second-application blocking

- **Symptom:** Client-side only; race conditions possible.
- **Impact:** Rare duplicate submits; acceptable for many products but worth a future **RPC** if strict enforcement is required.

---

## 4. What works well

- **Public browse/detail** is clear; **active** vehicles only on detail.
- **`AuthGuard`** passes **`from`** to login so the **router state** is correct **until** login completes.
- **Create application** validates **blocking** applications and **required** calculator params before submit.
- **Email verification** is enforced consistently on protected routes.

---

## 5. Recommended fixes (priority order)

1. **Post-login redirect — implemented (2026-04-06):** **`useAuth.login`** accepts optional **`redirectTo`**. **`LoginPage`** derives a safe path from **`location.state.from`** via **`getSafePostLoginRedirect`** (`utils/authRedirect.util.ts`). **`SignUpPage`** preserves **`location.state`** when navigating to login after registration and on the “Sign In” link. Default remains **`/customer/my-applications`** when there is no safe redirect.
2. **Sign-up return path — implemented** as part of (1) by passing **`state`** through login ↔ signup.
3. **Apply URL:** Restrict query params to **known scalars** (or JSON-encode complex fields explicitly) — *still open* (see §3 High — calculator query string).
4. **UX copy** on vehicle detail before **Apply** for verification and login requirements — *optional*.

---

## 6. Test checklist (QA)

| # | Action | Expected |
|---|--------|----------|
| 1 | Guest: vehicle detail → fill calculator → **Apply Now** | Redirect to **login**; URL in browser may show login, but **state.from** should contain apply URL with params |
| 2 | Log in | **Currently:** lands **My applications** — **should** land **Create application** with same query string after fix |
| 3 | New user: **Sign up** → **Login** → return | After fix, return to apply URL if flow preserved |
| 4 | Unverified user logs in | Cannot access apply until verified; sees verification UI |
| 5 | Verified user: complete form → submit | Application **`under_review`**, redirect **My applications** |

---

*This audit is based on static code review; validate in browser after any auth/navigation changes.*
