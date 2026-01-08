import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SkipCashVerifyRequest {
  paymentId: string;
  transactionId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const verifyRequest: SkipCashVerifyRequest = await req.json();

    if (!verifyRequest.paymentId && !verifyRequest.transactionId) {
      throw new Error('Payment ID or Transaction ID is required');
    }
    
    // If only transactionId is provided, look up payment from database first
    let paymentId = verifyRequest.paymentId;
    if (!paymentId && verifyRequest.transactionId) {
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
      
      const { data: transaction, error: lookupError } = await supabaseClient
        .from('payment_transactions')
        .select('skipcash_payment_id, status')
        .eq('transaction_id', verifyRequest.transactionId)
        .single();
      
      if (!lookupError && transaction?.skipcash_payment_id) {
        paymentId = transaction.skipcash_payment_id;
      } else if (!lookupError && transaction) {
        // Return status from database if payment ID not found
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              status: transaction.status,
              statusId: transaction.status === 'completed' ? 2 : 
                       transaction.status === 'failed' ? 4 :
                       transaction.status === 'cancelled' ? 3 : 1,
              transactionId: verifyRequest.transactionId,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }
    
    if (!paymentId) {
      throw new Error('Payment ID not found. Please provide paymentId or ensure transaction exists in database.');
    }

    // Get SkipCash credentials
    const skipCashConfig = {
      sandboxURL: Deno.env.get('SKIPCASH_SANDBOX_URL') || 'https://skipcashtest.azurewebsites.net',
      productionURL: Deno.env.get('SKIPCASH_PRODUCTION_URL') || 'https://api.skipcash.app',
      secretKey: Deno.env.get('SKIPCASH_SECRET_KEY') || '',
      keyId: Deno.env.get('SKIPCASH_KEY_ID') || '',
      useSandbox: Deno.env.get('SKIPCASH_USE_SANDBOX') !== 'false',
    };

    if (!skipCashConfig.secretKey || !skipCashConfig.keyId) {
      throw new Error('SkipCash credentials not configured');
    }

    // Build verification request
    const combinedData = `PaymentId=${paymentId},KeyId=${skipCashConfig.keyId}`;
    
    // Generate HMAC SHA256 hash
    const encoder = new TextEncoder();
    const keyData = encoder.encode(skipCashConfig.secretKey);
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

    // Make API call to verify payment
    const apiUrl = skipCashConfig.useSandbox 
      ? skipCashConfig.sandboxURL 
      : skipCashConfig.productionURL;

    const response = await fetch(`${apiUrl}/api/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': hashInBase64,
        'Content-Type': 'application/json',
      },
    });

    const json = await response.json();

    if (!response.ok) {
      throw new Error(json.message || json.error || 'Payment verification failed');
    }

    // Update payment transaction in database if transactionId is provided
    if (verifyRequest.transactionId) {
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

      // Determine status from SkipCash response
      const paymentStatus = json.status || json.resultObj?.status || 'pending';
      let dbStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' = 'pending';
      
      if (paymentStatus.toLowerCase() === 'completed' || paymentStatus.toLowerCase() === 'success') {
        dbStatus = 'completed';
      } else if (paymentStatus.toLowerCase() === 'failed' || paymentStatus.toLowerCase() === 'error') {
        dbStatus = 'failed';
      } else if (paymentStatus.toLowerCase() === 'cancelled') {
        dbStatus = 'cancelled';
      } else if (paymentStatus.toLowerCase() === 'processing') {
        dbStatus = 'processing';
      }

      await supabaseClient
        .from('payment_transactions')
        .update({
          status: dbStatus,
          completed_at: dbStatus === 'completed' ? new Date().toISOString() : null,
          failure_reason: dbStatus === 'failed' ? json.message || 'Payment failed' : null,
        })
        .eq('transaction_id', verifyRequest.transactionId)
        .catch(err => {
          console.error('Failed to update payment transaction:', err);
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: json.resultObj || json,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('SkipCash verification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment verification failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

