/**
 * Smoke: admin-create-user edge function authz + create + duplicate.
 * Usage: node scripts/qa-admin-create-user-smoke.mjs
 *
 * Env (optional): SMOKE_ADMIN_EMAIL, SMOKE_ADMIN_PASSWORD, SMOKE_SHARED_PASSWORD
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv(pkg) {
  const p = resolve(root, 'packages', pkg, '.env.development');
  if (!existsSync(p)) throw new Error(`Missing ${p}`);
  const env = {};
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const results = [];
function rec(id, ok, detail, skipped = false) {
  results.push({ id, ok: !!ok, skipped: !!skipped, detail });
  console.log(`${skipped ? 'SKIP' : ok ? 'PASS' : 'FAIL'} ${id}: ${detail}`);
}

async function login(url, anon, email, passwords) {
  let last = 'no password';
  for (const pass of passwords) {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (!error) return { sb, error: null, email, user: data.user, session: data.session };
    last = error.message;
  }
  return { sb: null, error: new Error(last), email };
}

async function invokeCreate(sb, body) {
  const { data, error } = await sb.functions.invoke('admin-create-user', { body });
  return { data, error };
}

async function main() {
  let env;
  try {
    env = loadEnv('admin');
  } catch {
    env = loadEnv('finance');
  }
  const url = env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  const adminEmail = process.env.SMOKE_ADMIN_EMAIL || 'admin@blox.test';
  const passwords = [
    process.env.SMOKE_ADMIN_PASSWORD,
    process.env.SMOKE_SHARED_PASSWORD,
    'BloxTest2026!',
    'BloxAdmin2026!',
  ].filter(Boolean);

  const admin = await login(url, anon, adminEmail, passwords);
  rec('AUTH-ADMIN', !admin.error, admin.error?.message || adminEmail);

  const dealer = await login(url, anon, 'dealer@blox.market', [
    process.env.SMOKE_DEALER_PASSWORD,
    process.env.SMOKE_SHARED_PASSWORD,
    'BloxDealer2026!',
    'BloxTest2026!',
  ].filter(Boolean));
  rec('AUTH-DEALER', !dealer.error, dealer.error?.message || 'dealer');

  // Non-admin must be forbidden
  if (!dealer.error && dealer.sb) {
    const stamp = Date.now();
    const { data, error } = await invokeCreate(dealer.sb, {
      email: `qa-forbidden-${stamp}@blox.test`,
      password: 'BloxTest2026!',
      role: 'dealer_agent',
    });
    const msg = data?.error || error?.message || '';
    const forbidden =
      String(msg).toLowerCase().includes('forbidden') ||
      String(msg).toLowerCase().includes('admin') ||
      String(error?.message || '').toLowerCase().includes('non-2xx');
    rec('AUTHZ-DEALER', forbidden || data?.error, msg || JSON.stringify(data));
  } else {
    rec('AUTHZ-DEALER', false, 'dealer login failed', true);
  }

  if (admin.error || !admin.sb) {
    console.log('\nSummary: admin login required — aborting create checks');
    process.exit(1);
  }

  const stamp = Date.now();
  const newEmail = `qa-create-${stamp}@blox.test`;
  const password = 'BloxTest2026!';

  const created = await invokeCreate(admin.sb, {
    email: newEmail,
    password,
    role: 'dealer_agent',
    firstName: 'QA',
    lastName: 'Create',
  });

  const createOk =
    !created.error && created.data?.ok && created.data?.id && created.data?.role === 'dealer_agent';
  rec(
    'CREATE-DEALER',
    createOk,
    created.error?.message || created.data?.error || `id=${created.data?.id} role=${created.data?.role}`
  );

  if (createOk) {
    const { data: row } = await admin.sb
      .from('users')
      .select('id, email, role')
      .eq('id', created.data.id)
      .maybeSingle();
    rec(
      'PROFILE-ROLE',
      row?.role === 'dealer_agent',
      row ? `role=${row.role}` : 'public.users row missing'
    );

    const dup = await invokeCreate(admin.sb, {
      email: newEmail,
      password,
      role: 'customer',
    });
    const dupMsg = String(dup.data?.error || dup.error?.message || '').toLowerCase();
    const isDup =
      dupMsg.includes('already') ||
      dupMsg.includes('exists') ||
      String(dup.error?.message || '').toLowerCase().includes('non-2xx');
    rec('DUP-EMAIL', isDup, dup.data?.error || dup.error?.message || 'expected duplicate error');

    // Cleanup smoke user (best-effort via service is not available; leave orphan QA users)
    console.log(`Note: left smoke user ${newEmail} — delete from Auth dashboard if desired`);
  }

  const failed = results.filter((r) => !r.ok && !r.skipped);
  console.log(`\n${results.filter((r) => r.ok).length} passed, ${failed.length} failed, ${results.filter((r) => r.skipped).length} skipped`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
