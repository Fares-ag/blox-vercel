import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Paper, Button } from '@mui/material';
import { CheckCircle, FileDownload, ArrowBack } from '@mui/icons-material';
import { formatCurrency } from '@shared/utils/formatters';
import { Button as CustomButton } from '@shared/components';
import './PaymentConfirmationPage.scss';

export const PaymentConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { transactionId, amount, method } = location.state || {};

  const handleDownloadReceipt = () => {
    // TODO: Implement receipt download
    window.print();
  };

  return (
    <Box className="payment-confirmation-page">
      <Paper className="confirmation-card">
        <Box className="success-icon">
          <CheckCircle sx={{ fontSize: 80, color: '#4caf50' }} />
        </Box>
        <Typography variant="h4" className="success-title">
          Payment Successful!
        </Typography>
        <Typography variant="body1" color="text.secondary" className="success-message">
          Your payment has been processed successfully.
        </Typography>

        <Box className="transaction-details">
          <Box className="detail-row">
            <Typography variant="body2" color="text.secondary">
              Transaction ID:
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {transactionId || 'N/A'}
            </Typography>
          </Box>
          <Box className="detail-row">
            <Typography variant="body2" color="text.secondary">
              Amount Paid:
            </Typography>
            <Typography variant="h6" className="amount">
              {amount ? formatCurrency(amount) : 'N/A'}
            </Typography>
          </Box>
          <Box className="detail-row">
            <Typography variant="body2" color="text.secondary">
              Payment Method:
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {method === 'card' ? 'Credit/Debit Card' : method === 'bank_transfer' ? 'Bank Transfer' : 'N/A'}
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

        <Box className="action-buttons">
          <CustomButton
            variant="primary"
            startIcon={<FileDownload />}
            onClick={handleDownloadReceipt}
          >
            Download Receipt
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


