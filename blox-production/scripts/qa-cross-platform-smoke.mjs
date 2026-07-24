/**
 * Cross-platform live smoke (API-level) for dealer + credit alignment.
 * Usage: node scripts/qa-cross-platform-smoke.mjs
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
function rec(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}: ${detail}`);
}

const leanVehicle = 'id, make, model, trim, price, model_year, color, status';
const leanApps = `
  id, status, customer_name, customer_email, customer_phone, customer_info,
  created_at, updated_at, submitted_at, submission_date,
  vehicle_id, company_id, agent_user_id, offer_id,
  selling_price, hide_interest, internal_annual_rate,
  loan_amount, down_payment, blox_membership,
  vehicle:products!applications_vehicle_id_fkey(${leanVehicle}),
  company:companies(id, name)
`;

const CREDIT_QUEUE = [
  'under_review',
  'resubmission_required',
  'contract_signing_required',
  'contracts_submitted',
  'contract_under_review',
  'down_payment_required',
  'down_payment_submitted',
  'rejected',
];

async function main() {
  const env = loadEnv('dealer');
  const url = env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing VITE_SUPABASE_URL / ANON_KEY');

  const dealerEmail = process.env.SMOKE_DEALER_EMAIL || 'dealer@blox.market';
  const dealerPass = process.env.SMOKE_DEALER_PASSWORD || 'BloxDealer2026!';
  const creditEmail = process.env.SMOKE_CREDIT_EMAIL || 'mafifi@q-auto.com';
  const creditPass = process.env.SMOKE_CREDIT_PASSWORD || process.env.SMOKE_DEALER_PASSWORD;

  // S1 dealer login + role
  const dealer = createClient(url, anon, { auth: { persistSession: false } });
  const dLogin = await dealer.auth.signInWithPassword({ email: dealerEmail, password: dealerPass });
  if (dLogin.error) {
    rec('S1', false, `dealer login: ${dLogin.error.message}`);
  } else {
    const uid = dLogin.data.user.id;
    const { data: roleRow, error: roleErr } = await dealer
      .from('users')
      .select('role, company_id')
      .eq('id', uid)
      .maybeSingle();
    if (roleErr) rec('S1', false, `role fetch 500/err: ${roleErr.message}`);
    else if (roleRow?.role !== 'dealer_agent' || !roleRow.company_id)
      rec('S1', false, `role=${roleRow?.role} company=${roleRow?.company_id}`);
    else rec('S1', true, `dealer_agent company=${roleRow.company_id}`);
  }

  const companyId = (
    await dealer.from('users').select('company_id').eq('email', dealerEmail).maybeSingle()
  ).data?.company_id;

  // S2 create draft + submit under_review
  let smokeAppId = null;
  if (dLogin.data?.session) {
    const { data: products, error: pErr } = await dealer
      .from('products')
      .select('id')
      .limit(1);
    if (pErr || !products?.[0]) {
      rec('S2', false, `no product for create: ${pErr?.message || 'empty'}`);
    } else {
      const vehicleId = products[0].id;
      const stamp = Date.now();
      const payload = {
        customer_name: 'QA Smoke Dealer',
        customer_email: `qa-smoke-dealer+${stamp}@blox.market`,
        customer_phone: '+97400000000',
        customer_info: { source: 'qa-cross-platform-smoke' },
        vehicle_id: vehicleId,
        company_id: companyId,
        agent_user_id: dLogin.data.user.id,
        status: 'draft',
        documents: [],
        loan_amount: 1,
        down_payment: 0,
        selling_price: 1,
      };
      const { data: created, error: cErr } = await dealer
        .from('applications')
        .insert(payload)
        .select('id, status, company_id')
        .single();
      if (cErr) {
        rec('S2', false, `create draft: ${cErr.message}`);
      } else {
        smokeAppId = created.id;
        const { data: submitted, error: sErr } = await dealer
          .from('applications')
          .update({
            status: 'under_review',
            submitted_at: new Date().toISOString(),
            submission_date: new Date().toISOString().slice(0, 10),
          })
          .eq('id', smokeAppId)
          .select('id, status, company_id')
          .single();
        if (sErr) rec('S2', false, `submit: ${sErr.message} (created ${smokeAppId})`);
        else
          rec(
            'S2',
            submitted.status === 'under_review' && !!submitted.company_id,
            `${submitted.id} status=${submitted.status} company=${submitted.company_id}`
          );
      }
    }
  } else {
    rec('S2', false, 'skipped — no dealer session');
  }

  // S3 credit login + queue lean select
  const credit = createClient(url, anon, { auth: { persistSession: false } });
  let creditOk = false;
  if (!creditPass) {
    rec('S3', false, 'SMOKE_CREDIT_PASSWORD not set — cannot login credit');
  } else {
    const cLogin = await credit.auth.signInWithPassword({
      email: creditEmail,
      password: creditPass,
    });
    if (cLogin.error) {
      rec('S3', false, `credit login: ${cLogin.error.message}`);
    } else {
      const { data: cRole, error: cRoleErr } = await credit
        .from('users')
        .select('role')
        .eq('id', cLogin.data.user.id)
        .maybeSingle();
      if (cRoleErr) rec('S3', false, `credit role: ${cRoleErr.message}`);
      else if (cRole?.role !== 'credit_officer')
        rec('S3', false, `expected credit_officer got ${cRole?.role}`);
      else {
        const { data: queue, error: qErr } = await credit
          .from('applications')
          .select(leanApps)
          .in('status', CREDIT_QUEUE)
          .order('created_at', { ascending: false })
          .limit(20);
        if (qErr) rec('S3', false, `queue lean select: ${qErr.message}`);
        else {
          const found = smokeAppId ? queue?.some((r) => r.id === smokeAppId) : true;
          creditOk = true;
          rec(
            'S3',
            found,
            `queue rows=${queue?.length ?? 0}` +
              (smokeAppId ? ` smokeAppVisible=${found}` : '')
          );
        }
      }
    }
  }

  // S4 detail fetch
  if (creditOk && smokeAppId) {
    const { data: detail, error: dErr } = await credit
      .from('applications')
      .select(leanApps)
      .eq('id', smokeAppId)
      .maybeSingle();
    if (dErr) rec('S4', false, dErr.message);
    else if (!detail) rec('S4', false, 'detail null (RLS?)');
    else rec('S4', true, `detail ${detail.id} status=${detail.status}`);
  } else {
    rec('S4', false, 'skipped — no credit session or smoke app');
  }

  // S5 credit → resubmission_required
  if (creditOk && smokeAppId) {
    const { data: rs, error: rErr } = await credit
      .from('applications')
      .update({
        status: 'resubmission_required',
        resubmission_comments: 'QA smoke: please reupload salary certificate',
        resubmission_date: new Date().toISOString(),
      })
      .eq('id', smokeAppId)
      .select('id, status, resubmission_comments')
      .single();
    if (rErr) rec('S5', false, rErr.message);
    else
      rec(
        'S5',
        rs.status === 'resubmission_required' && !!rs.resubmission_comments,
        `${rs.id} → ${rs.status}`
      );
  } else {
    rec('S5', false, 'skipped');
  }

  // S6 dealer sees resubmission + resubmits
  if (dLogin.data?.session && smokeAppId) {
    const { data: needs, error: nErr } = await dealer
      .from('applications')
      .select('id, status')
      .eq('status', 'resubmission_required')
      .eq('id', smokeAppId)
      .maybeSingle();
    if (nErr || !needs) {
      rec('S6', false, nErr?.message || 'not visible in dealer resubmission filter');
    } else {
      const { data: back, error: bErr } = await dealer
        .from('applications')
        .update({
          status: 'under_review',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', smokeAppId)
        .select('id, status')
        .single();
      if (bErr) rec('S6', false, `resubmit: ${bErr.message}`);
      else rec('S6', back.status === 'under_review', `${back.id} → ${back.status}`);
    }
  } else {
    rec('S6', false, 'skipped');
  }

  // S7 document reupload capability probe (storage policy + UI gap)
  // Dealer path used by create wizard: application-documents/{filename} (no app id)
  if (dLogin.data?.session && smokeAppId) {
    const blob = new Blob(['qa-smoke'], { type: 'text/plain' });
    const badPath = `application-documents/${smokeAppId}/qa-smoke.txt`;
    const flatPath = `application-documents/qa-smoke-${Date.now()}.txt`;
    const up1 = await dealer.storage.from('documents').upload(badPath, blob, { upsert: true });
    const up2 = await dealer.storage.from('documents').upload(flatPath, blob, { upsert: true });
    const dealerCanAppPath = !up1.error;
    const dealerCanFlat = !up2.error;
    rec(
      'S7',
      false,
      `UI: dealer detail has no reupload. Storage: appPath=${dealerCanAppPath ? 'ok' : up1.error?.message}; flatPath=${dealerCanFlat ? 'ok' : up2.error?.message}. Customer/Flutter required for resubmit docs.`
    );
    // cleanup best-effort
    if (dealerCanAppPath) await dealer.storage.from('documents').remove([badPath]);
    if (dealerCanFlat) await dealer.storage.from('documents').remove([flatPath]);
  } else {
    rec('S7', false, 'skipped');
  }

  // S8 credit activate (direct approve) on smoke app
  if (creditOk && smokeAppId) {
    // ensure under_review
    await credit
      .from('applications')
      .update({ status: 'under_review' })
      .eq('id', smokeAppId);
    const { data: act, error: aErr } = await credit
      .from('applications')
      .update({ status: 'active' })
      .eq('id', smokeAppId)
      .select('id, status')
      .single();
    if (aErr) rec('S8', false, aErr.message);
    else rec('S8', act.status === 'active', `${act.id} → ${act.status}`);
  } else {
    rec('S8', false, 'skipped');
  }

  // Portal HTTP smoke
  for (const [id, u] of [
    ['H1', 'http://localhost:5176/dealer/auth/login'],
    ['H2', 'http://localhost:5177/credit/auth/login'],
    ['H3', 'http://localhost:5180/'],
  ]) {
    try {
      const res = await fetch(u, { redirect: 'manual' });
      rec(id, res.status > 0 && res.status < 500, `${u} → HTTP ${res.status}`);
    } catch (e) {
      rec(id, false, `${u} → ${e.message}`);
    }
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log('\n--- SUMMARY ---');
  console.log(JSON.stringify({ pass, fail, smokeAppId, results }, null, 2));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
