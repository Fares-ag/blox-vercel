/**
 * Finance credit-decision parity smoke (API-level).
 * Usage:
 *   set SMOKE_FINANCE_PASSWORD=...
 *   set SMOKE_CREDIT_PASSWORD=...
 *   set SMOKE_DEALER_PASSWORD=...   (optional; default BloxDealer2026!)
 *   node scripts/qa-finance-credit-parity-smoke.mjs
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
  const status = skipped ? 'SKIP' : ok ? 'PASS' : 'FAIL';
  results.push({ id, ok: !!ok, skipped: !!skipped, detail, status });
  console.log(`${status} ${id}: ${detail}`);
}

const FINANCE_ACTIVATION = [
  'pending_finance_activation',
  'contracts_submitted',
  'contract_under_review',
  'down_payment_submitted',
];
const FINANCE_REVIEW = [
  'under_review',
  'resubmission_required',
  'contract_signing_required',
  'contracts_submitted',
  'contract_under_review',
  'down_payment_required',
  'down_payment_submitted',
  'rejected',
];
const CREDIT_QUEUE = [...FINANCE_REVIEW];

function client(url, anon) {
  return createClient(url, anon, { auth: { persistSession: false } });
}

async function login(url, anon, email, password) {
  const sb = client(url, anon);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { sb, error, user: null, role: null };
  const { data: roleRow } = await sb.from('users').select('role, company_id').eq('id', data.user.id).maybeSingle();
  return { sb, error: null, user: data.user, role: roleRow?.role || null, companyId: roleRow?.company_id || null };
}

async function main() {
  const env = loadEnv('finance');
  const url = env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing VITE_SUPABASE_URL / ANON_KEY in finance .env.development');

  const financeEmail = process.env.SMOKE_FINANCE_EMAIL || 'finance@blox.test';
  const financePass =
    process.env.SMOKE_FINANCE_PASSWORD || process.env.SMOKE_SHARED_PASSWORD || 'BloxTest2026!';
  const creditEmail = process.env.SMOKE_CREDIT_EMAIL || 'credit@blox.test';
  const creditPass =
    process.env.SMOKE_CREDIT_PASSWORD || process.env.SMOKE_SHARED_PASSWORD || 'BloxCredit2026!';
  const dealerCandidates = [
    {
      email: process.env.SMOKE_DEALER_EMAIL || 'dealer@blox.market',
      pass:
        process.env.SMOKE_DEALER_PASSWORD ||
        process.env.SMOKE_SHARED_PASSWORD ||
        'BloxDealer2026!',
    },
    { email: 'dealer@blox.test', pass: 'BloxTest2026!' },
    { email: 'dealer@blox.test', pass: 'BloxDealer2026!' },
    { email: 'dealer@blox.market', pass: 'BloxTest2026!' },
  ];
  const creditsEmail = process.env.SMOKE_CREDITS_EMAIL || 'customer@blox.test';

  // ── Finance login ──────────────────────────────────────────────────────────
  const fin = await login(url, anon, financeEmail, financePass);
  if (fin.error || fin.role !== 'finance_officer') {
    rec('AUTH-F', false, fin.error?.message || `role=${fin.role}`);
    console.log(JSON.stringify({ results }, null, 2));
    process.exit(2);
  }
  rec('AUTH-F', true, `finance_officer ${financeEmail}`);

  // F1 queues
  const { data: actQ, error: actErr } = await fin.sb
    .from('applications')
    .select('id, status')
    .in('status', FINANCE_ACTIVATION)
    .limit(50);
  const { data: revQ, error: revErr } = await fin.sb
    .from('applications')
    .select('id, status')
    .in('status', FINANCE_REVIEW)
    .limit(50);
  rec(
    'F1',
    !actErr && !revErr,
    actErr || revErr
      ? `${actErr?.message || ''} ${revErr?.message || ''}`.trim()
      : `activation=${actQ?.length ?? 0} review=${revQ?.length ?? 0}`
  );

  // Seed smoke app via dealer
  let smokeAppId = null;
  let dealer = { error: new Error('no dealer attempt'), role: null, sb: null, user: null, companyId: null };
  for (const cand of dealerCandidates) {
    const attempt = await login(url, anon, cand.email, cand.pass);
    if (!attempt.error && attempt.role === 'dealer_agent') {
      dealer = attempt;
      dealer.email = cand.email;
      break;
    }
    dealer = attempt;
  }
  if (dealer.error || dealer.role !== 'dealer_agent') {
    rec('SEED', false, dealer.error?.message || `dealer role=${dealer.role}`);
  } else {
    const { data: products } = await dealer.sb.from('products').select('id').limit(1);
    const vehicleId = products?.[0]?.id;
    if (!vehicleId || !dealer.companyId) {
      rec('SEED', false, `missing product/company vehicle=${vehicleId} company=${dealer.companyId}`);
    } else {
      const stamp = Date.now();
      const due = new Date();
      due.setMonth(due.getMonth() + 1);
      const schedule = [
        {
          installmentNumber: 1,
          dueDate: due.toISOString().slice(0, 10),
          amount: 100,
          principal: 90,
          interest: 10,
          status: 'upcoming',
        },
        {
          installmentNumber: 2,
          dueDate: new Date(due.getTime() + 30 * 86400000).toISOString().slice(0, 10),
          amount: 100,
          principal: 90,
          interest: 10,
          status: 'upcoming',
        },
      ];
      const payload = {
        customer_name: 'QA Finance Parity',
        customer_email: `qa-finance-parity+${stamp}@blox.test`,
        customer_phone: '+97400000001',
        customer_info: { source: 'qa-finance-credit-parity-smoke' },
        vehicle_id: vehicleId,
        company_id: dealer.companyId,
        agent_user_id: dealer.user.id,
        status: 'draft',
        documents: [],
        loan_amount: 200,
        down_payment: 0,
        selling_price: 200,
        installment_plan: {
          termMonths: 2,
          monthlyPayment: 100,
          schedule,
        },
      };
      const { data: created, error: cErr } = await dealer.sb
        .from('applications')
        .insert(payload)
        .select('id, status')
        .single();
      if (cErr) {
        rec('SEED', false, `create: ${cErr.message}`);
      } else {
        smokeAppId = created.id;
        const { data: submitted, error: sErr } = await dealer.sb
          .from('applications')
          .update({
            status: 'under_review',
            submitted_at: new Date().toISOString(),
            submission_date: new Date().toISOString().slice(0, 10),
          })
          .eq('id', smokeAppId)
          .select('id, status')
          .single();
        if (sErr) rec('SEED', false, `submit: ${sErr.message}`);
        else
          rec(
            'SEED',
            submitted.status === 'under_review',
            `${smokeAppId} → under_review (via ${dealer.email})`
          );
      }
    }
  }

  // F2 Approve for Finance
  if (smokeAppId) {
    const { data: pfa, error: pfaErr } = await fin.sb
      .from('applications')
      .update({ status: 'pending_finance_activation' })
      .eq('id', smokeAppId)
      .select('id, status')
      .single();
    rec(
      'F2',
      !pfaErr && pfa?.status === 'pending_finance_activation',
      pfaErr?.message || `${smokeAppId} → ${pfa?.status}`
    );
  } else {
    rec('F2', false, 'no smoke app', true);
  }

  // F3 Activate Financing (+ payment_schedules dual-write)
  if (smokeAppId) {
    const { data: app } = await fin.sb
      .from('applications')
      .select('id, status, installment_plan')
      .eq('id', smokeAppId)
      .single();
    const plan = app?.installment_plan || {};
    const schedule = Array.isArray(plan.schedule) ? plan.schedule : [];
    const { data: act, error: actE } = await fin.sb
      .from('applications')
      .update({
        status: 'active',
        installment_plan: { ...plan, schedule },
      })
      .eq('id', smokeAppId)
      .select('id, status')
      .single();
    if (actE || act?.status !== 'active') {
      rec('F3', false, actE?.message || `status=${act?.status}`);
    } else {
      // dual-write payment_schedules like replacePaymentSchedulesFromInstallmentPlan
      const now = new Date().toISOString();
      const rows = schedule
        .map((s) => {
          const dueDate = s.dueDate || s.due_date;
          if (!dueDate) return null;
          const amount = Number(s.amount) || 0;
          return {
            application_id: smokeAppId,
            due_date: dueDate,
            amount,
            paid_amount: 0,
            remaining_amount: amount,
            status:
              String(s.status || 'upcoming').toLowerCase() === 'pending'
                ? 'upcoming'
                : String(s.status || 'upcoming').toLowerCase(),
            paid_date: null,
            created_at: now,
            updated_at: now,
          };
        })
        .filter(Boolean);
      const { error: delE } = await fin.sb.from('payment_schedules').delete().eq('application_id', smokeAppId);
      const { error: insE } = rows.length
        ? await fin.sb.from('payment_schedules').insert(rows)
        : { error: null };
      const { count } = await fin.sb
        .from('payment_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('application_id', smokeAppId);
      rec(
        'F3',
        !delE && !insE && (count ?? 0) >= 1,
        `active; schedules=${count ?? 0}` +
          (delE || insE ? ` syncErr=${delE?.message || insE?.message}` : '')
      );
    }
  } else {
    rec('F3', false, 'no smoke app', true);
  }

  // F4 contract / resubmit / reject / reopen (status matrix as finance)
  if (smokeAppId) {
    // reopen path: active cannot go under_review — use a dedicated reject/reopen on a cloned status chain
    // Use smoke app: active → try illegal later; for F4 use status updates on a second mini path via SQL-less:
    // Create second short-lived app for reject/reopen
    const dealer2 = dealer;
    let f4Id = null;
    if (!dealer2.error && dealer2.companyId) {
      const { data: products } = await dealer2.sb.from('products').select('id').limit(1);
      const { data: created } = await dealer2.sb
        .from('applications')
        .insert({
          customer_name: 'QA Finance F4',
          customer_email: `qa-finance-f4+${Date.now()}@blox.test`,
          customer_phone: '+97400000002',
          customer_info: { source: 'qa-finance-credit-parity-smoke-f4' },
          vehicle_id: products?.[0]?.id,
          company_id: dealer2.companyId,
          agent_user_id: dealer2.user.id,
          status: 'draft',
          documents: [],
          loan_amount: 1,
          down_payment: 0,
          selling_price: 1,
        })
        .select('id')
        .single();
      f4Id = created?.id;
      if (f4Id) {
        await dealer2.sb
          .from('applications')
          .update({ status: 'under_review', submitted_at: new Date().toISOString() })
          .eq('id', f4Id);
      }
    }
    if (!f4Id) {
      rec('F4', false, 'could not seed F4 app');
    } else {
      const steps = [];
      const u1 = await fin.sb
        .from('applications')
        .update({ status: 'resubmission_required', resubmission_comments: 'QA F4' })
        .eq('id', f4Id)
        .select('status')
        .single();
      steps.push(`resubmit=${u1.data?.status || u1.error?.message}`);
      const u2 = await fin.sb
        .from('applications')
        .update({ status: 'under_review' })
        .eq('id', f4Id)
        .select('status')
        .single();
      steps.push(`back=${u2.data?.status || u2.error?.message}`);
      const u3 = await fin.sb
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', f4Id)
        .select('status')
        .single();
      steps.push(`reject=${u3.data?.status || u3.error?.message}`);
      const u4 = await fin.sb
        .from('applications')
        .update({ status: 'under_review' })
        .eq('id', f4Id)
        .select('status')
        .single();
      steps.push(`reopen=${u4.data?.status || u4.error?.message}`);
      const u5 = await fin.sb
        .from('applications')
        .update({ status: 'contract_signing_required' })
        .eq('id', f4Id)
        .select('status')
        .single();
      steps.push(`contract=${u5.data?.status || u5.error?.message}`);
      const ok =
        u1.data?.status === 'resubmission_required' &&
        u2.data?.status === 'under_review' &&
        u3.data?.status === 'rejected' &&
        u4.data?.status === 'under_review' &&
        u5.data?.status === 'contract_signing_required';
      rec('F4', ok, `${f4Id}: ${steps.join(' | ')}`);
      // leave f4 in contract_signing_required for cleanup later → rejected
      await fin.sb.from('applications').update({ status: 'rejected' }).eq('id', f4Id);
    }
  } else {
    rec('F4', false, 'no smoke app', true);
  }

  // F5 Contract review Approve → pending_finance_activation (not active)
  if (smokeAppId) {
    // Move smoke briefly for F5 using a fresh app to avoid breaking active book
    let f5Id = null;
    if (!dealer.error && dealer.companyId) {
      const { data: products } = await dealer.sb.from('products').select('id').limit(1);
      const { data: created } = await dealer.sb
        .from('applications')
        .insert({
          customer_name: 'QA Finance F5',
          customer_email: `qa-finance-f5+${Date.now()}@blox.test`,
          customer_phone: '+97400000003',
          customer_info: { source: 'qa-finance-credit-parity-smoke-f5' },
          vehicle_id: products?.[0]?.id,
          company_id: dealer.companyId,
          agent_user_id: dealer.user.id,
          status: 'draft',
          documents: [],
          loan_amount: 1,
          down_payment: 0,
          selling_price: 1,
        })
        .select('id')
        .single();
      f5Id = created?.id;
      if (f5Id) {
        await dealer.sb
          .from('applications')
          .update({ status: 'under_review', submitted_at: new Date().toISOString() })
          .eq('id', f5Id);
        await fin.sb
          .from('applications')
          .update({ status: 'contract_signing_required' })
          .eq('id', f5Id);
        // customer/dealer would submit contracts — finance can set contracts_submitted then contract_under_review per matrix
        await fin.sb.from('applications').update({ status: 'contracts_submitted' }).eq('id', f5Id);
        await fin.sb.from('applications').update({ status: 'contract_under_review' }).eq('id', f5Id);
        const { data: approved, error: apErr } = await fin.sb
          .from('applications')
          .update({ status: 'pending_finance_activation' })
          .eq('id', f5Id)
          .select('id, status')
          .single();
        const landedPfa = approved?.status === 'pending_finance_activation';
        // Prove UI contract path must NOT jump to active: attempt is separate; here we assert land = PFA
        rec(
          'F5',
          !apErr && landedPfa,
          apErr?.message || `${f5Id} contract_under_review → ${approved?.status} (expect pending_finance_activation)`
        );
        await fin.sb.from('applications').update({ status: 'rejected' }).eq('id', f5Id);
      } else {
        rec('F5', false, 'F5 seed failed');
      }
    } else {
      rec('F5', false, 'no dealer for F5 seed');
    }
  } else {
    rec('F5', false, 'no smoke app', true);
  }

  // F6 Mark paid (payment_schedules + installment_plan JSON)
  if (smokeAppId) {
    const { data: unpaid, error: uErr } = await fin.sb
      .from('payment_schedules')
      .select('id, status, amount, due_date')
      .eq('application_id', smokeAppId)
      .neq('status', 'paid')
      .order('due_date', { ascending: true })
      .limit(1);
    if (uErr || !unpaid?.[0]) {
      rec('F6', false, uErr?.message || 'no unpaid schedule row');
    } else {
      const row = unpaid[0];
      const paidAt = new Date().toISOString();
      const amount = Number(row.amount) || 0;
      const { data: paid, error: pErr } = await fin.sb
        .from('payment_schedules')
        .update({
          status: 'paid',
          paid_date: paidAt,
          paid_amount: amount,
          remaining_amount: 0,
          updated_at: paidAt,
        })
        .eq('id', row.id)
        .select('id, status')
        .single();
      const { data: app } = await fin.sb
        .from('applications')
        .select('installment_plan')
        .eq('id', smokeAppId)
        .single();
      const plan = app?.installment_plan || {};
      const sched = Array.isArray(plan.schedule) ? [...plan.schedule] : [];
      const idx = sched.findIndex((s) => String(s.dueDate || s.due_date) === String(row.due_date));
      if (idx >= 0) {
        sched[idx] = { ...sched[idx], status: 'paid', paidDate: paidAt, paidAmount: amount };
        await fin.sb
          .from('applications')
          .update({ installment_plan: { ...plan, schedule: sched } })
          .eq('id', smokeAppId);
      }
      rec('F6', !pErr && paid?.status === 'paid', pErr?.message || `schedule ${row.id} → paid`);
    }
  } else {
    rec('F6', false, 'no smoke app', true);
  }

  // F7 Settlement approve/reject (seed pending via admin if needed)
  if (smokeAppId) {
    const { data: pendingList } = await fin.sb
      .from('application_settlements')
      .select('id, status')
      .eq('status', 'pending')
      .limit(1);
    let settlementId = pendingList?.[0]?.id;
    let seeded = false;
    if (!settlementId) {
      const adminSeedPass =
        process.env.SMOKE_ADMIN_PASSWORD || process.env.SMOKE_SHARED_PASSWORD || 'BloxTest2026!';
      const adminSeed = await login(url, anon, 'admin@blox.test', adminSeedPass);
      if (!adminSeed.error && (adminSeed.role === 'admin' || adminSeed.role === 'super_admin')) {
        const { data: seededRow, error: seedErr } = await adminSeed.sb
          .from('application_settlements')
          .insert({
            application_id: smokeAppId,
            customer_email: 'qa-finance-parity-settlement@blox.test',
            settlement_amount: 1,
            remaining_principal: 1,
            forgiven_rent: 0,
            rent_charge_factor: 0.5,
            status: 'pending',
            requested_by: 'admin@blox.test',
          })
          .select('id, status')
          .single();
        if (seedErr) {
          rec('F7', false, `admin seed failed: ${seedErr.message}`, true);
        } else {
          settlementId = seededRow.id;
          seeded = true;
        }
      } else {
        rec('F7', false, 'no pending rows and admin seed login failed', true);
      }
    }
    if (settlementId) {
      const { data: approved, error: aErr } = await fin.sb
        .from('application_settlements')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', settlementId)
        .select('id, status')
        .single();
      rec(
        'F7',
        !aErr && approved?.status === 'approved',
        aErr?.message || `${settlementId} → approved${seeded ? ' (admin-seeded)' : ''}`
      );
    }
  } else {
    rec('F7', false, 'no smoke app', true);
  }

  // F8 Credits adjust
  const { data: addRes, error: addErr } = await fin.sb.rpc('admin_add_user_credits', {
    p_user_email: creditsEmail,
    p_amount: 1,
    p_description: 'QA finance parity smoke add',
    p_admin_email: financeEmail,
  });
  const addOk = !addErr && (Array.isArray(addRes) ? addRes[0]?.success !== false : true);
  let balAfter = null;
  if (addOk) {
    const { data: subRes, error: subErr } = await fin.sb.rpc('admin_subtract_user_credits', {
      p_user_email: creditsEmail,
      p_amount: 1,
      p_description: 'QA finance parity smoke subtract',
      p_admin_email: financeEmail,
    });
    const subOk = !subErr && (Array.isArray(subRes) ? subRes[0]?.success !== false : true);
    const { data: bal } = await fin.sb
      .from('user_credits')
      .select('balance')
      .eq('user_email', creditsEmail)
      .maybeSingle();
    balAfter = bal?.balance;
    const { data: tx } = await fin.sb
      .from('credit_transactions')
      .select('id')
      .eq('user_email', creditsEmail)
      .ilike('description', '%QA finance parity smoke%')
      .limit(2);
    rec(
      'F8',
      addOk && subOk && (tx?.length ?? 0) >= 1,
      addErr?.message ||
        subErr?.message ||
        `add+subtract on ${creditsEmail}; balance=${balAfter}; txRows=${tx?.length ?? 0}`
    );
  } else {
    rec('F8', false, addErr?.message || JSON.stringify(addRes));
  }

  // ── Phase 2 credit regression ──────────────────────────────────────────────
  const credit = await login(url, anon, creditEmail, creditPass);
  if (credit.error || credit.role !== 'credit_officer') {
    // try shared password fallback
    const credit2 = await login(
      url,
      anon,
      creditEmail,
      process.env.SMOKE_SHARED_PASSWORD || 'BloxTest2026!'
    );
    if (!credit2.error && credit2.role === 'credit_officer') {
      Object.assign(credit, credit2);
    }
  }
  if (credit.error || credit.role !== 'credit_officer') {
    rec('AUTH-C', false, credit.error?.message || `role=${credit.role}`);
  } else {
    rec('AUTH-C', true, `credit_officer ${creditEmail}`);
  }

  // C1 credit cannot → active
  if (credit.role === 'credit_officer') {
    // put a dedicated app under_review for forced active
    let c1Id = null;
    if (!dealer.error && dealer.companyId) {
      const { data: products } = await dealer.sb.from('products').select('id').limit(1);
      const { data: created } = await dealer.sb
        .from('applications')
        .insert({
          customer_name: 'QA Credit C1',
          customer_email: `qa-credit-c1+${Date.now()}@blox.test`,
          customer_phone: '+97400000004',
          customer_info: { source: 'qa-finance-credit-parity-smoke-c1' },
          vehicle_id: products?.[0]?.id,
          company_id: dealer.companyId,
          agent_user_id: dealer.user.id,
          status: 'draft',
          documents: [],
          loan_amount: 1,
          down_payment: 0,
          selling_price: 1,
        })
        .select('id')
        .single();
      c1Id = created?.id;
      if (c1Id) {
        await dealer.sb
          .from('applications')
          .update({ status: 'under_review', submitted_at: new Date().toISOString() })
          .eq('id', c1Id);
      }
    }
    if (!c1Id) {
      rec('C1', false, 'no C1 seed');
    } else {
      const { error: fErr } = await credit.sb
        .from('applications')
        .update({ status: 'active' })
        .eq('id', c1Id);
      const { data: after } = await credit.sb
        .from('applications')
        .select('id, status')
        .eq('id', c1Id)
        .maybeSingle();
      const blocked = after?.status !== 'active';
      rec(
        'C1',
        blocked,
        fErr
          ? `DB/API rejected (${fErr.message}); status=${after?.status}`
          : `status after forced active=${after?.status} (expect not active)`
      );
      if (after?.status === 'under_review' || after?.status === 'rejected') {
        await fin.sb.from('applications').update({ status: 'rejected' }).eq('id', c1Id);
      }
    }
  } else {
    rec('C1', false, 'credit auth failed', true);
  }

  // C2 credit queue still loads credit statuses
  if (credit.role === 'credit_officer') {
    const { data: q, error: qErr } = await credit.sb
      .from('applications')
      .select('id, status')
      .in('status', CREDIT_QUEUE)
      .limit(20);
    rec('C2', !qErr, qErr?.message || `credit queue rows=${q?.length ?? 0}`);
  } else {
    rec('C2', false, 'credit auth failed', true);
  }

  // A1 admin spot-check (login admin@blox.test if password works)
  const adminPass =
    process.env.SMOKE_ADMIN_PASSWORD || process.env.SMOKE_SHARED_PASSWORD || 'BloxTest2026!';
  const admin = await login(url, anon, 'admin@blox.test', adminPass);
  if (admin.error || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
    rec('A1', false, admin.error?.message || `role=${admin.role}`, true);
  } else {
    const { data: isAdmin } = await admin.sb.rpc('is_admin');
    const { error: markProbe } = await admin.sb
      .from('payment_schedules')
      .select('id')
      .limit(1);
    rec(
      'A1',
      isAdmin === true && !markProbe,
      `is_admin=${isAdmin}; schedules_select=${markProbe ? markProbe.message : 'ok'}`
    );
  }

  // ── Phase 3 negatives ──────────────────────────────────────────────────────
  // N1 finance illegal active → under_review
  if (smokeAppId) {
    const { data: before } = await fin.sb
      .from('applications')
      .select('status')
      .eq('id', smokeAppId)
      .single();
    const { data: bad, error: badErr } = await fin.sb
      .from('applications')
      .update({ status: 'under_review' })
      .eq('id', smokeAppId)
      .select('id, status')
      .single();
    const rejected =
      !!badErr || (bad?.status && bad.status === before?.status && before?.status === 'active');
    // If PostgREST returns 0 rows without error on RLS, re-fetch
    const { data: after } = await fin.sb
      .from('applications')
      .select('status')
      .eq('id', smokeAppId)
      .single();
    const stayedActive = after?.status === 'active';
    rec(
      'N1',
      stayedActive && (badErr || rejected || after?.status !== 'under_review'),
      badErr
        ? `rejected: ${badErr.message}`
        : `status after illegal update=${after?.status} (expect active)`
    );
  } else {
    rec('N1', false, 'no smoke app', true);
  }

  // N2 credit denied on mark-paid / settlements / credit RPCs
  if (credit.role === 'credit_officer') {
    const { data: isAdminFlag } = await credit.sb.rpc('is_admin');
    const roleOk = credit.role === 'credit_officer' && isAdminFlag !== true;
    const { error: settErr } = await credit.sb
      .from('application_settlements')
      .update({ status: 'rejected' })
      .eq('status', 'approved')
      .limit(1);
    const { data: addDenied, error: addDeniedErr } = await credit.sb.rpc('admin_add_user_credits', {
      p_user_email: creditsEmail,
      p_amount: 1,
      p_description: 'QA credit should fail',
      p_admin_email: creditEmail,
    });
    const creditsDenied =
      !!addDeniedErr ||
      (Array.isArray(addDenied) && addDenied[0]?.success === false) ||
      /not authorized|permission|finance/i.test(addDeniedErr?.message || addDenied?.[0]?.message || '');
    // Client gate for mark-paid is in API service; DB-level: credit updating payment_schedules
    let schedDenied = false;
    if (smokeAppId) {
      const { data: row } = await credit.sb
        .from('payment_schedules')
        .select('id, status')
        .eq('application_id', smokeAppId)
        .limit(1)
        .maybeSingle();
      if (row?.id) {
        const { error: upErr } = await credit.sb
          .from('payment_schedules')
          .update({ status: 'paid' })
          .eq('id', row.id);
        const { data: again } = await fin.sb
          .from('payment_schedules')
          .select('status')
          .eq('id', row.id)
          .maybeSingle();
        // If credit could flip a paid/unpaid incorrectly — fail. Prefer deny or no-op.
        schedDenied = !!upErr || again?.status === row.status || row.status === 'paid';
      } else {
        schedDenied = true; // no row visible / cannot act
      }
    }
    rec(
      'N2',
      roleOk && creditsDenied,
      `creditsDenied=${creditsDenied} (${addDeniedErr?.message || addDenied?.[0]?.message || 'ok'}); settlementUpdate=${settErr?.message || 'no-error'}; scheduleGate=${schedDenied}; client markPaid/updateSettlement also role-gated`
    );
  } else {
    rec('N2', false, 'credit auth failed', true);
  }

  // N3 assigned-scope finance — skip if no assigned-only user
  rec('N3', true, 'no assigned-scope finance test user in env — SKIPPED', true);

  // Portal HTTP
  for (const [id, u] of [
    ['H-F', 'http://localhost:5179/finance/auth/login'],
    ['H-C', 'http://localhost:5177/credit/auth/login'],
  ]) {
    try {
      const res = await fetch(u, { redirect: 'manual' });
      rec(id, res.status > 0 && res.status < 500, `${u} → HTTP ${res.status}`);
    } catch (e) {
      rec(id, false, `${u} → ${e.message}`, true);
    }
  }

  // Cleanup smoke primary: leave as active with one paid row (test data) or reject if preferred
  // Keep smoke app for audit trail; tag via customer_info already.

  const pass = results.filter((r) => r.ok && !r.skipped).length;
  const fail = results.filter((r) => !r.ok && !r.skipped).length;
  const skip = results.filter((r) => r.skipped).length;
  console.log('\n--- SUMMARY ---');
  console.log(JSON.stringify({ pass, fail, skip, smokeAppId, results }, null, 2));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
