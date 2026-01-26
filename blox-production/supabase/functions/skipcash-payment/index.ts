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
    // ============================================
    // Auth + payment permission gate (company-based)
    // ============================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    const authedUser = userData?.user;

    if (userError || !authedUser?.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // We may need to inspect request body to enforce application-based permissions.
    // IMPORTANT: req.text() can only be read once, so we store it here for reuse.
    let rawBodyText = '';
    let parsedBody: any = null;
    let applicationId: string | null = null; // Declare here for broader scope

    // ============================================
    // Payment permission gate (application-based)
    // ============================================
    // Single source of truth:
    // - If request has applicationId (custom1 JSON), use current_user_can_pay_for_application(appId)
    // - Otherwise (e.g. credit top-ups), use current_user_can_pay_for_any_application()
    try {
      // Parse request early so we can enforce application-based permissions.
      try {
        rawBodyText = await req.text();
      } catch {
        rawBodyText = '';
      }

      try {
        parsedBody = rawBodyText ? JSON.parse(rawBodyText) : null;
      } catch {
        parsedBody = null;
      }

      // Extract applicationId from custom1 JSON (if present)
      applicationId = null; // Reset before parsing
      const custom1 = parsedBody?.custom1;
      if (typeof custom1 === 'string' && custom1.trim()) {
        try {
          const customObj = JSON.parse(custom1);
          applicationId = customObj?.applicationId || null;
        } catch {
          applicationId = null;
        }
      }

      const { data: profile } = await authClient
        .from('users')
        .select('role')
        .eq('id', authedUser.id)
        .maybeSingle();

      const role = (profile as any)?.role as string | undefined;
      if (role !== 'admin') {
        // #region agent log
        console.log('[DEBUG] Starting payment permission check', { userId: authedUser.id, email: authedUser.email, role, applicationId });
        // #endregion
        
        // RATE LIMITING: Prevent spam/abuse (max 3 payment initiations per minute)
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        
        // #region agent log
        console.log('[DEBUG] Checking rate limit', { oneMinuteAgo });
        // #endregion
        
        const { data: recentPayments, error: rateLimitError } = await authClient
          .from('rate_limit_log')
          .select('id')
          .eq('user_id', authedUser.id)
          .eq('endpoint', 'skipcash-payment')
          .gte('created_at', oneMinuteAgo);

        // #region agent log
        console.log('[DEBUG] Rate limit check result', { recentPaymentsCount: recentPayments?.length, rateLimitError: rateLimitError?.message });
        // #endregion

        if (!rateLimitError && recentPayments && recentPayments.length >= 3) {
          console.warn('Rate limit exceeded', {
            userId: authedUser.id,
            email: authedUser.email,
            attempts: recentPayments.length,
          });
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Too many payment requests. Please wait a minute before trying again.',
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log this request for rate limiting
        // #region agent log
        console.log('[DEBUG] Logging rate limit entry');
        // #endregion
        
        try {
          await authClient.from('rate_limit_log').insert({
            user_id: authedUser.id,
            user_email: authedUser.email || '',
            endpoint: 'skipcash-payment',
            created_at: new Date().toISOString(),
          });
        } catch (err) {
          // Don't fail payment if rate limit logging fails
          console.warn('Failed to log rate limit entry:', err);
        }

        const rpcName = applicationId
          ? 'current_user_can_pay_for_application'
          : 'current_user_can_pay_for_any_application';
        const rpcArgs = applicationId ? { p_application_id: applicationId } : {};

        // #region agent log
        console.log('[DEBUG] Calling payment permission RPC', { rpcName, rpcArgs, userEmail: authedUser.email });
        // #endregion

        const { data: canPay, error: canPayError } = await authClient.rpc(rpcName as any, rpcArgs as any);

        // #region agent log
        console.log('[DEBUG] RPC result', { rpcName, canPay, canPayError: canPayError?.message, canPayErrorDetails: canPayError });
        // #endregion

        if (canPayError) {
          console.error(`Error calling ${rpcName}():`, canPayError);
          return new Response(
            JSON.stringify({
              success: false,
              error: `Payment authorization check failed: ${canPayError.message || 'RPC error'}`,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!canPay) {
          return new Response(
            JSON.stringify({
              success: false,
              error: applicationId
                ? 'Payments are disabled for this application (company not assigned / canPay disabled / inactive).'
                : 'Payments are disabled (no payable application/company found for this user).',
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (e) {
      // #region agent log
      console.error('[DEBUG] Payment permission gate exception caught', {
        errorMessage: (e as any)?.message,
        errorName: (e as any)?.name,
        errorCode: (e as any)?.code,
        errorDetails: (e as any)?.details,
        errorHint: (e as any)?.hint,
        fullError: e,
      });
      // #endregion
      
      console.error('Payment permission gate failed:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Payment authorization check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      // If we already parsed the body for permissions, reuse it.
      // Otherwise, read and parse now.
      const bodyText = (typeof rawBodyText === 'string' && rawBodyText.length > 0)
        ? rawBodyText
        : await req.text();
      console.log('Raw request body:', bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Request body is empty');
      }
      
      paymentDetails = parsedBody ? parsedBody : JSON.parse(bodyText);
      // Log payment request (with PII redaction for privacy/GDPR compliance)
      console.log('Received payment details:', {
        amount: paymentDetails.amount,
        firstName: paymentDetails.firstName ? paymentDetails.firstName.substring(0, 1) + '***' : '',
        lastName: paymentDetails.lastName ? paymentDetails.lastName.substring(0, 1) + '***' : '',
        phone: paymentDetails.phone ? paymentDetails.phone.substring(0, 3) + '***' + paymentDetails.phone.substring(paymentDetails.phone.length - 2) : '',
        email: paymentDetails.email ? paymentDetails.email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '',
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

    // SERVER-SIDE PRICE VALIDATION: Prevent price tampering for credit top-ups
    const EXPECTED_CREDIT_PRICE_QAR = 1; // Must match frontend constant
    if (applicationId === null && parsedBody?.custom1) {
      try {
        const customObj = JSON.parse(parsedBody.custom1);
        if (customObj.type === 'credit_topup' && customObj.credits) {
          const expectedTotal = customObj.credits * EXPECTED_CREDIT_PRICE_QAR;
          const actualTotal = paymentDetails.amount;
          // Allow 0.01 QAR tolerance for floating point rounding
          if (Math.abs(actualTotal - expectedTotal) > 0.01) {
            console.error('Credit price mismatch detected', {
              credits: customObj.credits,
              expectedTotal,
              actualTotal,
              difference: actualTotal - expectedTotal,
            });
            throw new Error(`Price validation failed: expected ${expectedTotal} QAR for ${customObj.credits} credits, got ${actualTotal} QAR`);
          }
        }
      } catch (e: any) {
        if (e.message.includes('Price validation failed')) {
          throw e; // Re-throw validation errors
        }
        // Ignore JSON parse errors (custom1 might not be JSON)
      }
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
    
    // Log payment request structure (redact PII)
    console.log('Payment request being sent to SkipCash:', {
      Uid: paymentRequest.Uid,
      KeyId: paymentRequest.KeyId.substring(0, 10) + '***',
      Amount: paymentRequest.Amount,
      FirstName: paymentRequest.FirstName ? paymentRequest.FirstName.substring(0, 1) + '***' : '',
      LastName: paymentRequest.LastName ? paymentRequest.LastName.substring(0, 1) + '***' : '',
      Phone: paymentRequest.Phone ? '***' + paymentRequest.Phone.substring(paymentRequest.Phone.length - 4) : '',
      Email: paymentRequest.Email ? paymentRequest.Email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '',
      TransactionId: paymentRequest.TransactionId,
      hasCustom1: !!paymentRequest.Custom1,
      hasReturnUrl: !!paymentRequest.ReturnUrl,
    });

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
    
    // SkipCash uses 'id' and 'payUrl', not 'paymentId' and 'paymentUrl'
    console.log('SkipCash payment request successful:', {
      paymentId: json.resultObj?.id || json.resultObj?.paymentId,
      hasPaymentUrl: !!(json.resultObj?.payUrl || json.resultObj?.paymentUrl),
      status: json.resultObj?.status,
      statusId: json.resultObj?.statusId,
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

    // Extract application ID from custom1 if available (reuse already declared applicationId)
    // applicationId is already declared at the top of the function
    if (paymentDetails.custom1) {
      try {
        const customData = JSON.parse(paymentDetails.custom1);
        applicationId = customData.applicationId || null;
      } catch (e) {
        // Ignore parsing errors
        applicationId = null;
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

