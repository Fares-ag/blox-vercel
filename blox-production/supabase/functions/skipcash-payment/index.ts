import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
};

interface SkipCashPaymentRequest {
  amount: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  transactionId: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  custom1?: string;
  subject?: string;
  description?: string;
  returnUrl?: string;
  webhookUrl?: string;
  onlyDebitCard?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight - return 204 No Content (standard for OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get SkipCash credentials from environment variables
    const skipCashConfig = {
      sandboxURL: Deno.env.get('SKIPCASH_SANDBOX_URL') || 'https://skipcashtest.azurewebsites.net',
      productionURL: Deno.env.get('SKIPCASH_PRODUCTION_URL') || 'https://api.skipcash.app',
      secretKey: Deno.env.get('SKIPCASH_SECRET_KEY') || '',
      keyId: Deno.env.get('SKIPCASH_KEY_ID') || '',
      clientId: Deno.env.get('SKIPCASH_CLIENT_ID') || '',
      useSandbox: Deno.env.get('SKIPCASH_USE_SANDBOX') !== 'false', // Default to sandbox for safety
    };

    // Check credentials
    const missingCredentials = [];
    if (!skipCashConfig.secretKey) missingCredentials.push('SKIPCASH_SECRET_KEY');
    if (!skipCashConfig.keyId) missingCredentials.push('SKIPCASH_KEY_ID');
    if (!skipCashConfig.clientId) missingCredentials.push('SKIPCASH_CLIENT_ID');
    
    if (missingCredentials.length > 0) {
      console.error('Missing SkipCash credentials:', missingCredentials);
      throw new Error(`SkipCash credentials not configured. Missing: ${missingCredentials.join(', ')}. Please set these environment variables in Supabase Edge Functions secrets.`);
    }
    
    console.log('SkipCash config loaded:', {
      useSandbox: skipCashConfig.useSandbox,
      apiUrl: skipCashConfig.useSandbox ? skipCashConfig.sandboxURL : skipCashConfig.productionURL,
      hasKeyId: !!skipCashConfig.keyId,
      hasSecretKey: !!skipCashConfig.secretKey,
      hasClientId: !!skipCashConfig.clientId,
    });

    let paymentDetails: SkipCashPaymentRequest;
    try {
      // Supabase functions.invoke() sends the body as JSON, so we need to parse it
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Request body is empty');
      }
      
      paymentDetails = JSON.parse(bodyText);
      console.log('Received payment details:', {
        amount: paymentDetails.amount,
        firstName: paymentDetails.firstName,
        lastName: paymentDetails.lastName,
        phone: paymentDetails.phone,
        email: paymentDetails.email,
        transactionId: paymentDetails.transactionId,
        hasCustom1: !!paymentDetails.custom1,
      });
    } catch (e: any) {
      console.error('Failed to parse request body:', e);
      throw new Error(`Invalid request body: ${e.message || 'Expected valid JSON'}`);
    }

    // Validate required fields
    const missingFields = [];
    if (!paymentDetails.amount) missingFields.push('amount');
    if (!paymentDetails.firstName) missingFields.push('firstName');
    if (!paymentDetails.lastName) missingFields.push('lastName');
    if (!paymentDetails.phone) missingFields.push('phone');
    if (!paymentDetails.email) missingFields.push('email');
    if (!paymentDetails.transactionId) missingFields.push('transactionId');
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required payment fields: ${missingFields.join(', ')}`);
    }

    // Generate UUID
    const uid = crypto.randomUUID();

    // Build payment request object
    // Based on original SkipCash example code, both request body and signature use PascalCase
    const paymentRequest: any = {
      Uid: uid,
      KeyId: skipCashConfig.keyId,
      Amount: paymentDetails.amount.toString(),
      FirstName: paymentDetails.firstName,
      LastName: paymentDetails.lastName,
      Phone: paymentDetails.phone,
      Email: paymentDetails.email,
      Street: paymentDetails.street || '',
      City: paymentDetails.city || '',
      State: paymentDetails.state || '',
      Country: paymentDetails.country || '',
      PostalCode: paymentDetails.postalCode || '',
      TransactionId: paymentDetails.transactionId,
      Custom1: paymentDetails.custom1 || '',
    };
    
    // Add optional fields if provided (these are NOT included in signature calculation)
    if (paymentDetails.subject) {
      paymentRequest.Subject = paymentDetails.subject;
    }
    if (paymentDetails.description) {
      paymentRequest.Description = paymentDetails.description;
    }
    if (paymentDetails.returnUrl) {
      paymentRequest.ReturnUrl = paymentDetails.returnUrl;
    }
    if (paymentDetails.webhookUrl) {
      paymentRequest.WebhookUrl = paymentDetails.webhookUrl;
    }
    if (paymentDetails.onlyDebitCard !== undefined) {
      paymentRequest.OnlyDebitCard = paymentDetails.onlyDebitCard;
    }
    
    // Log the exact payment request being sent
    console.log('Payment request being sent to SkipCash:', JSON.stringify(paymentRequest, null, 2));

    // Build combined data string for hashing
    // CRITICAL: Only include NON-EMPTY fields in the signature!
    // Required fields (always included): Uid, KeyId, Amount, FirstName, LastName, Phone, Email
    // Optional fields (only if not empty): TransactionId, Custom1
    // Address fields (Street, City, State, Country, PostalCode) are NOT included in signature if empty
    
    const signatureParts: string[] = [
      `Uid=${paymentRequest.Uid}`,
      `KeyId=${paymentRequest.KeyId}`,
      `Amount=${paymentRequest.Amount}`,
      `FirstName=${paymentRequest.FirstName}`,
      `LastName=${paymentRequest.LastName}`,
      `Phone=${paymentRequest.Phone}`,
      `Email=${paymentRequest.Email}`,
    ];
    
    // Only add optional fields if they're not empty
    if (paymentRequest.TransactionId && paymentRequest.TransactionId.trim() !== '') {
      signatureParts.push(`TransactionId=${paymentRequest.TransactionId}`);
    }
    
    if (paymentRequest.Custom1 && paymentRequest.Custom1.trim() !== '') {
      signatureParts.push(`Custom1=${paymentRequest.Custom1}`);
    }
    
    const combinedData = signatureParts.join(',');
    
    console.log('Combined data for signature (only non-empty fields):', combinedData);
    console.log('Fields included:', {
      required: ['Uid', 'KeyId', 'Amount', 'FirstName', 'LastName', 'Phone', 'Email'],
      optional: {
        TransactionId: !!paymentRequest.TransactionId && paymentRequest.TransactionId.trim() !== '',
        Custom1: !!paymentRequest.Custom1 && paymentRequest.Custom1.trim() !== '',
      },
    });

    // Validate secret key is complete (should be ~600+ characters for base64)
    if (skipCashConfig.secretKey.length < 500) {
      console.error('WARNING: Secret key seems incomplete. Length:', skipCashConfig.secretKey.length);
      console.error('Secret key starts with:', skipCashConfig.secretKey.substring(0, 50));
      console.error('Secret key ends with:', skipCashConfig.secretKey.substring(skipCashConfig.secretKey.length - 10));
    }
    
    console.log('Combined data for signature:', combinedData);
    console.log('Using KeyId:', paymentRequest.KeyId);
    console.log('Secret key length:', skipCashConfig.secretKey.length);
    console.log('Secret key starts with:', skipCashConfig.secretKey.substring(0, 20) + '...');
    console.log('Secret key ends with:', '...' + skipCashConfig.secretKey.substring(skipCashConfig.secretKey.length - 10));

    // Generate HMAC SHA256 hash
    // Use secret key as UTF-8 string (matches crypto-js HmacSHA256 behavior)
    // crypto-js.HmacSHA256(combinedData, secretKey) treats secretKey as UTF-8 string
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
    
    // Convert signature to base64 (matches crypto-js.enc.Base64.stringify)
    const signatureArray = new Uint8Array(signature);
    const hashInBase64 = btoa(String.fromCharCode(...signatureArray));
    
    console.log('Signature calculation:', {
      combinedDataLength: combinedData.length,
      secretKeyLength: skipCashConfig.secretKey.length,
      signatureLength: hashInBase64.length,
      signaturePreview: hashInBase64.substring(0, 30) + '...',
    });

    // Make API call to SkipCash
    const apiUrl = skipCashConfig.useSandbox 
      ? skipCashConfig.sandboxURL 
      : skipCashConfig.productionURL;

    console.log('Sending request to SkipCash:', {
      url: `${apiUrl}/api/v1/payments`,
      method: 'POST',
      hasAuthorization: !!hashInBase64,
      authorizationLength: hashInBase64.length,
      authorizationPreview: hashInBase64.substring(0, 20) + '...',
    });

    // SkipCash expects Authorization header with the base64 signature
    // Based on original example: headers: { Authorization: hashInBase64 }
    const requestHeaders: HeadersInit = {
      'Authorization': hashInBase64,
      'Content-Type': 'application/json',
    };
    
    console.log('Request headers:', {
      'Authorization': hashInBase64.substring(0, 20) + '... (length: ' + hashInBase64.length + ')',
      'Content-Type': 'application/json',
    });

    const response = await fetch(`${apiUrl}/api/v1/payments`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(paymentRequest),
    });
    
    console.log('Response status:', response.status, response.statusText);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    let json;
    try {
      json = await response.json();
      console.log('SkipCash API response:', JSON.stringify(json, null, 2));
    } catch (e) {
      const text = await response.text();
      console.error('Failed to parse SkipCash response:', text);
      throw new Error(`SkipCash API returned invalid response: ${response.status} ${response.statusText}`);
    }

    if (!response.ok) {
      console.error('SkipCash API error:', {
        status: response.status,
        statusText: response.statusText,
        body: json,
      });
      throw new Error(json?.message || json?.error || `Payment request failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('SkipCash payment request successful:', {
      paymentId: json.resultObj?.paymentId,
      hasPaymentUrl: !!json.resultObj?.paymentUrl,
    });

    // Create payment transaction record in database
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

    // Extract application ID from custom1 if available
    let applicationId: string | null = null;
    if (paymentDetails.custom1) {
      try {
        const customData = JSON.parse(paymentDetails.custom1);
        applicationId = customData.applicationId || null;
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Create payment transaction record
    if (applicationId) {
      try {
        const { error: insertError } = await supabaseClient
          .from('payment_transactions')
          .insert({
            application_id: applicationId,
            amount: paymentDetails.amount,
            method: 'card',
            status: 'pending',
            transaction_id: paymentDetails.transactionId,
          });
        
        if (insertError) {
          console.error('Failed to create payment transaction record:', insertError);
          // Don't fail the request if DB insert fails
        }
      } catch (err) {
        console.error('Error creating payment transaction record:', err);
        // Don't fail the request if DB insert fails
      }
    }

    // SkipCash returns: resultObj.payUrl and resultObj.id
    // Map to our expected format for frontend compatibility
    const resultObj = json.resultObj || {};
    const paymentResponse = {
      resultObj: {
        ...resultObj,
        // Map SkipCash field names to our expected format
        paymentUrl: resultObj.payUrl || resultObj.paymentUrl,
        paymentId: resultObj.id || resultObj.paymentId,
        // Keep original fields too
        payUrl: resultObj.payUrl,
        id: resultObj.id,
      },
      returnCode: json.returnCode,
      errorCode: json.errorCode,
      errorMessage: json.errorMessage,
      hasError: json.hasError,
    };

    console.log('Formatted payment response:', {
      hasPaymentUrl: !!paymentResponse.resultObj.paymentUrl,
      hasPayUrl: !!paymentResponse.resultObj.payUrl,
      paymentId: paymentResponse.resultObj.paymentId,
      id: paymentResponse.resultObj.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: paymentResponse.resultObj,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('SkipCash payment error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Return more detailed error for debugging
    const errorMessage = error.message || 'Payment processing failed';
    console.error('Returning error response:', errorMessage);
    const errorDetails = {
      success: false,
      error: errorMessage,
      details: process.env.DENO_ENV === 'development' ? {
        stack: error.stack,
        name: error.name,
      } : undefined,
    };
    
    return new Response(
      JSON.stringify(errorDetails),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

