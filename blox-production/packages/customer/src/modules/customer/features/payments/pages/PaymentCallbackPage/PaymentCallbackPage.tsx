import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, ArrowBack, Refresh } from '@mui/icons-material';
import { formatCurrency } from '@shared/utils/formatters';
import { Button as CustomButton, Loading } from '@shared/components';
import { skipCashService, supabase } from '@shared/services';
import type { SkipCashVerifyRequest } from '@shared/services/skipcash.service';
import { toast } from 'react-toastify';
import './PaymentCallbackPage.scss';

export const PaymentCallbackPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  const applicationId = searchParams.get('applicationId') || id;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

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

      // Verify payment status with SkipCash
      const paymentIdParam = searchParams.get('paymentId');
      const verifyRequest: SkipCashVerifyRequest = paymentIdParam
        ? { transactionId, paymentId: paymentIdParam }
        : { transactionId };

      const result = await skipCashService.verifyPayment(verifyRequest);

      if (result.status === 'SUCCESS' && result.data) {
        const paymentStatus = result.data.status || result.data.statusId;
        
        // Map SkipCash status to our status
        // StatusId: 0=new, 1=pending, 2=paid, 3=canceled, 4=failed, 5=rejected
        if (paymentStatus === 2 || paymentStatus === 'paid' || paymentStatus === 'completed') {
          // RACE CONDITION FIX: Poll database to ensure webhook has updated it
          // User may return before webhook completes (typically takes 1-3 seconds)
          let dbConfirmed = false;
          for (let attempt = 0; attempt < 10; attempt++) {
            try {
              const { data: dbPayment } = await supabase
                .from('payment_transactions')
                .select('status, completed_at')
                .eq('transaction_id', transactionId)
                .single();

              if (dbPayment && dbPayment.status === 'completed') {
                dbConfirmed = true;
                console.log('Payment confirmed in database', { transactionId, attempt });
                break;
              }
            } catch (e) {
              // Ignore DB query errors, will show success anyway
            }

            // Wait 1 second before next attempt
            if (attempt < 9) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          if (!dbConfirmed) {
            console.warn('Payment verified with SkipCash but not yet in database', {
              transactionId,
              note: 'Webhook may still be processing',
            });
          }

          setStatus('success');
          setPaymentData(result.data);
        } else if (paymentStatus === 3 || paymentStatus === 'canceled' || paymentStatus === 'cancelled') {
          setStatus('failed');
          setError('Payment was canceled');
        } else if (paymentStatus === 4 || paymentStatus === 5 || paymentStatus === 'failed' || paymentStatus === 'rejected') {
          setStatus('failed');
          setError(result.data.errorMessage || 'Payment failed');
        } else {
          // Still pending
          setStatus('pending');
          setPaymentData(result.data);
        }
      } else {
        // If verification fails, provide clear guidance
        const errorMsg = result.message?.includes('timeout')
          ? 'Payment verification is taking longer than expected. Your payment may still be processing. Please check your application status in a few minutes.'
          : result.message?.includes('not found')
          ? 'Payment record not found. If you just completed payment, please wait a moment and refresh this page.'
          : 'Payment status is being verified. Please check back in a moment.';
        
        setStatus('pending');
        setError(errorMsg);
      }
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

  const handleBackToApplication = () => {
    if (applicationId) {
      navigate(`/customer/my-applications/${applicationId}`);
    } else {
      navigate('/customer/my-applications');
    }
  };

  if (verifying && status === 'loading') {
    return (
      <Box className="payment-callback-page">
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
    <Box className="payment-callback-page">
      <Paper className="callback-card">
        {status === 'success' && (
          <>
            <Box className="success-icon status-icon">
              <CheckCircle sx={{ fontSize: 80 }} />
            </Box>
            <Typography variant="h4" className="success-title">
              Payment Successful!
            </Typography>
            <Typography variant="body1" className="success-message">
              Your payment has been processed successfully.
            </Typography>

            {paymentData && (
              <Box className="transaction-details">
                <Box className="detail-row">
                  <Typography variant="body2" className="label">
                    Transaction ID:
                  </Typography>
                  <Typography variant="body1" className="value">
                    {transactionId || 'N/A'}
                  </Typography>
                </Box>
                {paymentData.amount && (
                  <Box className="detail-row">
                    <Typography variant="body2" className="label">
                      Amount Paid:
                    </Typography>
                    <Typography variant="h6" className="amount">
                      {formatCurrency(parseFloat(paymentData.amount))}
                    </Typography>
                  </Box>
                )}
                <Box className="detail-row">
                  <Typography variant="body2" className="label">
                    Payment Method:
                  </Typography>
                  <Typography variant="body1" className="value">
                    {paymentData.cardType || 'Card Payment'}
                  </Typography>
                </Box>
                <Box className="detail-row">
                  <Typography variant="body2" className="label">
                    Date:
                  </Typography>
                  <Typography variant="body1" className="value">
                    {new Date().toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box className="action-buttons">
              <CustomButton
                variant="primary"
                onClick={handleBackToApplication}
              >
                Back to Application
              </CustomButton>
            </Box>
          </>
        )}

        {status === 'failed' && (
          <>
            <Box className="error-icon status-icon">
              <ErrorIcon sx={{ fontSize: 80 }} />
            </Box>
            <Typography variant="h4" className="error-title">
              Payment Failed
            </Typography>
            <Typography variant="body1" className="error-message">
              {error || 'Your payment could not be processed. Please try again.'}
            </Typography>

            {transactionId && (
              <Box className="transaction-details">
                <Box className="detail-row">
                  <Typography variant="body2" className="label">
                    Transaction ID:
                  </Typography>
                  <Typography variant="body1" className="value">
                    {transactionId}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box className="action-buttons">
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
                onClick={handleBackToApplication}
              >
                Back to Application
              </Button>
            </Box>
          </>
        )}

        {status === 'pending' && (
          <>
            <Box className="loading-container">
              <CircularProgress size={60} />
            </Box>
            <Typography variant="h4" className="pending-title">
              Payment Processing
            </Typography>
            <Typography variant="body1" className="pending-message">
              {error || 'Your payment is being processed. This may take a few moments.'}
            </Typography>

            {transactionId && (
              <Box className="transaction-details">
                <Box className="detail-row">
                  <Typography variant="body2" className="label">
                    Transaction ID:
                  </Typography>
                  <Typography variant="body1" className="value">
                    {transactionId}
                  </Typography>
                </Box>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
              If your payment was successful, it will be updated automatically. You can check back in a few moments or return to your application.
            </Alert>

            <Box className="action-buttons">
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
                onClick={handleBackToApplication}
              >
                Back to Application
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

