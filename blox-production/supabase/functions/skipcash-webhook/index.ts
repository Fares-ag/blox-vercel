import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/send-email.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SkipCashWebhookPayload {
  PaymentId: string;
  Amount: string;
  StatusId: number;
  TransactionId: string | null;
  Custom1: string | null;
  Custom2?: string | null;
  Custom3?: string | null;
  Custom4?: string | null;
  Custom5?: string | null;
  Custom6?: string | null;
  Custom7?: string | null;
  Custom8?: string | null;
  Custom9?: string | null;
  Custom10?: string | null;
  VisaId?: string | null;
  TokenId?: string | null;
  CardType?: string | null;
  CardNumber?: string | null;
  CardNubmer?: string | null;
  RecurringSubscriptionId?: string | null;
}

/**
 * Map SkipCash StatusId to database status
 * 0 – new, 1 – pending
 * 2 – paid, 3 – canceled
 * 4 – failed, 5 – rejected
 * 6 – refunded, 7 – pending refund
 * 8 – refund failed
 */
function mapStatusIdToDbStatus(
  statusId: number
): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' {
  switch (statusId) {
    case 2:
      return 'completed';
    case 3:
      return 'cancelled';
    case 4:
    case 5:
    case 8:
      return 'failed';
    case 0:
    case 1:
    case 7:
      return 'pending';
    case 6:
      // Do NOT treat refunds as completed — never advance schedule
      return 'refunded';
    default:
      return 'pending';
  }
}

async function verifyWebhookSignature(
  payload: SkipCashWebhookPayload,
  authorizationHeader: string | null,
  webhookKey: string
): Promise<boolean> {
  if (!authorizationHeader) {
    return false;
  }

  try {
    const parts: string[] = [
      `PaymentId=${payload.PaymentId}`,
      `Amount=${payload.Amount}`,
      `StatusId=${payload.StatusId}`,
    ];

    if (payload.TransactionId) {
      parts.push(`TransactionId=${payload.TransactionId}`);
    }
    if (payload.Custom1) {
      parts.push(`Custom1=${payload.Custom1}`);
    }
    if (payload.VisaId) {
      parts.push(`VisaId=${payload.VisaId}`);
    }

    const combinedData = parts.join(',');
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(combinedData));
    const hashInBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Constant-time-ish compare
    if (hashInBase64.length !== authorizationHeader.length) return false;
    let mismatch = 0;
    for (let i = 0; i < hashInBase64.length; i++) {
      mismatch |= hashInBase64.charCodeAt(i) ^ authorizationHeader.charCodeAt(i);
    }
    return mismatch === 0;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookKey = Deno.env.get('SKIPCASH_WEBHOOK_KEY');
    if (!webhookKey) {
      console.error('SKIPCASH_WEBHOOK_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const authorizationHeader =
      req.headers.get('Authorization') || req.headers.get('authorization');

    const webhookData: SkipCashWebhookPayload = await req.json();

    if (!webhookData.PaymentId || !webhookData.Amount || webhookData.StatusId === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: PaymentId, Amount, or StatusId',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const isValidSignature = await verifyWebhookSignature(
      webhookData,
      authorizationHeader,
      webhookKey
    );

    if (!isValidSignature) {
      console.error('Invalid webhook signature', {
        paymentId: webhookData.PaymentId,
        transactionId: webhookData.TransactionId,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid webhook signature' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const dbStatus = mapStatusIdToDbStatus(webhookData.StatusId);

    let applicationId: string | null = null;
    let paymentScheduleId: string | null = null;
    let paymentDueDate: string | null = null;
    let isSettlement = false;
    let isCreditTopup = false;
    let creditsAmount = 0;
    let customerEmail: string | null = null;
    let transactionIdFromCustom1: string | null = null;

    if (webhookData.Custom1) {
      try {
        const customData = JSON.parse(webhookData.Custom1);
        applicationId = customData.applicationId || null;
        paymentScheduleId = customData.paymentScheduleId || null;
        paymentDueDate = customData.dueDate || null;
        isSettlement = customData.isSettlement || false;
        isCreditTopup = customData.type === 'credit_topup';
        creditsAmount = Number(customData.credits) || 0;
        transactionIdFromCustom1 = customData.transactionId || null;
        if (isCreditTopup && customData.email) {
          customerEmail = (customData.email as string).toLowerCase();
        }
      } catch {
        if (
          typeof webhookData.Custom1 === 'string' &&
          webhookData.Custom1.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          )
        ) {
          applicationId = webhookData.Custom1;
        }
      }
    }

    const transactionId =
      webhookData.TransactionId ||
      transactionIdFromCustom1 ||
      null;

    // Fail closed — SkipCash must retry when we cannot bind a ledger row
    if (!transactionId) {
      console.error('Webhook missing transactionId', {
        paymentId: webhookData.PaymentId,
        statusId: webhookData.StatusId,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'transactionId required',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const amountNum = parseFloat(webhookData.Amount);
    if (!Number.isFinite(amountNum)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Amount' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    if (!customerEmail && applicationId) {
      const { data: appOwner } = await supabaseClient
        .from('applications')
        .select('customer_email')
        .eq('id', applicationId)
        .maybeSingle();
      if (appOwner?.customer_email) {
        customerEmail = String(appOwner.customer_email).toLowerCase();
      }
    }

    const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
      'complete_skipcash_payment',
      {
        p_transaction_id: transactionId,
        p_skipcash_payment_id: webhookData.PaymentId,
        p_amount: amountNum,
        p_status: dbStatus,
        p_application_id: applicationId,
        p_payment_schedule_id: paymentScheduleId,
        p_due_date: paymentDueDate,
        p_is_settlement: isSettlement,
        p_is_credit_topup: isCreditTopup,
        p_credits_amount: creditsAmount > 0 ? creditsAmount : amountNum,
        p_customer_email: customerEmail,
        p_failure_reason:
          dbStatus === 'failed' || dbStatus === 'cancelled' || dbStatus === 'refunded'
            ? `StatusId: ${webhookData.StatusId}${
                webhookData.CardType ? `, CardType: ${webhookData.CardType}` : ''
              }`
            : null,
        p_amount_tolerance: 0.05,
      }
    );

    if (rpcError) {
      console.error('complete_skipcash_payment failed:', rpcError);
      return new Response(
        JSON.stringify({
          success: false,
          error: rpcError.message || 'Payment completion failed',
          paymentId: webhookData.PaymentId,
          transactionId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const result = rpcResult as { success?: boolean; error?: string; code?: string } | null;
    if (result && result.success === false) {
      const status = result.code === 'amount_mismatch' ? 400 : 500;
      console.error('complete_skipcash_payment rejected:', result);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
      });
    }

    // Send payment receipt email on successful SkipCash payment.
    if (dbStatus === 'completed' && customerEmail && applicationId && !isCreditTopup) {
      void sendEmail({
        to: customerEmail,
        templateId: 'payment_receipt',
        data: {
          applicationId,
          amount: amountNum,
          dueDate: paymentDueDate ?? undefined,
          method: 'SkipCash',
        },
        userEmail: customerEmail,
        idempotencyKey: `receipt:skipcash:${transactionId}`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        paymentId: webhookData.PaymentId,
        statusId: webhookData.StatusId,
        status: dbStatus,
        result: rpcResult,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('SkipCash webhook error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Webhook processing failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
