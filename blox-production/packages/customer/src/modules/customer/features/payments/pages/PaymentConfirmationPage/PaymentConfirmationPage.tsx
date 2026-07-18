import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Paper, Button, Alert } from '@mui/material';
import { CheckCircle, HourglassEmpty, FileDownload, ArrowBack } from '@mui/icons-material';
import { formatCurrency } from '@shared/utils/formatters';
import { Button as CustomButton } from '@shared/components';
import { supabaseApiService, receiptService } from '@shared/services';
import type { PaymentSchedule } from '@shared/models/application.model';
import { toast } from 'react-toastify';
import './PaymentConfirmationPage.scss';

export const PaymentConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    transactionId,
    amount,
    method,
    dueDate,
    isSettlement,
    paymentsSettled,
    pendingReview,
  } = (location.state as Record<string, unknown>) || {};
  const [downloading, setDownloading] = useState(false);

  const isPendingReview =
    pendingReview === true || method === 'bank_transfer';

  const handleDownloadReceipt = async () => {
    if (isPendingReview) {
      toast.info('Receipt is available after admin confirms your bank transfer.');
      return;
    }
    if (!id) {
      window.print();
      return;
    }
    setDownloading(true);
    try {
      const appResponse = await supabaseApiService.getApplicationById(id);
      if (appResponse.status !== 'SUCCESS' || !appResponse.data?.installmentPlan?.schedule) {
        window.print();
        return;
      }
      const schedule = appResponse.data.installmentPlan.schedule as PaymentSchedule[];
      const payment = dueDate
        ? schedule.find((p) => p.dueDate === dueDate)
        : schedule.find((p) => p.status === 'paid') ?? schedule[0];
      const paidAmount = typeof amount === 'number' ? amount : (payment?.paidAmount ?? payment?.amount ?? 0);
      if (!payment) {
        window.print();
        return;
      }
      const description = isSettlement && typeof paymentsSettled === 'number' && paymentsSettled > 0
        ? `Settlement of ${paymentsSettled} installments`
        : undefined;
      await receiptService.generateAndDownload(
        {
          application: appResponse.data,
          payment,
          paidAmount,
          transactionId: (transactionId as string) || `TXN-${Date.now()}`,
          paymentMethod: method as string,
          paidDate: new Date().toISOString(),
          description,
        },
        `receipt-${transactionId || Date.now()}.pdf`
      );
      toast.success('Receipt downloaded');
    } catch (err) {
      console.error('Receipt download failed:', err);
      window.print();
      toast.info('Opening print view instead');
    } finally {
      setDownloading(false);
    }
  };

  const methodLabel =
    method === 'credit_card'
      ? 'Credit Card'
      : method === 'debit_card'
        ? 'Debit Card (QPay)'
        : method === 'bank_transfer'
          ? 'Bank Transfer'
          : method === 'blox_credit'
            ? 'Blox Credit'
            : method === 'card'
              ? 'Credit/Debit Card'
              : 'N/A';

  return (
    <Box className="payment-confirmation-page">
      <Paper className="confirmation-card">
        <Box className="success-icon">
          {isPendingReview ? (
            <HourglassEmpty sx={{ fontSize: 80 }} />
          ) : (
            <CheckCircle sx={{ fontSize: 80 }} />
          )}
        </Box>
        <Typography variant="h4" className="success-title">
          {isPendingReview ? 'Bank Transfer Submitted' : 'Payment Successful!'}
        </Typography>
        <Typography variant="body1" className="success-message">
          {isPendingReview
            ? 'Your transfer details were submitted for verification. Installments are marked paid only after admin confirmation.'
            : 'Your payment has been processed successfully.'}
        </Typography>

        {isPendingReview && (
          <Alert severity="info" sx={{ mt: 2, mb: 1, textAlign: 'left' }}>
            Keep your bank reference handy. You will see the installment update in My Applications
            once an admin confirms the transfer.
          </Alert>
        )}

        <Box className="transaction-details">
          <Box className="detail-row">
            <Typography variant="body2" className="label">
              Transaction ID:
            </Typography>
            <Typography variant="body1" className="value">
              {(transactionId as string) || 'N/A'}
            </Typography>
          </Box>
          <Box className="detail-row">
            <Typography variant="body2" className="label">
              {isPendingReview ? 'Amount Submitted:' : 'Amount Paid:'}
            </Typography>
            <Typography variant="h6" className="amount">
              {amount ? formatCurrency(amount as number) : 'N/A'}
            </Typography>
          </Box>
          <Box className="detail-row">
            <Typography variant="body2" className="label">
              Payment Method:
            </Typography>
            <Typography variant="body1" className="value">
              {methodLabel}
            </Typography>
          </Box>
          <Box className="detail-row">
            <Typography variant="body2" className="label">
              Status:
            </Typography>
            <Typography variant="body1" className="value">
              {isPendingReview ? 'Pending admin verification' : 'Completed'}
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

        <Box className="action-buttons">
          {!isPendingReview && (
            <CustomButton
              variant="primary"
              startIcon={<FileDownload />}
              onClick={handleDownloadReceipt}
              disabled={downloading}
            >
              {downloading ? 'Preparing…' : 'Download Receipt'}
            </CustomButton>
          )}
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate(id ? `/customer/my-applications/${id}` : '/customer/my-applications')}
          >
            Back to Application
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
