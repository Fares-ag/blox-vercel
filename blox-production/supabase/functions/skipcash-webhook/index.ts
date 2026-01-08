import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const transactionId = webhookData.TransactionId || webhookData.Custom1?.split('"transactionId":"')[1]?.split('"')[0];

    // Parse Custom1 to get application context
    let applicationId: string | null = null;
    let paymentScheduleId: string | null = null;
    let isSettlement = false;

    if (webhookData.Custom1) {
      try {
        const customData = JSON.parse(webhookData.Custom1);
        applicationId = customData.applicationId || null;
        paymentScheduleId = customData.paymentScheduleId || null;
        isSettlement = customData.isSettlement || false;
      } catch (e) {
        // If Custom1 is not JSON, try to extract applicationId directly
        // Some merchants might pass it as a plain string
        if (webhookData.Custom1.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          applicationId = webhookData.Custom1;
        }
      }
    }

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
      // Check current transaction status
      const { data: existingTransaction } = await supabaseClient
        .from('payment_transactions')
        .select('status')
        .eq('transaction_id', transactionId)
        .single();

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

      // Upsert payment transaction
      const { data: transaction, error: upsertError } = await supabaseClient
        .from('payment_transactions')
        .upsert({
          transaction_id: transactionId,
          application_id: applicationId,
          payment_schedule_id: paymentScheduleId,
          amount: parseFloat(webhookData.Amount),
          method: 'card',
          status: dbStatus,
          completed_at: dbStatus === 'completed' ? new Date().toISOString() : null,
          failure_reason: updateData.failure_reason,
        }, {
          onConflict: 'transaction_id',
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Failed to upsert payment transaction:', upsertError);
        // Don't fail the webhook, but log the error
      }

      // If payment is completed, update the payment schedule and application
      if (dbStatus === 'completed' && applicationId && transaction) {
        // Get the application to update payment schedule
        const { data: application, error: appError } = await supabaseClient
          .from('applications')
          .select('installment_plan')
          .eq('id', applicationId)
          .single();

        if (!appError && application?.installment_plan) {
          const installmentPlan = application.installment_plan as any;
          const schedule = installmentPlan.schedule || [];

          if (isSettlement) {
            // Settlement: Mark all remaining payments as paid
            const updatedSchedule = schedule.map((payment: any) => {
              if (payment.status !== 'paid') {
                return {
                  ...payment,
                  status: 'paid',
                  paidDate: new Date().toISOString().split('T')[0],
                };
              }
              return payment;
            });

            // Update application with new schedule
            await supabaseClient
              .from('applications')
              .update({
                installment_plan: {
                  ...installmentPlan,
                  schedule: updatedSchedule,
                },
              })
              .eq('id', applicationId)
              .catch(err => {
                console.error('Failed to update application payment schedule:', err);
              });
          } else if (paymentScheduleId) {
            // Single payment: Update specific payment schedule
            const updatedSchedule = schedule.map((payment: any) => {
              if (payment.id === paymentScheduleId) {
                return {
                  ...payment,
                  status: 'paid',
                  paidDate: new Date().toISOString().split('T')[0],
                };
              }
              return payment;
            });

            // Update application with new schedule
            await supabaseClient
              .from('applications')
              .update({
                installment_plan: {
                  ...installmentPlan,
                  schedule: updatedSchedule,
                },
              })
              .eq('id', applicationId)
              .catch(err => {
                console.error('Failed to update application payment schedule:', err);
              });
          } else {
            // No specific schedule ID, mark first upcoming payment as paid
            const updatedSchedule = schedule.map((payment: any, index: number) => {
              if (index === 0 && (payment.status === 'upcoming' || payment.status === 'active')) {
                return {
                  ...payment,
                  status: 'paid',
                  paidDate: new Date().toISOString().split('T')[0],
                };
              }
              return payment;
            });

            // Update application with new schedule
            await supabaseClient
              .from('applications')
              .update({
                installment_plan: {
                  ...installmentPlan,
                  schedule: updatedSchedule,
                },
              })
              .eq('id', applicationId)
              .catch(err => {
                console.error('Failed to update application payment schedule:', err);
              });
          }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    // SkipCash requires HTTP 200 for successful webhook processing
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
    // Still return 200 to prevent retries for system errors
    // Log the error for debugging
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Webhook processing failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 even on error to prevent infinite retries
      }
    );
  }
});
