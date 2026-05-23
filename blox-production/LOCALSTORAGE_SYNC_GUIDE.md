# localStorage Sync Between Admin and Customer

## 🔍 The Problem

When running admin and customer modules on **different ports** (e.g., `localhost:5173` and `localhost:5174`), they have **separate localStorage** instances because browsers isolate storage by origin (protocol + domain + port).

This means:
- ❌ Data added in admin (port 5173) won't appear in customer (port 5174)
- ❌ Data added in customer won't appear in admin
- ❌ They are completely isolated

## ✅ Solution 1: Use Unified Entry Point (Recommended)

The root `src/App.tsx` provides a unified router that runs both admin and customer on the **same port**, so they share localStorage.

### How to Use:

1. **Run from root directory:**
   ```bash
   npm run dev
   # or
   npm run dev:unified
   ```

2. **Access both modules:**
   - Admin: `http://localhost:5173/admin/dashboard`
   - Customer: `http://localhost:5173/customer/my-applications`

3. **Both modules now share the same localStorage!** ✅

### Benefits:
- ✅ Same origin = shared localStorage
- ✅ No sync needed
- ✅ Works immediately
- ✅ Simpler setup

---

## 🔄 Solution 2: Not Available

**Storage sync across different ports is NOT possible** due to browser security restrictions:
- BroadcastChannel API is bound by same-origin policy
- Different ports = different origins
- localStorage cannot be shared across different origins

**If you need separate ports, you must use a backend API** to share data between admin and customer applications.

---

## 🎯 Recommended Approach

**For Development:**
- Use **Solution 1** (unified entry point) - simplest and most reliable

**For Production:**
- Use a **backend API** to share data between admin and customer
- localStorage is client-side only and shouldn't be relied upon for data sharing

---

## 📝 Current Status

- ✅ Unified entry point configured (`src/App.tsx`)
- ✅ Root vite config updated (`vite.config.ts`)
- ✅ Storage sync utility added (`packages/shared/src/utils/storage-sync.util.ts`)
- ✅ Both admin and customer import the sync utility

## 🚀 Quick Start

**Option A: Unified (Recommended)**
```bash
npm run dev
# Visit: http://localhost:5173/admin/dashboard
# Visit: http://localhost:5173/customer/my-applications
```

**Option B: Separate Ports (NOT RECOMMENDED)**
```bash
# Terminal 1
npm run dev:admin
# Visit: http://localhost:5173/admin/dashboard

# Terminal 2
npm run dev:customer
# Visit: http://localhost:5174/customer/my-applications
# ⚠️ NOTE: These will have separate localStorage - data will NOT be shared
# Use Option A (unified) instead, or implement a backend API for data sharing
```

