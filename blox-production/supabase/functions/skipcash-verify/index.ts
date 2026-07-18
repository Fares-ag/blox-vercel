import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  applyCompletedPaymentDualWrite,
  resolveUseSandbox,
} from "../_shared/payment-schedule.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SkipCashVerifyRequest {
  paymentId?: string;
  transactionId?: string;
}

function mapSkipCashStatus(json: any): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  const rawStatus = json.status ?? json.resultObj?.status ?? json.statusId ?? 'pending';
  const statusNum = Number(rawStatus);
  const paymentStatus = String(rawStatus).toLowerCase();
  if (paymentStatus === 'completed' || paymentStatus === 'success' || paymentStatus === 'paid' || statusNum === 2) {
    return 'completed';
  }
  if (paymentStatus === 'failed' || paymentStatus === 'error' || statusNum === 4 || statusNum === 5 || statusNum === 8) {
    return 'failed';
  }
  if (paymentStatus === 'cancelled' || statusNum === 3) {
    return 'cancelled';
  }
  if (paymentStatus === 'processing' || statusNum === 1 || statusNum === 7) {
    return 'processing';
  }
  return 'pending';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userError || !user?.email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 },
      );
    }
    const userEmail = user.email.toLowerCase();

    let verifyRequest: SkipCashVerifyRequest;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Request body is empty');
      }
      verifyRequest = JSON.parse(bodyText);
    } catch (parseError: any) {
      throw new Error(`Invalid request body: ${parseError?.message || 'Expected valid JSON'}`);
    }

    if (!verifyRequest.paymentId && !verifyRequest.transactionId) {
      throw new Error('Payment ID or Transaction ID is required');
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Load local transaction when transactionId provided (required for ownership + binding)
    let localTxn: any = null;
    if (verifyRequest.transactionId) {
      const { data, error } = await serviceClient
        .from('payment_transactions')
        .select('id, transaction_id, status, amount, application_id, payment_schedule_id, skipcash_payment_id, payer_email')
        .eq('transaction_id', verifyRequest.transactionId)
        .maybeSingle();
      if (error) {
        console.error('Transaction lookup failed', error);
        throw new Error('Failed to look up payment transaction');
      }
      if (!data) {
        throw new Error('Payment transaction not found');
      }
      localTxn = data;

      // Ownership: payer_email or application customer_email
      let ownerEmail = (localTxn.payer_email || '').toLowerCase();
      if (!ownerEmail && localTxn.application_id) {
        const { data: app } = await serviceClient
          .from('applications')
          .select('customer_email')
          .eq('id', localTxn.application_id)
          .maybeSingle();
        ownerEmail = (app?.customer_email || '').toLowerCase();
      }
      if (!ownerEmail || ownerEmail !== userEmail) {
        return new Response(
          JSON.stringify({ success: false, error: 'Not authorized for this payment' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 },
        );
      }
    }

    let paymentId = verifyRequest.paymentId || localTxn?.skipcash_payment_id || null;

    // Bind client paymentId to stored SkipCash id when both exist
    if (
      verifyRequest.paymentId &&
      localTxn?.skipcash_payment_id &&
      String(verifyRequest.paymentId) !== String(localTxn.skipcash_payment_id)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment ID does not match this transaction',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    if (!paymentId && localTxn) {
      // No SkipCash id yet — return DB status only (do not invent a payment id)
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: localTxn.status,
            statusId:
              localTxn.status === 'completed' ? 2 :
              localTxn.status === 'failed' ? 4 :
              localTxn.status === 'cancelled' ? 3 : 1,
            transactionId: verifyRequest.transactionId,
            dbConfirmed: localTxn.status === 'completed',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    if (!paymentId) {
      throw new Error('Payment ID not found. Provide paymentId or a transaction with skipcash_payment_id.');
    }

    // Require transactionId for any DB mutation path
    if (!verifyRequest.transactionId) {
      throw new Error('transactionId is required to verify and update payment status');
    }

    const skipCashConfig = {
      sandboxURL: Deno.env.get('SKIPCASH_SANDBOX_URL') || 'https://skipcashtest.azurewebsites.net',
      productionURL: Deno.env.get('SKIPCASH_PRODUCTION_URL') || 'https://api.skipcash.app',
      secretKey: Deno.env.get('SKIPCASH_SECRET_KEY') || '',
      keyId: Deno.env.get('SKIPCASH_KEY_ID') || '',
      useSandbox: resolveUseSandbox(),
    };

    if (!skipCashConfig.secretKey || !skipCashConfig.keyId) {
      throw new Error('SkipCash credentials not configured');
    }

    const combinedData = `PaymentId=${paymentId},KeyId=${skipCashConfig.keyId}`;
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(skipCashConfig.secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(combinedData));
    const hashInBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    const apiUrl = skipCashConfig.useSandbox
      ? skipCashConfig.sandboxURL
      : skipCashConfig.productionURL;
    const verifyUrl = `${apiUrl}/api/v1/payments/${paymentId}`;

    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': hashInBase64,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    let json: any;
    try {
      json = JSON.parse(responseText);
    } catch {
      throw new Error(`Invalid response from SkipCash API: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      let errorMessage =
        (typeof json.message === 'string' && json.message) ||
        (typeof json.error === 'string' && json.error) ||
        `SkipCash API error (${response.status})`;
      if (response.status === 403) {
        errorMessage = `Payment verification failed: Access denied. Payment ID: ${paymentId}`;
      } else if (response.status === 404) {
        errorMessage = `Payment not found. Payment ID: ${paymentId}`;
      }
      throw new Error(errorMessage);
    }

    const dbStatus = mapSkipCashStatus(json);

    // Update only the owned, bound transaction row
    const updatePayload: Record<string, unknown> = {
      status: dbStatus,
      skipcash_payment_id: paymentId,
      completed_at: dbStatus === 'completed' ? new Date().toISOString() : null,
      failure_reason: dbStatus === 'failed' ? String(json?.message ?? 'Payment failed') : null,
    };
    if (!localTxn?.payer_email) {
      updatePayload.payer_email = userEmail;
    }

    const { error: updateError } = await serviceClient
      .from('payment_transactions')
      .update(updatePayload)
      .eq('transaction_id', verifyRequest.transactionId)
      .eq('id', localTxn.id);

    if (updateError) {
      console.error('Failed to update payment transaction:', updateError);
      throw new Error('Failed to update payment transaction');
    }

    // Schedule dual-write when installment payment completed (credit top-ups have no application)
    let scheduleApplied = false;
    if (dbStatus === 'completed' && localTxn.application_id) {
      try {
        // Recover dueDate / schedule id from SkipCash custom fields when present
        const customRaw = json?.resultObj?.custom1 ?? json?.custom1;
        let paymentScheduleId: string | null = localTxn.payment_schedule_id || null;
        let dueDate: string | null = null;
        let isSettlement = false;
        if (typeof customRaw === 'string' && customRaw.trim()) {
          try {
            const customObj = JSON.parse(customRaw);
            paymentScheduleId = customObj.paymentScheduleId || paymentScheduleId;
            dueDate = customObj.dueDate || null;
            isSettlement = !!customObj.isSettlement;
          } catch {
            /* ignore */
          }
        }

        await applyCompletedPaymentDualWrite(serviceClient, localTxn.application_id, {
          amount: Number(localTxn.amount) || 0,
          isSettlement,
          paymentScheduleId,
          dueDate,
        });
        scheduleApplied = true;
      } catch (scheduleErr) {
        console.error('Verify dual-write failed (webhook may retry):', scheduleErr);
        // Return success for SkipCash status but signal schedule pending
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...(json.resultObj || json),
              dbStatus,
              dbConfirmed: true,
              scheduleApplied: false,
              scheduleError: 'Schedule dual-write pending; webhook may complete it',
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...(json.resultObj || json),
          dbStatus,
          dbConfirmed: dbStatus === 'completed',
          scheduleApplied,
          transactionId: verifyRequest.transactionId,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    const errorMessage =
      error instanceof Error
        ? (error.message || 'Payment verification failed')
        : String(error) || 'Payment verification failed';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error?.status || 400,
      },
    );
  }
});
