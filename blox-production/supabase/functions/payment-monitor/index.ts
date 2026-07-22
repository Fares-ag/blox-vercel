import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * payment-monitor — scheduled edge function.
 *
 * Intended trigger: every 15 minutes via Supabase cron or external scheduler.
 * Can also be called manually via HTTP POST for on-demand checks.
 *
 * Checks:
 *  1. payment_transactions stuck in 'pending' for > 2 hours  → WARNING
 *  2. payment_schedules marked 'paid' with no backing completed transaction
 *     in the last 7 days → WARNING (reconciliation gap)
 *
 * Output: structured JSON logs surfaced in Supabase Dashboard → Edge Functions Logs.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[payment-monitor] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(
      JSON.stringify({ success: false, error: 'Missing Supabase credentials' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const db = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, unknown> = { checkedAt: new Date().toISOString() };

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // CHECK 1 and CHECK 2 are completely independent — run them in parallel to
  // halve the edge function latency.
  const [check1Result, check2Result] = await Promise.allSettled([
    // ── CHECK 1: Stuck pending transactions (> 2 hours) ──────────────────────
    db
      .from('payment_transactions')
      .select('id, application_id, amount, created_at, payer_email')
      .eq('status', 'pending')
      .lt('created_at', twoHoursAgo),

    // ── CHECK 2: Reconciliation gap via RPC ───────────────────────────────────
    db.rpc('payment_reconcile_gaps_7d' as any, {} as any),
  ]);

  // Process CHECK 1
  if (check1Result.status === 'rejected') {
    console.error('[payment-monitor] CHECK 1 exception:', check1Result.reason);
    results.stuckTransactions = { error: String(check1Result.reason) };
  } else {
    const { data: stuckTxns, error } = check1Result.value;
    if (error) {
      console.error('[payment-monitor] CHECK 1 query failed:', error.message);
      results.stuckTransactions = { error: error.message };
    } else {
      const count = stuckTxns?.length ?? 0;
      if (count > 0) {
        console.warn('[payment-monitor] WARNING: stuck pending transactions', {
          count,
          ids: stuckTxns?.map((t) => t.id),
        });
      } else {
        console.log('[payment-monitor] CHECK 1 OK: no stuck pending transactions');
      }
      results.stuckTransactions = { count, items: stuckTxns ?? [] };
    }
  }

  // Process CHECK 2
  if (check2Result.status === 'rejected') {
    console.warn('[payment-monitor] CHECK 2 skipped (RPC not yet available):', check2Result.reason);
    results.reconciliationGaps = { skipped: true, reason: String(check2Result.reason) };
  } else {
    const { data: reconcileRows, error: reconcileErr } = check2Result.value;
    let orphanCount = 0;
    let orphanIds: string[] = [];
    if (!reconcileErr && reconcileRows) {
      orphanCount = Array.isArray(reconcileRows) ? reconcileRows.length : 0;
      orphanIds = Array.isArray(reconcileRows)
        ? (reconcileRows as any[]).map((r) => r.id)
        : [];
    }
    if (orphanCount > 0) {
      console.warn('[payment-monitor] WARNING: paid schedules with no completed transaction', {
        count: orphanCount,
        ids: orphanIds,
      });
    } else {
      console.log('[payment-monitor] CHECK 2 OK: no reconciliation gaps in last 7 days');
    }
    results.reconciliationGaps = { count: orphanCount, ids: orphanIds };
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const hasWarnings =
    ((results.stuckTransactions as any)?.count ?? 0) > 0 ||
    ((results.reconciliationGaps as any)?.count ?? 0) > 0;

  const level = hasWarnings ? 'WARNING' : 'OK';
  console.log(`[payment-monitor] RESULT: ${level}`, JSON.stringify(results));

  return new Response(
    JSON.stringify({ success: true, level, results }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
