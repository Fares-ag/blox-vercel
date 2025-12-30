import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  IconButton,
  Alert,
  Divider,
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Delete,
  AccountBalance,
  AccountBalanceWallet,
  Money,
} from '@mui/icons-material';
import { Button as CustomButton } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import './PaymentConfirmationDialog.scss';

export type PaymentMethod = 'bank_account' | 'cheque' | 'cash';

interface PaymentConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: PaymentMethod, proofFile: File | null) => Promise<void>;
  installmentAmount: number;
  installmentNumber: number;
  dueDate: string;
  loading?: boolean;
}

export const PaymentConfirmationDialog: React.FC<PaymentConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  installmentAmount,
  installmentNumber,
  dueDate,
  loading = false,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF, JPG, or PNG file');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setProofFile(file);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setError(null);
  };

  const handleConfirm = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    if (paymentMethod !== 'cash' && !proofFile) {
      setError('Please upload proof of payment');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      await onConfirm(paymentMethod as PaymentMethod, proofFile);
      // Reset form on success
      setPaymentMethod('');
      setProofFile(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm payment');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !uploading) {
      setPaymentMethod('');
      setProofFile(null);
      setError(null);
      onClose();
    }
  };

  const paymentMethodOptions = [
    {
      value: 'bank_account' as PaymentMethod,
      label: 'Bank Account Transfer',
      icon: <AccountBalance />,
      description: 'Payment made via bank transfer',
    },
    {
      value: 'cheque' as PaymentMethod,
      label: 'Cheque',
      icon: <AccountBalanceWallet />,
      description: 'Payment made via cheque',
    },
    {
      value: 'cash' as PaymentMethod,
      label: 'Cash',
      icon: <Money />,
      description: 'Payment made in cash (proof optional)',
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      className="payment-confirmation-dialog"
      PaperProps={{
        sx: {
          borderRadius: '16px',
          padding: 0,
        },
      }}
    >
      <DialogTitle sx={{ pb: 2, position: 'relative' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#000000' }}>
          Confirm Payment
        </Typography>
        <IconButton
          onClick={handleClose}
          disabled={loading || uploading}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: '#6B7280',
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box className="payment-info">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Installment #{installmentNumber}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {formatCurrency(installmentAmount)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Due Date: {dueDate}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <FormControl component="fieldset" fullWidth sx={{ mb: 3 }}>
          <FormLabel
            component="legend"
            sx={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#000000',
              mb: 2,
            }}
          >
            Payment Method
          </FormLabel>
          <RadioGroup
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value as PaymentMethod);
              setError(null);
            }}
          >
            {paymentMethodOptions.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: '#DAFF01' }}>{option.icon}</Box>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {option.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: 1,
                  '&:hover': {
                    borderColor: '#DAFF01',
                    backgroundColor: '#F0FDFA',
                  },
                  '&.Mui-checked': {
                    borderColor: '#DAFF01',
                    backgroundColor: '#F0FDFA',
                  },
                }}
              />
            ))}
          </RadioGroup>
        </FormControl>

        {paymentMethod && paymentMethod !== 'cash' && (
          <Box className="proof-upload-section">
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
              Upload Proof of Payment
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Please upload a receipt, bank statement, or cheque image (PDF, JPG, or PNG, max 10MB)
            </Typography>

            {!proofFile ? (
              <Box
                className="file-upload-area"
                sx={{
                  border: '2px dashed #E5E7EB',
                  borderRadius: '8px',
                  padding: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  '&:hover': {
                    borderColor: '#DAFF01',
                    backgroundColor: '#F0FDFA',
                  },
                }}
              >
                <input
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  id="proof-upload-input"
                  type="file"
                  onChange={handleFileChange}
                />
                <label htmlFor="proof-upload-input">
                  <CloudUpload sx={{ fontSize: 48, color: '#DAFF01', mb: 1, cursor: 'pointer' }} />
                  <Typography variant="body2" sx={{ color: '#6B7280', cursor: 'pointer' }}>
                    Click to upload or drag and drop
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mt: 0.5 }}>
                    PDF, JPG, or PNG (max 10MB)
                  </Typography>
                </label>
              </Box>
            ) : (
              <Box
                className="file-preview"
                sx={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F9FAFB',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CloudUpload sx={{ color: '#DAFF01' }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {proofFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={handleRemoveFile}
                  sx={{ color: '#F95668' }}
                >
                  <Delete />
                </IconButton>
              </Box>
            )}
          </Box>
        )}

        {paymentMethod === 'cash' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Cash payments do not require proof upload, but you can add a receipt if available.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
        <CustomButton
          variant="secondary"
          onClick={handleClose}
          disabled={loading || uploading}
        >
          Cancel
        </CustomButton>
        <CustomButton
          variant="primary"
          onClick={handleConfirm}
          disabled={loading || uploading || !paymentMethod || (paymentMethod !== 'cash' && !proofFile)}
        >
          {uploading ? 'Processing...' : 'Confirm Payment'}
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

