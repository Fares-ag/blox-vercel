import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Paper, Button } from '@mui/material';
import { CheckCircle, FileDownload, ArrowBack } from '@mui/icons-material';
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
  const { transactionId, amount, method, dueDate, isSettlement, paymentsSettled } = (location.state as Record<string, unknown>) || {};
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReceipt = async () => {
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

  return (
    <Box className="payment-confirmation-page">
      <Paper className="confirmation-card">
        <Box className="success-icon">
          <CheckCircle sx={{ fontSize: 80 }} />
        </Box>
        <Typography variant="h4" className="success-title">
          Payment Successful!
        </Typography>
        <Typography variant="body1" className="success-message">
          Your payment has been processed successfully.
        </Typography>

        <Box className="transaction-details">
          <Box className="detail-row">
            <Typography variant="body2" className="label">
              Transaction ID:
            </Typography>
            <Typography variant="body1" className="value">
              {transactionId || 'N/A'}
            </Typography>
          </Box>
          <Box className="detail-row">
            <Typography variant="body2" className="label">
              Amount Paid:
            </Typography>
            <Typography variant="h6" className="amount">
              {amount ? formatCurrency(amount) : 'N/A'}
            </Typography>
          </Box>
          <Box className="detail-row">
            <Typography variant="body2" className="label">
              Payment Method:
            </Typography>
            <Typography variant="body1" className="value">
              {method === 'credit_card' ? 'Credit Card' : method === 'debit_card' ? 'Debit Card (QPay)' : method === 'bank_transfer' ? 'Bank Transfer' : method === 'blox_credit' ? 'Blox Credit' : method === 'card' ? 'Credit/Debit Card' : 'N/A'}
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
          <CustomButton
            variant="primary"
            startIcon={<FileDownload />}
            onClick={handleDownloadReceipt}
            disabled={downloading}
          >
            {downloading ? 'Preparing…' : 'Download Receipt'}
          </CustomButton>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/customer/my-applications/${id}`)}
          >
            Back to Application
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};


