# Deploy Customer App to GoDaddy (Static Hosting)

This repo’s customer app is a **Vite + React Router (BrowserRouter) SPA**, so GoDaddy must be configured to **rewrite all routes to `index.html`**.

We already included both common hosting configs so they ship with the build:
- **Linux/cPanel (Apache)**: `packages/customer/public/.htaccess`
- **Windows hosting (IIS)**: `packages/customer/public/web.config`

## Build the customer app

From repo root:

```bash
npm -w packages/customer install
# Recommended for deployment (skips TypeScript typecheck)
npm -w packages/customer run build:deploy
```

Build output:
- `packages/customer/dist/`

## Environment variables (important)

Vite injects env vars **at build time**. Your GoDaddy server won’t “set VITE_* env vars” for static files after upload.

Create a local file **before building**:
- `packages/customer/.env.production` (do not commit)

Minimum required:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

(Optional) if you use Sentry:

```env
VITE_SENTRY_DSN=...
VITE_APP_VERSION=...
```

Then run the build again so the values are baked into the `dist` assets.

## Upload to GoDaddy

### If your GoDaddy hosting is Linux/cPanel
- Open **File Manager**
- Go to `public_html/` (or the folder mapped to your domain/subdomain)
- Upload the **contents** of `packages/customer/dist/` (not the folder itself)
- Ensure `.htaccess` is present in the target folder (it is included from the build)

### If your GoDaddy hosting is Windows (IIS)
- Go to your site root folder (often `wwwroot`)
- Upload the **contents** of `packages/customer/dist/`
- Ensure `web.config` is present in the target folder (it is included from the build)

## Domain and subfolder notes

- **Root domain** (recommended): build as-is and upload to the site root.
- **Subfolder** (e.g., `https://example.com/customer/`): Vite may need a non-root base path.
  - Tell me the exact subfolder and I’ll update `packages/customer/vite.config.ts` to set `base`.

## Quick checklist

- After upload, open your domain and refresh (Ctrl+F5).
- Deep link test: open a nested route directly (e.g. `/customer/my-applications`).
  - If you get a 404 from GoDaddy, your rewrite file wasn’t applied (wrong host type or file not uploaded).


