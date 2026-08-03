/**
 * Smoke: credit activates; finance cannot → active; money-ops still finance.
 * Usage: node scripts/qa-credit-activates-finance-views-smoke.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  canTransitionApplicationStatus,
  CREDIT_QUEUE_STATUSES,
} from '../packages/shared/src/utils/application-status-transitions.ts';

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
  results.push({ id, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}: ${detail}`);
}

async function login(url, anon, email, passwords) {
  for (const pass of passwords) {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (!error) {
      const { data: roleRow } = await sb
        .from('users')
        .select('role, company_id')
        .eq('id', data.user.id)
        .maybeSingle();
      return { sb, error: null, email, user: data.user, role: roleRow?.role, companyId: roleRow?.company_id };
    }
  }
  return { sb: null, error: new Error('login failed'), email };
}

async function main() {
  // Client matrix
  rec(
    'M-CREDIT-PFA-ACTIVE',
    canTransitionApplicationStatus('pending_finance_activation', 'active', 'credit_officer'),
    'credit PFA→active'
  );
  rec(
    'M-FINANCE-PFA-ACTIVE',
    !canTransitionApplicationStatus('pending_finance_activation', 'active', 'finance_officer'),
    'finance cannot PFA→active'
  );
  rec(
    'M-QUEUE-PFA',
    CREDIT_QUEUE_STATUSES.includes('pending_finance_activation'),
    'credit queue includes PFA'
  );

  const env = loadEnv('finance');
  const url = env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  const passes = ['BloxTest2026!', 'BloxCredit2026!', 'BloxDealer2026!'];

  const creditCandidates = [
    { email: 'mafifi@q-auto.com', passwords: ['BloxCredit2026!', 'BloxTest2026!'] },
    { email: 'credit@blox.test', passwords: passes },
  ];
  let credit = { error: new Error('no credit'), email: '' };
  for (const c of creditCandidates) {
    const attempt = await login(url, anon, c.email, c.passwords);
    if (!attempt.error && attempt.role === 'credit_officer') {
      credit = attempt;
      break;
    }
    credit = attempt;
  }
  const finance = await login(url, anon, 'finance@blox.test', passes);
  const dealer = await login(url, anon, 'dealer@blox.market', passes);

  rec('AUTH-C', !credit.error && credit.role === 'credit_officer', credit.error?.message || `${credit.email} ${credit.role}`);
  rec('AUTH-F', !finance.error && finance.role === 'finance_officer', finance.error?.message || finance.role);

  let smokeId = null;
  if (!dealer.error && dealer.companyId) {
    const { data: products } = await dealer.sb
      .from('products')
      .select('id')
      .eq('company_id', dealer.companyId)
      .eq('status', 'active')
      .limit(1);
    const vehicleId =
      products?.[0]?.id ||
      (
        await dealer.sb
          .from('products')
          .select('id')
          .eq('company_id', dealer.companyId)
          .limit(1)
      ).data?.[0]?.id;
    const due = new Date();
    due.setMonth(due.getMonth() + 1);
    const schedule = [
      {
        installmentNumber: 1,
        dueDate: due.toISOString().slice(0, 10),
        amount: 100,
        status: 'upcoming',
      },
    ];
    const { data: created, error: cErr } = await dealer.sb
      .from('applications')
      .insert({
        customer_name: 'QA Credit Activate',
        customer_email: `qa-credit-activate+${Date.now()}@blox.test`,
        customer_phone: '+97400000099',
        customer_info: { source: 'qa-credit-activates-finance-views' },
        vehicle_id: vehicleId,
        company_id: dealer.companyId,
        agent_user_id: dealer.user.id,
        status: 'draft',
        documents: [],
        loan_amount: 100,
        down_payment: 0,
        selling_price: 100,
        installment_plan: { termMonths: 1, monthlyPayment: 100, schedule },
      })
      .select('id')
      .single();
    if (cErr || !created) {
      rec('SEED', false, cErr?.message || 'no create');
    } else {
      smokeId = created.id;
      await dealer.sb
        .from('applications')
        .update({
          status: 'under_review',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', smokeId);
      rec('SEED', true, `${smokeId} under_review`);
    }
  } else {
    rec('SEED', false, dealer.error?.message || 'no dealer');
  }

  if (smokeId && !credit.error) {
    // Prefer finance to move to PFA if credit update RLS is scoped; credit must still activate
    let atPfa = false;
    {
      const actor = !finance.error ? finance : credit;
      const { error: pfaErr } = await actor.sb
        .from('applications')
        .update({ status: 'pending_finance_activation' })
        .eq('id', smokeId);
      const { data: mid } = await (finance.sb || credit.sb)
        .from('applications')
        .select('status')
        .eq('id', smokeId)
        .maybeSingle();
      atPfa = mid?.status === 'pending_finance_activation';
      rec(
        'C-PFA',
        atPfa,
        pfaErr?.message || `via ${actor.email} status=${mid?.status}`
      );
    }

    // Finance forced active must fail
    if (!finance.error && atPfa) {
      const { error: fErr } = await finance.sb
        .from('applications')
        .update({ status: 'active' })
        .eq('id', smokeId);
      const { data: afterF } = await finance.sb
        .from('applications')
        .select('status')
        .eq('id', smokeId)
        .maybeSingle();
      rec(
        'F-BLOCK-ACTIVE',
        afterF?.status !== 'active',
        fErr ? `rejected: ${fErr.message}` : `status=${afterF?.status}`
      );
    } else if (!finance.error) {
      const { error: fErr } = await finance.sb
        .from('applications')
        .update({ status: 'active' })
        .eq('id', smokeId);
      const { data: afterF } = await finance.sb
        .from('applications')
        .select('status')
        .eq('id', smokeId)
        .maybeSingle();
      rec(
        'F-BLOCK-ACTIVE',
        afterF?.status !== 'active',
        fErr ? `rejected: ${fErr.message}` : `status=${afterF?.status}`
      );
    }

    // Credit activates
    const { error: aErr } = await credit.sb
      .from('applications')
      .update({ status: 'active' })
      .eq('id', smokeId);
    let finalStatus = null;
    {
      const { data: row } = await credit.sb
        .from('applications')
        .select('status')
        .eq('id', smokeId)
        .maybeSingle();
      finalStatus = row?.status || null;
      if (!finalStatus && finance.sb) {
        const { data: row2 } = await finance.sb
          .from('applications')
          .select('status')
          .eq('id', smokeId)
          .maybeSingle();
        finalStatus = row2?.status || null;
      }
    }
    rec(
      'C-ACTIVATE',
      finalStatus === 'active',
      aErr?.message || `via ${credit.email} status=${finalStatus}`
    );

    // Schedule rebuild as credit
    if (finalStatus === 'active') {
      const now = new Date().toISOString();
      const { error: delE } = await credit.sb.from('payment_schedules').delete().eq('application_id', smokeId);
      const { error: insE } = await credit.sb.from('payment_schedules').insert([
        {
          application_id: smokeId,
          due_date: new Date().toISOString().slice(0, 10),
          amount: 100,
          paid_amount: 0,
          remaining_amount: 100,
          status: 'upcoming',
          created_at: now,
          updated_at: now,
        },
      ]);
      const { count } = await credit.sb
        .from('payment_schedules')
        .select('id', { count: 'exact', head: true })
        .eq('application_id', smokeId);
      rec('C-SCHEDULES', !delE && !insE && (count ?? 0) >= 1, delE?.message || insE?.message || `rows=${count}`);
    }

    // Credit and finance can both mark paid
    if (!finance.error) {
      const { data: row } = await finance.sb
        .from('payment_schedules')
        .select('id, status')
        .eq('application_id', smokeId)
        .limit(1)
        .maybeSingle();
      if (row?.id) {
        // Reset to upcoming so credit mark-paid is measurable
        await finance.sb
          .from('payment_schedules')
          .update({
            status: 'upcoming',
            paid_amount: 0,
            remaining_amount: 100,
            paid_date: null,
          })
          .eq('id', row.id);

        const { data: cPaid, error: cPayErr } = await credit.sb
          .from('payment_schedules')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            paid_amount: 100,
            remaining_amount: 0,
          })
          .eq('id', row.id)
          .select('status')
          .maybeSingle();
        rec(
          'C-MARK-PAID',
          !cPayErr && cPaid?.status === 'paid',
          cPayErr?.message || `creditPaid=${cPaid?.status}`
        );

        // Reset then finance mark-paid
        await credit.sb
          .from('payment_schedules')
          .update({
            status: 'upcoming',
            paid_amount: 0,
            remaining_amount: 100,
            paid_date: null,
          })
          .eq('id', row.id);

        const { data: paid, error: fPayErr } = await finance.sb
          .from('payment_schedules')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString(),
            paid_amount: 100,
            remaining_amount: 0,
          })
          .eq('id', row.id)
          .select('status')
          .single();
        rec(
          'F-MARK-PAID',
          !fPayErr && paid?.status === 'paid',
          fPayErr?.message || `paid=${paid?.status}`
        );
      } else {
        rec('C-MARK-PAID', false, 'no schedule row');
        rec('F-MARK-PAID', false, 'no schedule row');
      }
    }

    // Credits still finance
    if (!finance.error) {
      const { error: addErr } = await finance.sb.rpc('admin_add_user_credits', {
        p_user_email: 'customer@blox.test',
        p_amount: 1,
        p_description: 'QA credit-activates smoke',
        p_admin_email: 'finance@blox.test',
      });
      const { error: subErr } = await finance.sb.rpc('admin_subtract_user_credits', {
        p_user_email: 'customer@blox.test',
        p_amount: 1,
        p_description: 'QA credit-activates smoke reverse',
        p_admin_email: 'finance@blox.test',
      });
      rec('F-CREDITS', !addErr && !subErr, addErr?.message || subErr?.message || 'add+subtract ok');
    }

    if (!credit.error) {
      const { error: deny } = await credit.sb.rpc('admin_add_user_credits', {
        p_user_email: 'customer@blox.test',
        p_amount: 1,
        p_description: 'should fail',
        p_admin_email: 'credit@blox.test',
      });
      rec('C-CREDITS-DENY', !!deny, deny?.message || 'UNEXPECTED allow');
    }
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log('\n--- SUMMARY ---');
  console.log(JSON.stringify({ pass, fail, smokeId, results }, null, 2));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
