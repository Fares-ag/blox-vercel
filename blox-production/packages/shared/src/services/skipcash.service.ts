import type { ApiResponse } from '../models/api.model';
import { supabase } from './supabase.service';

export interface SkipCashPaymentRequest {
  amount: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  transactionId: string;
  street?: string; // required for US, UK, and Canada cards only
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  custom1?: string;
  // Optional SkipCash fields
  subject?: string; // Text displayed on payment page
  description?: string; // Text displayed on payment page
  returnUrl?: string; // URL to redirect after payment completion
  webhookUrl?: string; // Override webhook URL (optional, uses dashboard default if not provided)
  onlyDebitCard?: boolean; // Force QPAY/Debit card flow
}

export interface SkipCashPaymentResponse {
  // Edge Function returns data directly (not wrapped in resultObj)
  paymentUrl?: string;
  payUrl?: string;
  paymentId?: string;
  id?: string;
  status?: string;
  // Also support nested structure for compatibility
  resultObj?: {
    paymentUrl?: string;
    payUrl?: string;
    paymentId?: string;
    id?: string;
    status?: string;
    [key: string]: any;
  };
  error?: string;
  message?: string;
  [key: string]: any;
}

export interface SkipCashVerifyRequest {
  paymentId: string;
  transactionId?: string;
}

class SkipCashService {
  /**
   * Process payment through SkipCash gateway
   * This calls the Supabase Edge Function which securely handles the payment
   */
  async processPayment(
    paymentDetails: SkipCashPaymentRequest
  ): Promise<ApiResponse<SkipCashPaymentResponse>> {
    try {
      const { data, error } = await supabase.functions.invoke('skipcash-payment', {
        body: paymentDetails,
      });

      if (error) {
        return {
          status: 'ERROR',
          message: error.message || 'Failed to process payment',
          data: null as any,
        };
      }

      if (data?.success === false) {
        return {
          status: 'ERROR',
          message: data.error || 'Payment processing failed',
          data: null as any,
        };
      }

      return {
        status: 'SUCCESS',
        data: data?.data as SkipCashPaymentResponse,
        message: 'Payment request generated successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to process payment',
        data: null as any,
      };
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(
    verifyRequest: SkipCashVerifyRequest
  ): Promise<ApiResponse<any>> {
    try {
      console.log('Calling skipcash-verify with:', verifyRequest);
      
      const { data, error } = await supabase.functions.invoke('skipcash-verify', {
        body: verifyRequest,
      });

      // Log both data and error to see what we get
      console.log('skipcash-verify response - data:', data);
      console.log('skipcash-verify response - error:', error);
      console.log('skipcash-verify error type:', error?.constructor?.name);
      console.log('skipcash-verify error keys:', error ? Object.keys(error) : 'no error');
      
      // Check if data exists first (Supabase client might populate data even with error status)
      if (data) {
        if (data.success === false || data.error) {
          const errorMessage = data.error || 'Payment verification failed';
          console.error('Payment verification failed (from data):', errorMessage, data);
          return {
            status: 'ERROR',
            message: errorMessage,
            data: data.details || null,
          };
        }

        // Success response
        return {
          status: 'SUCCESS',
          data: data.data || data,
          message: 'Payment verified successfully',
        };
      }

      // If there's an error, try to extract the message
      if (error) {
        console.error('Supabase function invocation error - full error object:', error);
        
        // Try multiple ways to extract error message
        let errorMessage = 'Failed to verify payment';
        
        // Check if error has message or other properties directly
        if (error.message) {
          errorMessage = error.message;
          console.log('Using error.message directly:', errorMessage);
        }
        
        // Check error.context for Response object (FunctionsHttpError pattern)
        const errorAny = error as any;
        
        // Check for data property on error itself (some Supabase versions might store parsed body here)
        if (errorMessage === 'Failed to verify payment' && errorAny.data) {
          console.log('Found data property on error object:', errorAny.data);
          if (errorAny.data.error || errorAny.data.message) {
            errorMessage = errorAny.data.error || errorAny.data.message;
            console.log('Extracted error message from error.data:', errorMessage);
          }
        }
        if (errorAny.context) {
          console.log('Error context:', errorAny.context);
          console.log('Error context type:', typeof errorAny.context);
          console.log('Error context constructor:', errorAny.context.constructor?.name);
          console.log('Error context has json method:', typeof errorAny.context.json === 'function');
          console.log('Error context has text method:', typeof errorAny.context.text === 'function');
          console.log('Error context has bodyUsed:', errorAny.context.bodyUsed);
          
          // Check if context has a Response object or response methods
          const responseObj = errorAny.context;
          const isResponse = responseObj instanceof Response || 
                            (responseObj && typeof responseObj.json === 'function') ||
                            (responseObj && typeof responseObj.text === 'function');
          
          // Log Response properties
          if (isResponse) {
            console.log('Response status:', responseObj.status);
            console.log('Response statusText:', responseObj.statusText);
            console.log('Response bodyUsed:', responseObj.bodyUsed);
          }
          
          // Try to read response body
          if (isResponse) {
            let responseBody: any = null;
            const bodyUsed = responseObj.bodyUsed === true;
            
            console.log('Attempting to read response body, bodyUsed:', bodyUsed);
            
            // Strategy: Try to clone first if body not used (clone before consuming)
            // If body is already used, we can't read it, so skip to status-based message
            if (!bodyUsed) {
              try {
                // Clone first to preserve original
                const clonedResponse = responseObj.clone();
                responseBody = await clonedResponse.json();
                console.log('Successfully extracted response body (via clone):', responseBody);
              } catch (cloneError: any) {
                console.log('Clone + json() failed:', cloneError?.message);
                // Try direct read as fallback
                try {
                  responseBody = await responseObj.json();
                  console.log('Successfully extracted response body (direct read):', responseBody);
                } catch (directError: any) {
                  console.log('Direct read also failed:', directError?.message);
                  // Try as text
                  try {
                    const clonedForText = responseObj.clone();
                    const text = await clonedForText.text();
                    console.log('Response text:', text);
                    try {
                      responseBody = JSON.parse(text);
                    } catch (parseError) {
                      // Use text as error message
                      errorMessage = text || `Payment verification failed (${responseObj.status})`;
                    }
                  } catch (textError: any) {
                    console.error('Text read failed:', textError?.message);
                    errorMessage = `Payment verification failed (HTTP ${responseObj.status}: ${responseObj.statusText || 'Bad Request'})`;
                  }
                }
              }
            } else {
              console.log('Response body already consumed, cannot read. Using status-based error message.');
              errorMessage = `Payment verification failed (HTTP ${responseObj.status}: ${responseObj.statusText || 'Bad Request'})`;
            }
            
            // Extract error message from response body
            if (responseBody) {
              if (responseBody.error) {
                if (typeof responseBody.error === 'string') {
                  errorMessage = responseBody.error;
                  // Check for [object Object] string (common issue when objects are converted incorrectly)
                  if (errorMessage === '[object Object]' || errorMessage.includes('[object Object]')) {
                    // Try to extract from responseBody.details if available
                    if (responseBody.details && responseBody.details.originalError) {
                      errorMessage = responseBody.details.originalError;
                    } else {
                      errorMessage = 'Payment verification failed. Please check payment status or try again.';
                    }
                  }
                } else if (typeof responseBody.error === 'object' && responseBody.error !== null) {
                  // Error is an object, try to extract message or stringify it
                  errorMessage = responseBody.error.message || 
                               responseBody.error.error || 
                               responseBody.error.errorMessage ||
                               JSON.stringify(responseBody.error);
                } else {
                  errorMessage = String(responseBody.error);
                  if (errorMessage === '[object Object]') {
                    errorMessage = 'Payment verification failed. Please check payment status or try again.';
                  }
                }
              } else if (responseBody.message) {
                errorMessage = typeof responseBody.message === 'string' 
                  ? responseBody.message 
                  : JSON.stringify(responseBody.message);
              }
              
              // Final check for [object Object]
              if (errorMessage === '[object Object]' || errorMessage.includes('[object Object]')) {
                errorMessage = `Payment verification failed (HTTP ${responseObj.status}). Please check payment status or contact support.`;
              }
              
              console.log('Final extracted error message from response body:', errorMessage);
            } else if (!bodyUsed) {
              // If we couldn't read the body but it's not consumed, something else went wrong
              errorMessage = `Payment verification failed (HTTP ${responseObj.status}: Could not read response body)`;
            }
          }
          
          // Try to get body from context properties (non-Response object)
          if (errorMessage === 'Failed to verify payment' && errorAny.context.body) {
            try {
              const body = typeof errorAny.context.body === 'string' 
                ? JSON.parse(errorAny.context.body)
                : errorAny.context.body;
              if (body.error || body.message) {
                errorMessage = body.error || body.message;
                console.log('Extracted error message from context.body:', errorMessage);
              }
            } catch (e) {
              console.error('Failed to parse context.body:', e);
            }
          }
          
          // Check for data property (some Supabase versions might use this)
          if (errorMessage === 'Failed to verify payment' && errorAny.context.data) {
            const contextData = errorAny.context.data;
            if (typeof contextData === 'string') {
              try {
                const parsed = JSON.parse(contextData);
                if (parsed.error || parsed.message) {
                  errorMessage = parsed.error || parsed.message;
                }
              } catch (e) {
                // Ignore parse errors
              }
            } else if (contextData.error || contextData.message) {
              errorMessage = contextData.error || contextData.message;
            }
          }
        }
        
        // Fallback: use error.message if available
        if (error.message && errorMessage === 'Failed to verify payment') {
          errorMessage = error.message;
        }
        
        return {
          status: 'ERROR',
          message: errorMessage,
          data: null,
        };
      }

      // No data and no error (shouldn't happen)
      return {
        status: 'ERROR',
        message: 'Unexpected response from payment verification service',
        data: null,
      };
    } catch (error: any) {
      console.error('Payment verification exception:', error);
      return {
        status: 'ERROR',
        message: error.message || 'Failed to verify payment',
        data: null,
      };
    }
  }

  /**
   * Handle payment webhook callback
   * This should be called from your webhook endpoint
   */
  async handleWebhook(webhookData: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase.functions.invoke('skipcash-webhook', {
        body: webhookData,
      });

      if (error) {
        return {
          status: 'ERROR',
          message: error.message || 'Failed to process webhook',
          data: null,
        };
      }

      return {
        status: 'SUCCESS',
        data: data?.data,
        message: 'Webhook processed successfully',
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: error.message || 'Failed to process webhook',
        data: null,
      };
    }
  }
}

export const skipCashService = new SkipCashService();

