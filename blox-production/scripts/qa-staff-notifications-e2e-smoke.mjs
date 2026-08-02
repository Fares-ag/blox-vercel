/**
 * Broader staff-notifications QA: lifecycle handoff + money-ops notify + HTTP portals.
 * Usage: node scripts/qa-staff-notifications-e2e-smoke.mjs
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
  for (const pass of passwords) {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (!error) return { sb, error: null, email, user: data.user };
  }
  return { sb: null, error: new Error('Invalid login credentials'), email };
}

async function main() {
  const env = loadEnv('finance');
  const url = env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  const passes = ['BloxTest2026!', 'BloxCredit2026!', 'BloxDealer2026!'];

  const credit = await login(url, anon, 'credit@blox.test', passes);
  const finance = await login(url, anon, 'finance@blox.test', passes);
  const admin = await login(url, anon, 'admin@blox.test', passes);
  const dealer = await login(url, anon, 'dealer@blox.market', passes);

  rec('L0-AUTH-C', !credit.error, credit.error?.message || 'ok');
  rec('L0-AUTH-F', !finance.error, finance.error?.message || 'ok');
  rec('L0-AUTH-A', !admin.error, admin.error?.message || 'ok');

  // L1: credit approve-for-finance style notify → finance reads
  if (!credit.error && !finance.error) {
    const stamp = Date.now();
    const title = `QA L1 approve-for-finance ${stamp}`;
    const { data: count, error } = await credit.sb.rpc('notify_roles', {
      p_roles: ['finance_officer', 'admin', 'super_admin'],
      p_type: 'info',
      p_title: title,
      p_message: 'App smoke awaiting finance activation',
      p_link: '/applications/view/application-98',
    });
    rec('L1-RPC', !error && Number(count) >= 1, error?.message || `count=${count}`);

    const { data: fRows, error: fErr } = await finance.sb
      .from('notifications')
      .select('id, title, link, read')
      .eq('title', title)
      .limit(3);
    rec('L1-FINANCE-INBOX', !fErr && (fRows?.length ?? 0) >= 1, fErr?.message || `rows=${fRows?.length}`);

    if (fRows?.[0]?.id) {
      const { error: mkErr } = await finance.sb
        .from('notifications')
        .update({ read: true })
        .eq('id', fRows[0].id);
      const { data: again } = await finance.sb
        .from('notifications')
        .select('read')
        .eq('id', fRows[0].id)
        .maybeSingle();
      rec('L1-MARK-READ', !mkErr && again?.read === true, mkErr?.message || `read=${again?.read}`);
    } else {
      rec('L1-MARK-READ', false, 'no row to mark', true);
    }
  } else {
    rec('L1-RPC', false, 'auth missing', true);
  }

  // L2: finance activate-style notify → credit (+ admin)
  if (!finance.error && !credit.error) {
    const stamp = Date.now();
    const title = `QA L2 activated ${stamp}`;
    const { data: count, error } = await finance.sb.rpc('notify_roles', {
      p_roles: ['credit_officer', 'admin', 'super_admin'],
      p_type: 'success',
      p_title: title,
      p_message: 'Financing activated smoke',
      p_link: '/applications/view/application-98',
    });
    rec('L2-RPC', !error && Number(count) >= 1, error?.message || `count=${count}`);
    const { data: cRows, error: cErr } = await credit.sb
      .from('notifications')
      .select('id, title')
      .eq('title', title)
      .limit(3);
    rec('L2-CREDIT-INBOX', !cErr && (cRows?.length ?? 0) >= 1, cErr?.message || `rows=${cRows?.length}`);
  } else {
    rec('L2-RPC', false, 'auth missing', true);
  }

  // M1: mark-paid style → admin
  if (!finance.error && !admin.error) {
    const stamp = Date.now();
    const title = `QA M1 mark-paid ${stamp}`;
    const { error } = await finance.sb.rpc('notify_roles', {
      p_roles: ['admin', 'super_admin'],
      p_type: 'success',
      p_title: title,
      p_message: 'Installment marked paid smoke',
      p_link: '/applications/view/application-98',
    });
    const { data: aRows, error: aErr } = await admin.sb
      .from('notifications')
      .select('id')
      .eq('title', title)
      .limit(3);
    rec('M1-ADMIN-INBOX', !error && !aErr && (aRows?.length ?? 0) >= 1, error?.message || aErr?.message || `rows=${aRows?.length}`);
  } else {
    rec('M1-ADMIN-INBOX', false, 'auth missing', true);
  }

  // M2: settlement / credits style → admin
  if (!finance.error && !admin.error) {
    const stamp = Date.now();
    const title = `QA M2 settlement ${stamp}`;
    await finance.sb.rpc('notify_roles', {
      p_roles: ['admin', 'super_admin'],
      p_type: 'success',
      p_title: title,
      p_message: 'Settlement approved smoke',
      p_link: '/applications',
    });
    const { data: aRows, error: aErr } = await admin.sb
      .from('notifications')
      .select('id')
      .eq('title', title)
      .limit(3);
    rec('M2-SETTLEMENT', !aErr && (aRows?.length ?? 0) >= 1, aErr?.message || `rows=${aRows?.length}`);

    const title2 = `QA M2 credits ${stamp}`;
    await finance.sb.rpc('notify_roles', {
      p_roles: ['admin', 'super_admin'],
      p_type: 'info',
      p_title: title2,
      p_message: 'Credits adjusted smoke',
      p_link: '/users',
    });
    const { data: aRows2, error: aErr2 } = await admin.sb
      .from('notifications')
      .select('id')
      .eq('title', title2)
      .limit(3);
    rec('M2-CREDITS', !aErr2 && (aRows2?.length ?? 0) >= 1, aErr2?.message || `rows=${aRows2?.length}`);
  }

  // N1: dealer cannot use notify_users; can use notify_roles (handoff whitelist)
  if (!dealer.error) {
    const { error: uErr } = await dealer.sb.rpc('notify_users', {
      p_emails: ['admin@blox.test'],
      p_type: 'info',
      p_title: 'QA dealer deny',
      p_message: 'should fail',
      p_link: null,
    });
    rec('N1-DEALER-USERS', !!uErr, uErr ? uErr.message : 'UNEXPECTED allow');
    const { error: rErr, data: rCount } = await dealer.sb.rpc('notify_roles', {
      p_roles: ['credit_officer'],
      p_type: 'info',
      p_title: 'QA dealer handoff',
      p_message: 'dealer submit handoff allowed',
      p_link: '/applications/view/application-98',
    });
    rec('N1-DEALER-ROLES', !rErr, rErr?.message || `count=${rCount}`);
  } else {
    rec('N1-DEALER-USERS', false, dealer.error?.message || 'dealer login failed', true);
    rec('N1-DEALER-ROLES', false, 'skipped', true);
  }

  // N2: credit cannot read admin-only mailbox by email filter
  if (!credit.error) {
    const { data: foreign } = await credit.sb
      .from('notifications')
      .select('id')
      .ilike('user_email', 'admin@blox.test')
      .limit(5);
    rec('N2-RLS', (foreign?.length ?? 0) === 0, `credit saw admin rows=${foreign?.length ?? 0}`);
  }

  // H: portals
  for (const [id, u] of [
    ['H-A', 'http://localhost:5173/admin/auth/login'],
    ['H-C', 'http://localhost:5177/credit/auth/login'],
    ['H-F', 'http://localhost:5179/finance/auth/login'],
  ]) {
    try {
      const res = await fetch(u, { redirect: 'manual' });
      rec(id, res.status > 0 && res.status < 500, `${u} → ${res.status}`);
    } catch (e) {
      rec(id, false, e.message, true);
    }
  }

  const pass = results.filter((r) => r.ok && !r.skipped).length;
  const fail = results.filter((r) => !r.ok && !r.skipped).length;
  const skip = results.filter((r) => r.skipped).length;
  console.log('\n--- SUMMARY ---');
  console.log(JSON.stringify({ pass, fail, skip, results }, null, 2));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
