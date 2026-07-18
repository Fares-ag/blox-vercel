import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyCompletedPaymentDualWrite } from "../_shared/payment-schedule.ts";

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
  CardNubmer?: string | null; // SkipCash typo in some versions
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
function mapStatusIdToDbStatus(statusId: number): 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' {
  switch (statusId) {
    case 2: // paid
      return 'completed';
    case 3: // canceled
      return 'cancelled';
    case 4: // failed
    case 5: // rejected
    case 8: // refund failed
      return 'failed';
    case 0: // new
    case 1: // pending
    case 7: // pending refund
      return 'pending';
    case 6: // refunded
      return 'completed'; // Refunded is still considered completed from payment perspective
    default:
      return 'pending';
  }
}

/**
 * Verify webhook signature
 * SkipCash sends: PaymentId,Amount,StatusId,TransactionId,Custom1,VisaId
 * Order is important!
 */
async function verifyWebhookSignature(
  payload: SkipCashWebhookPayload,
  authorizationHeader: string | null,
  webhookKey: string
): Promise<boolean> {
  if (!authorizationHeader) {
    return false;
  }

  try {
    // Build the combined data string in the correct order
    // Required: PaymentId, Amount, StatusId
    // Optional: TransactionId, Custom1, VisaId (include if present)
    const parts: string[] = [
      `PaymentId=${payload.PaymentId}`,
      `Amount=${payload.Amount}`,
      `StatusId=${payload.StatusId}`,
    ];

    // Add optional fields if they exist (in correct order)
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

    // Generate HMAC SHA256 hash
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookKey);
    const messageData = encoder.encode(combinedData);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashInBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Compare with authorization header
    return hashInBase64 === authorizationHeader;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get webhook key from environment
    const webhookKey = Deno.env.get('SKIPCASH_WEBHOOK_KEY');
    if (!webhookKey) {
      console.error('SKIPCASH_WEBHOOK_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Webhook key not configured',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Get authorization header
    const authorizationHeader = req.headers.get('Authorization') || req.headers.get('authorization');

    // Parse webhook payload
    const webhookData: SkipCashWebhookPayload = await req.json();

    // Validate required fields
    if (!webhookData.PaymentId || !webhookData.Amount || webhookData.StatusId === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: PaymentId, Amount, or StatusId',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Verify webhook signature
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
        JSON.stringify({
          success: false,
          error: 'Invalid webhook signature',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Map StatusId to database status
    const dbStatus = mapStatusIdToDbStatus(webhookData.StatusId);

    // Parse Custom1 to get application context or credit top-up info (and transactionId fallback)
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
      } catch (e) {
        if (typeof webhookData.Custom1 === 'string' && webhookData.Custom1.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          applicationId = webhookData.Custom1;
        }
      }
    }

    const transactionId = webhookData.TransactionId || transactionIdFromCustom1 || webhookData.Custom1?.split('"transactionId":"')[1]?.split('"')[0] || null;

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Handle payment status update
    // Important: Don't update if already marked as 'completed' and new status is 'failed'
    // This prevents out-of-order webhook issues
    if (transactionId) {
      // IDEMPOTENCY CHECK: Check if this webhook has already been processed
      const { data: existingPayment } = await supabaseClient
        .from('payment_transactions')
        .select('id, status, skipcash_payment_id')
        .eq('transaction_id', transactionId)
        .single();

      // Duplicate delivery: if already completed, still ensure schedule dual-write
      // (prior attempt may have returned 500 after txn upsert but before schedule update)
      if (
        existingPayment &&
        existingPayment.skipcash_payment_id === webhookData.PaymentId &&
        existingPayment.status === 'completed'
      ) {
        if (applicationId) {
          try {
            const amountNumEarly = parseFloat(webhookData.Amount);
            const trustedAmount = Number.isFinite(amountNumEarly) ? amountNumEarly : 0;
            await applyCompletedPaymentDualWrite(supabaseClient, applicationId, {
              amount: trustedAmount,
              isSettlement,
              paymentScheduleId,
              dueDate: paymentDueDate,
            });
          } catch (retryErr) {
            console.error('Duplicate webhook: schedule dual-write retry failed', retryErr);
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Schedule dual-write failed; please retry',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              }
            );
          }
        }
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Webhook already processed (duplicate); schedule ensured',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Check current transaction status
      const existingTransaction = existingPayment;

      // If transaction is already completed and new status is failed, ignore it
      // This handles out-of-order webhook delivery
      if (existingTransaction?.status === 'completed' && dbStatus === 'failed') {
        console.log('Ignoring failed status for already completed transaction', {
          transactionId,
          paymentId: webhookData.PaymentId,
        });
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Transaction already completed, ignoring failed status',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Update or create payment transaction
      const updateData: any = {
        status: dbStatus,
        failure_reason: (dbStatus === 'failed' || dbStatus === 'cancelled') 
          ? `StatusId: ${webhookData.StatusId}${webhookData.CardType ? `, CardType: ${webhookData.CardType}` : ''}` 
          : null,
      };

      if (dbStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const amountNum = parseFloat(webhookData.Amount);
      const amount = Number.isFinite(amountNum) ? amountNum : 0;

      // Upsert payment transaction (with idempotency key).
      // We do not send card_type here so the value set by skipcash-payment (from custom1) is preserved on conflict.
      // Resolve payer email for ownership (credit Custom1.email or application owner)
      let payerEmail = customerEmail;
      if (!payerEmail && applicationId) {
        const { data: appOwner } = await supabaseClient
          .from('applications')
          .select('customer_email')
          .eq('id', applicationId)
          .maybeSingle();
        if (appOwner?.customer_email) {
          payerEmail = String(appOwner.customer_email).toLowerCase();
        }
      }

      const upsertRow: Record<string, unknown> = {
          transaction_id: transactionId,
          skipcash_payment_id: webhookData.PaymentId, // Idempotency key
          application_id: applicationId,
          payment_schedule_id: paymentScheduleId,
          amount,
          method: 'card',
          status: dbStatus,
          completed_at: dbStatus === 'completed' ? new Date().toISOString() : null,
          failure_reason: updateData.failure_reason,
      };
      if (payerEmail) {
        upsertRow.payer_email = payerEmail;
      }

      const { data: transaction, error: upsertError } = await supabaseClient
        .from('payment_transactions')
        .upsert(upsertRow, {
          onConflict: 'transaction_id',
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Failed to upsert payment transaction:', upsertError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to upsert payment transaction; please retry',
            paymentId: webhookData.PaymentId,
            transactionId,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
      if (!Number.isFinite(amountNum)) {
        console.warn('Webhook Amount was not a valid number', { Amount: webhookData.Amount, transactionId });
      }

      // Handle credit top-up if payment is completed
      if (dbStatus === 'completed' && isCreditTopup && creditsAmount > 0 && customerEmail) {
        try {
          console.log('Processing credit top-up:', {
            customerEmail,
            creditsAmount,
            transactionId,
            paymentId: webhookData.PaymentId,
          });

          // Use RPC to add credits (bypasses RLS with service role)
          const { data: addCreditsResult, error: addCreditsError } = await supabaseClient.rpc(
            'admin_add_user_credits',
            {
              p_user_email: customerEmail,
              p_amount: Number(creditsAmount) || 0,
              p_description: `Credit top-up via payment. Transaction ID: ${transactionId}, Payment ID: ${webhookData.PaymentId}`,
              p_admin_email: null, // System-initiated
            }
          );

          if (addCreditsError) {
            console.error('Failed to add credits via webhook:', addCreditsError);
          } else if (addCreditsResult && addCreditsResult.length > 0 && addCreditsResult[0].success) {
            console.log('Successfully added credits via webhook:', {
              customerEmail,
              creditsAmount,
              newBalance: addCreditsResult[0].new_balance,
            });
          } else {
            console.error('Failed to add credits - unexpected result:', addCreditsResult);
          }
        } catch (creditError: any) {
          console.error('Error processing credit top-up:', creditError);
          // Don't fail the webhook if credits update fails, but log it
        }
      }

      // If payment is completed, dual-write payment_schedules + installment_plan JSON
      if (dbStatus === 'completed' && applicationId && transaction) {
        try {
          const trustedAmount =
            Number((transaction as any)?.amount) > 0
              ? Number((transaction as any).amount)
              : amount;

          await applyCompletedPaymentDualWrite(supabaseClient, applicationId, {
            amount: trustedAmount,
            isSettlement,
            paymentScheduleId,
            dueDate: paymentDueDate,
          });
        } catch (scheduleErr) {
          console.error('Failed to dual-write payment schedule:', scheduleErr);
          // Durable failure: ask SkipCash to redeliver. Dual-write is idempotent for already-paid rows.
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Schedule dual-write failed; please retry',
              paymentId: webhookData.PaymentId,
              transactionId,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          );
        }
      }
    }

    // Acknowledge successful processing
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        paymentId: webhookData.PaymentId,
        statusId: webhookData.StatusId,
        status: dbStatus,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('SkipCash webhook error:', error);
    // Non-2xx so SkipCash redelivers; signature failures return 401 earlier.
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
