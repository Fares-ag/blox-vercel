import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { CheckCircle, Error as ErrorIcon, ArrowBack, Refresh } from '@mui/icons-material';
import { formatCurrency } from '@shared/utils/formatters';
import { Button as CustomButton, Loading } from '@shared/components';
import { skipCashService } from '@shared/services';
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
      const result = await skipCashService.verifyPayment({
        transactionId: transactionId,
      });

      if (result.status === 'SUCCESS' && result.data) {
        const paymentStatus = result.data.status || result.data.statusId;
        
        // Map SkipCash status to our status
        // StatusId: 0=new, 1=pending, 2=paid, 3=canceled, 4=failed, 5=rejected
        if (paymentStatus === 2 || paymentStatus === 'paid' || paymentStatus === 'completed') {
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
        // If verification fails, check database for payment status
        // The webhook might have already updated it
        setStatus('pending');
        setError('Payment status is being verified. Please check back in a moment.');
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
            <Typography variant="h6" sx={{ mt: 2 }}>
              Verifying Payment...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
            <Box className="success-icon">
              <CheckCircle sx={{ fontSize: 80, color: '#4caf50' }} />
            </Box>
            <Typography variant="h4" className="success-title">
              Payment Successful!
            </Typography>
            <Typography variant="body1" color="text.secondary" className="success-message">
              Your payment has been processed successfully.
            </Typography>

            {paymentData && (
              <Box className="transaction-details">
                <Box className="detail-row">
                  <Typography variant="body2" color="text.secondary">
                    Transaction ID:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {transactionId || 'N/A'}
                  </Typography>
                </Box>
                {paymentData.amount && (
                  <Box className="detail-row">
                    <Typography variant="body2" color="text.secondary">
                      Amount Paid:
                    </Typography>
                    <Typography variant="h6" className="amount">
                      {formatCurrency(parseFloat(paymentData.amount))}
                    </Typography>
                  </Box>
                )}
                <Box className="detail-row">
                  <Typography variant="body2" color="text.secondary">
                    Payment Method:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {paymentData.cardType || 'Card Payment'}
                  </Typography>
                </Box>
                <Box className="detail-row">
                  <Typography variant="body2" color="text.secondary">
                    Date:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
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
            <Box className="error-icon">
              <ErrorIcon sx={{ fontSize: 80, color: '#f44336' }} />
            </Box>
            <Typography variant="h4" className="error-title">
              Payment Failed
            </Typography>
            <Typography variant="body1" color="text.secondary" className="error-message">
              {error || 'Your payment could not be processed. Please try again.'}
            </Typography>

            {transactionId && (
              <Box className="transaction-details">
                <Box className="detail-row">
                  <Typography variant="body2" color="text.secondary">
                    Transaction ID:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
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
            <Typography variant="body1" color="text.secondary" className="pending-message">
              {error || 'Your payment is being processed. This may take a few moments.'}
            </Typography>

            {transactionId && (
              <Box className="transaction-details">
                <Box className="detail-row">
                  <Typography variant="body2" color="text.secondary">
                    Transaction ID:
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
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

