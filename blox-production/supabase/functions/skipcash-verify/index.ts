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
    // Parse request body
    let verifyRequest: SkipCashVerifyRequest;
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      verifyRequest = JSON.parse(bodyText);
      console.log('Parsed verify request:', verifyRequest);
    } catch (parseError: any) {
      console.error('Failed to parse request body:', parseError);
      throw new Error(`Invalid request body: ${parseError.message || 'Expected valid JSON'}`);
    }

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

    const verifyUrl = `${apiUrl}/api/v1/payments/${paymentId}`;
    console.log('Verifying payment with SkipCash:', { url: verifyUrl, paymentId });

    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        'Authorization': hashInBase64,
        'Content-Type': 'application/json',
      },
    });

    let json: any;
    const responseText = await response.text();
    
    console.log('SkipCash API raw response:', {
      status: response.status,
      statusText: response.statusText,
      responseText: responseText.substring(0, 500), // First 500 chars to avoid huge logs
    });
    
    try {
      json = JSON.parse(responseText);
      console.log('SkipCash API parsed response:', JSON.stringify(json, null, 2));
    } catch (parseError: any) {
      console.error('Failed to parse SkipCash response:', {
        responseText: responseText.substring(0, 500),
        parseError: parseError.message,
      });
      throw new Error(`Invalid response from SkipCash API: ${response.status} ${response.statusText}. Response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      // Extract error message properly (could be string or object)
      let errorMessage: string;
      if (json.message && typeof json.message === 'string') {
        errorMessage = json.message;
      } else if (json.error) {
        if (typeof json.error === 'string') {
          errorMessage = json.error;
        } else if (typeof json.error === 'object' && json.error !== null) {
          // Error is an object, try to extract message from it
          errorMessage = json.error.message || 
                        json.error.error || 
                        json.error.errorMessage ||
                        (json.error.Message || json.error.Error) ||
                        JSON.stringify(json.error);
        } else {
          errorMessage = String(json.error);
        }
      } else if (json.errorMessage && typeof json.errorMessage === 'string') {
        errorMessage = json.errorMessage;
      } else {
        // No clear error message, return the full response as context
        errorMessage = `SkipCash API error (${response.status}): ${JSON.stringify(json)}`;
      }
      
      // Provide more helpful error messages for common cases
      if (errorMessage.toLowerCase() === 'forbidden' || response.status === 403) {
        errorMessage = `Payment verification failed: Access denied. This may mean the payment ID doesn't exist, has expired, or belongs to a different account. Payment ID: ${paymentId}`;
      } else if (response.status === 404) {
        errorMessage = `Payment not found. The payment ID may be invalid or the payment may have been deleted. Payment ID: ${paymentId}`;
      } else if (response.status === 401) {
        errorMessage = `Authentication failed. Please check SkipCash credentials.`;
      }
      
      console.error('SkipCash API error details:', { 
        status: response.status, 
        statusText: response.statusText, 
        fullResponse: json,
        extractedErrorMessage: errorMessage,
        paymentId: paymentId,
        url: verifyUrl,
        signaturePreview: hashInBase64.substring(0, 20) + '...',
      });
      throw new Error(errorMessage);
    }

    console.log('SkipCash verification response:', { status: json.status || json.resultObj?.status, paymentId });

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
    console.error('SkipCash verification error - full error object:', error);
    console.error('SkipCash verification error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      errorType: typeof error,
      isErrorInstance: error instanceof Error,
      errorKeys: error ? Object.keys(error) : [],
    });
    
    // Extract error message properly
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message || 'Payment verification failed';
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      // Error is an object, extract message
      errorMessage = error.message || 
                    error.error || 
                    error.errorMessage ||
                    (error.toString && error.toString() !== '[object Object]' ? error.toString() : JSON.stringify(error));
    } else {
      errorMessage = String(error) || 'Payment verification failed';
    }
    
    // If message is still [object Object], provide a better fallback
    if (errorMessage === '[object Object]' || errorMessage.includes('[object Object]')) {
      errorMessage = 'Payment verification failed. Check SkipCash API response for details.';
    }
    
    const statusCode = error.status || 400;
    
    console.log('Returning error response:', {
      success: false,
      error: errorMessage,
      statusCode,
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: process.env.DENO_ENV === 'development' ? {
          stack: error.stack,
          name: error.name,
          originalError: error instanceof Error ? error.message : String(error),
        } : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});

