import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, ArrowBack, Refresh } from '@mui/icons-material';
import { formatCurrency } from '@shared/utils/formatters';
import { Button as CustomButton, Loading } from '@shared/components';
import { skipCashService, supabase } from '@shared/services';
import { toast } from 'react-toastify';
import { useCredits } from '../../../../hooks/useCredits';
import { useAppSelector } from '../../../../store/hooks';
import './CreditTopUpCallbackPage.scss';

export const CreditTopUpCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  const creditsParam = searchParams.get('credits');
  const { user } = useAppSelector((state: { auth: { user: any } }) => state.auth);
  const { refreshCredits } = useCredits();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    if (transactionId) {
      verifyPayment();
    } else {
      setError('Transaction ID is missing');
      setStatus('failed');
      setVerifying(false);
    }
  }, [transactionId]);

  const verifyPayment = async () => {
    if (!transactionId) return;

    try {
      setVerifying(true);
      setError(null);

      // Get credits and paymentId from URL param or localStorage
      const creditsFromUrl = creditsParam ? parseInt(creditsParam, 10) : null;
      const pendingDataKey = `pending_credit_topup_${transactionId}`;
      const pendingDataStr = localStorage.getItem(pendingDataKey);
      
      let creditsToAdd = creditsFromUrl || 0;
      let paymentId: string | null = null;
      
      if (pendingDataStr) {
        try {
          const pendingData = JSON.parse(pendingDataStr);
          creditsToAdd = pendingData.credits || creditsToAdd || 0;
          paymentId = pendingData.paymentId || null; // Get SkipCash paymentId from stored data
        } catch (e) {
          console.error('Failed to parse pending data:', e);
        }
      }

      if (!paymentId) {
        throw new Error('Payment ID not found. Please try the top-up again.');
      }

      console.log('Verifying payment:', { transactionId, paymentId, creditsToAdd });

      // SkipCash doesn't support direct API verification (returns 403 Forbidden)
      // Instead, we rely on webhooks for payment status updates
      // For now, check URL parameters for payment status (SkipCash might include it in return URL)
      const urlParams = new URLSearchParams(window.location.search);
      const statusParam = urlParams.get('status');
      const statusIdParam = urlParams.get('statusId');
      
      // If SkipCash returned status in URL, use it
      if (statusParam || statusIdParam) {
        const statusId = statusIdParam ? parseInt(statusIdParam, 10) : null;
        
        if (statusId === 2 || statusParam === 'paid' || statusParam === 'completed') {
          setStatus('success');
          setCredits(creditsToAdd);

          // Claim credits using customer-safe RPC
          if (creditsToAdd > 0 && user?.email) {
            try {
              const { data: claimResult, error: claimError } = await supabase
                .rpc('customer_claim_payment_credits', {
                  p_transaction_id: transactionId
                });

              if (claimError) {
                console.error('Failed to claim credits:', claimError);
                toast.warning('Payment successful but failed to add credits. Please contact support.');
              } else if (claimResult && claimResult.length > 0 && claimResult[0].success) {
                // Credits added successfully
                await refreshCredits();
                localStorage.removeItem(pendingDataKey);
                window.dispatchEvent(new CustomEvent('bloxCreditsUpdated'));
                localStorage.setItem('blox_credits_updated', Date.now().toString());
                toast.success(`Successfully added ${claimResult[0].credits_added} credit${claimResult[0].credits_added > 1 ? 's' : ''} to your account!`);
              } else {
                const errorMsg = claimResult && claimResult.length > 0 ? claimResult[0].message : 'Unknown error';
                console.error('Failed to claim credits:', errorMsg);
                toast.warning(`Payment successful but: ${errorMsg}. Please contact support if credits don't appear.`);
              }
            } catch (err: any) {
              console.error('Failed to claim credits:', err);
              toast.warning('Payment successful but failed to update credits. Please contact support.');
            }
          } else {
            localStorage.removeItem(pendingDataKey);
          }
          return; // Exit early
        } else if (statusId === 3 || statusParam === 'canceled' || statusParam === 'cancelled') {
          setStatus('failed');
          setError('Payment was canceled');
          localStorage.removeItem(pendingDataKey);
          return;
        } else if (statusId === 4 || statusId === 5 || statusParam === 'failed' || statusParam === 'rejected') {
          setStatus('failed');
          setError('Payment failed');
          localStorage.removeItem(pendingDataKey);
          return;
        }
      }
      
      // Try API verification as fallback (may fail with 403, which is expected)
      // This is mainly for cases where SkipCash might support it in the future
      try {
        const result = await skipCashService.verifyPayment({
          paymentId: paymentId,
          transactionId: transactionId,
        });

        if (result.status === 'SUCCESS' && result.data) {
          const paymentStatus = result.data.status || result.data.statusId;
          
          // Map SkipCash status to our status
          // StatusId: 0=new, 1=pending, 2=paid, 3=canceled, 4=failed, 5=rejected
          if (paymentStatus === 2 || paymentStatus === 'paid' || paymentStatus === 'completed') {
            setStatus('success');
            setPaymentData(result.data);
            setCredits(creditsToAdd);

            // Claim credits using customer-safe RPC
            if (creditsToAdd > 0 && user?.email) {
              try {
                const { data: claimResult, error: claimError } = await supabase
                  .rpc('customer_claim_payment_credits', {
                    p_transaction_id: transactionId
                  });

                if (claimError) {
                  console.error('Failed to claim credits:', claimError);
                  toast.warning('Payment successful but failed to add credits. Please contact support.');
                } else if (claimResult && claimResult.length > 0 && claimResult[0].success) {
                  // Credits added successfully
                  await refreshCredits();
                  localStorage.removeItem(pendingDataKey);
                  window.dispatchEvent(new CustomEvent('bloxCreditsUpdated'));
                  localStorage.setItem('blox_credits_updated', Date.now().toString());
                  toast.success(`Successfully added ${claimResult[0].credits_added} credit${claimResult[0].credits_added > 1 ? 's' : ''} to your account!`);
                } else {
                  const errorMsg = claimResult && claimResult.length > 0 ? claimResult[0].message : 'Unknown error';
                  console.error('Failed to claim credits:', errorMsg);
                  toast.warning(`Payment successful but: ${errorMsg}. Please contact support if credits don't appear.`);
                }
              } catch (err: any) {
                console.error('Failed to claim credits:', err);
                toast.warning('Payment successful but failed to update credits. Please contact support.');
              }
            } else {
              localStorage.removeItem(pendingDataKey);
            }
            return;
          } else if (paymentStatus === 3 || paymentStatus === 'canceled' || paymentStatus === 'cancelled') {
            setStatus('failed');
            setError('Payment was canceled');
            localStorage.removeItem(pendingDataKey);
            return;
          } else if (paymentStatus === 4 || paymentStatus === 5 || paymentStatus === 'failed' || paymentStatus === 'rejected') {
            setStatus('failed');
            setError(result.data.errorMessage || 'Payment failed');
            localStorage.removeItem(pendingDataKey);
            return;
          }
        }
      } catch (apiError: any) {
        console.log('API verification not available (expected for SkipCash):', apiError.message);
        // Continue to pending state - webhook will update status
      }
      
      // Default: Treat as pending (SkipCash uses webhooks, not API polling)
      // The 403 Forbidden error is expected - SkipCash doesn't support direct API verification
      // Payment status will be updated via webhook
      setStatus('pending');
      setCredits(creditsToAdd);
      setError(null); // Clear error - 403 is expected behavior for SkipCash
      
      // Note: Credit top-ups are processed via webhook, but webhook handler may not update localStorage
      // User should check their credits balance after payment completes
    } catch (err: any) {
      console.error('Payment verification error:', err);
      setError(err.message || 'Failed to verify payment status');
      setStatus('failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleRetry = () => {
    verifyPayment();
  };

  const handleBackToDashboard = () => {
    navigate('/customer/dashboard');
  };

  if (verifying && status === 'loading') {
    return (
      <Box className="credit-topup-callback-page">
        <Paper className="callback-card">
          <Box className="loading-container">
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2, color: 'var(--primary-text)' }}>
              Verifying Payment...
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'var(--secondary-text)' }}>
              Please wait while we verify your payment status.
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box className="credit-topup-callback-page">
      <Paper className="callback-card">
        {status === 'success' && (
          <>
            <Box className="success-icon status-icon">
              <CheckCircle sx={{ fontSize: 80, color: '#4CAF50' }} />
            </Box>
            <Typography variant="h4" className="success-title" sx={{ color: 'var(--primary-text)', fontWeight: 700 }}>
              Top Up Successful!
            </Typography>
            <Typography variant="body1" className="success-message" sx={{ color: 'var(--secondary-text)', mt: 1 }}>
              {credits > 0 
                ? `Your account has been credited with ${credits} Blox Credits.`
                : 'Your payment has been processed successfully.'}
            </Typography>

            {paymentData && (
              <Box className="transaction-details" sx={{ mt: 3 }}>
                <Box className="detail-row">
                  <Typography variant="body2" className="label" sx={{ color: 'var(--secondary-text)' }}>
                    Transaction ID:
                  </Typography>
                  <Typography variant="body1" className="value" sx={{ color: 'var(--primary-text)', fontWeight: 600 }}>
                    {transactionId || 'N/A'}
                  </Typography>
                </Box>
                {credits > 0 && (
                  <Box className="detail-row">
                    <Typography variant="body2" className="label" sx={{ color: 'var(--secondary-text)' }}>
                      Credits Added:
                    </Typography>
                    <Typography variant="h6" className="amount" sx={{ color: 'var(--primary-text)', fontWeight: 700 }}>
                      {credits} Credits
                    </Typography>
                  </Box>
                )}
                {paymentData.amount && (
                  <Box className="detail-row">
                    <Typography variant="body2" className="label" sx={{ color: 'var(--secondary-text)' }}>
                      Amount Paid:
                    </Typography>
                    <Typography variant="h6" className="amount" sx={{ color: 'var(--primary-text)', fontWeight: 700 }}>
                      {formatCurrency(parseFloat(paymentData.amount))}
                    </Typography>
                  </Box>
                )}
                <Box className="detail-row">
                  <Typography variant="body2" className="label" sx={{ color: 'var(--secondary-text)' }}>
                    Date:
                  </Typography>
                  <Typography variant="body1" className="value" sx={{ color: 'var(--primary-text)' }}>
                    {new Date().toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box className="action-buttons" sx={{ mt: 4 }}>
              <CustomButton
                variant="primary"
                onClick={handleBackToDashboard}
              >
                Back to Dashboard
              </CustomButton>
            </Box>
          </>
        )}

        {status === 'failed' && (
          <>
            <Box className="error-icon status-icon">
              <ErrorIcon sx={{ fontSize: 80, color: '#F44336' }} />
            </Box>
            <Typography variant="h4" className="error-title" sx={{ color: 'var(--primary-text)', fontWeight: 700 }}>
              Payment Failed
            </Typography>
            <Typography variant="body1" className="error-message" sx={{ color: 'var(--secondary-text)', mt: 1 }}>
              {error || 'Your payment could not be processed. Please try again.'}
            </Typography>

            {transactionId && (
              <Box className="transaction-details" sx={{ mt: 3 }}>
                <Box className="detail-row">
                  <Typography variant="body2" className="label" sx={{ color: 'var(--secondary-text)' }}>
                    Transaction ID:
                  </Typography>
                  <Typography variant="body1" className="value" sx={{ color: 'var(--primary-text)' }}>
                    {transactionId}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box className="action-buttons" sx={{ mt: 4 }}>
              <CustomButton
                variant="primary"
                startIcon={<Refresh />}
                onClick={handleRetry}
              >
                Verify Again
              </CustomButton>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handleBackToDashboard}
                sx={{ ml: 2 }}
              >
                Back to Dashboard
              </Button>
            </Box>
          </>
        )}

        {status === 'pending' && (
          <>
            <Box className="loading-container">
              <CircularProgress size={60} />
            </Box>
            <Typography variant="h4" className="pending-title" sx={{ color: 'var(--primary-text)', fontWeight: 700, mt: 2 }}>
              Payment Processing
            </Typography>
            <Typography variant="body1" className="pending-message" sx={{ color: 'var(--secondary-text)', mt: 1 }}>
              {error || 'Your payment is being processed. If payment was successful, your credits will be added automatically within a few moments. Please check your credits balance or refresh this page.'}
            </Typography>

            {transactionId && (
              <Box className="transaction-details" sx={{ mt: 3 }}>
                <Box className="detail-row">
                  <Typography variant="body2" className="label" sx={{ color: 'var(--secondary-text)' }}>
                    Transaction ID:
                  </Typography>
                  <Typography variant="body1" className="value" sx={{ color: 'var(--primary-text)' }}>
                    {transactionId}
                  </Typography>
                </Box>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 3, mb: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> SkipCash processes payments via webhooks. If your payment was successful, your credits will be added automatically within 1-2 minutes. 
                You can refresh this page or check your credits balance on the dashboard to see the updated balance.
              </Typography>
            </Alert>

            <Box className="action-buttons" sx={{ mt: 3 }}>
              <CustomButton
                variant="primary"
                startIcon={<Refresh />}
                onClick={handleRetry}
              >
                Check Status Again
              </CustomButton>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handleBackToDashboard}
                sx={{ ml: 2 }}
              >
                Back to Dashboard
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

