import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Alert,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
} from '@mui/material';
import { Button } from '@shared/components';
import { formatCurrency, formatDate } from '@shared/utils/formatters';
import moment from 'moment';
import { membershipService } from '../../../../services/membership.service';

interface DeferPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string, deferredAmount?: number) => void;
  payment: {
    id: string;
    dueDate: string;
    amount: number;
    applicationId: string;
  };
  loading?: boolean;
}

export const DeferPaymentDialog: React.FC<DeferPaymentDialogProps> = ({
  open,
  onClose,
  onConfirm,
  payment,
  loading = false,
}) => {
  const [reason, setReason] = useState('');
  const [deferralType, setDeferralType] = useState<'full' | 'partial'>('full');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [deferralStatus, setDeferralStatus] = useState<{
    remainingDeferrals: number;
    deferralsUsed: number;
    year: number;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    if (open) {
      loadDeferralStatus();
      setDeferralType('full');
      setPartialAmount('');
      setReason('');
    }
  }, [open]);

  const loadDeferralStatus = async () => {
    try {
      setLoadingStatus(true);
      const status = await membershipService.getDeferralStatus();
      setDeferralStatus(status);
    } catch (error) {
      console.error('Failed to load deferral status:', error);
      // Set default status
      setDeferralStatus({
        remainingDeferrals: 3,
        deferralsUsed: 0,
        year: new Date().getFullYear(),
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const canDefer = deferralStatus && deferralStatus.remainingDeferrals > 0;
  const newDueDate = moment(payment.dueDate).add(1, 'month').format('YYYY-MM-DD');
  
  const partialAmountNum = parseFloat(partialAmount) || 0;
  const remainingAmount = payment.amount - partialAmountNum;
  const deferredAmount = deferralType === 'full' ? undefined : partialAmountNum;
  
  const isValidPartialAmount = 
    deferralType === 'full' || 
    (partialAmountNum > 0 && partialAmountNum < payment.amount);
  
  const handlePartialAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= payment.amount)) {
      setPartialAmount(value);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight={700}>
          Defer Payment
        </Typography>
      </DialogTitle>
      <DialogContent>
        {loadingStatus ? (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading deferral status...
            </Typography>
          </Box>
        ) : (
          <>
            {!canDefer && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                You have used all {deferralStatus?.deferralsUsed || 0} deferrals for {deferralStatus?.year || new Date().getFullYear()}. 
                You can defer payments again next year.
              </Alert>
            )}

            {canDefer && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    You can defer this payment to the next month. You will have{' '}
                    <strong>{deferralStatus!.remainingDeferrals - 1} deferrals remaining</strong> for{' '}
                    {deferralStatus!.year}.
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Original Due Date:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatDate(payment.dueDate)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Amount:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatCurrency(payment.amount)}
                    </Typography>
                  </Box>
                </Box>

                <FormControl component="fieldset" sx={{ mb: 3 }}>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                    Deferral Type
                  </FormLabel>
                  <RadioGroup
                    value={deferralType}
                    onChange={(e) => setDeferralType(e.target.value as 'full' | 'partial')}
                  >
                    <FormControlLabel
                      value="full"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Defer Full Payment
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Move entire payment ({formatCurrency(payment.amount)}) to {formatDate(newDueDate)}
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="partial"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Defer Partial Payment
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Pay part now, defer the rest
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>

                {deferralType === 'partial' && (
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      label="Amount to Defer"
                      type="number"
                      fullWidth
                      value={partialAmount}
                      onChange={(e) => handlePartialAmountChange(e.target.value)}
                      placeholder={`Enter amount (max ${formatCurrency(payment.amount)})`}
                      error={!isValidPartialAmount && partialAmount !== ''}
                      helperText={
                        !isValidPartialAmount && partialAmount !== ''
                          ? `Amount must be between 0 and ${formatCurrency(payment.amount)}`
                          : `Remaining amount due on ${formatDate(payment.dueDate)}: ${formatCurrency(remainingAmount)}`
                      }
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>QAR</Typography>,
                      }}
                      sx={{ mb: 2 }}
                    />
                    <Box sx={{ p: 2, bgcolor: 'rgba(0, 207, 162, 0.05)', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Amount to Pay Now:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(remainingAmount)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Amount to Defer:
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="#00CFA2">
                          {formatCurrency(partialAmountNum)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Deferred Payment Due Date:
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="#00CFA2">
                          {formatDate(newDueDate)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}

                {deferralType === 'full' && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        New Due Date:
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="#00CFA2">
                        {formatDate(newDueDate)}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <TextField
                  label="Reason (Optional)"
                  multiline
                  rows={3}
                  fullWidth
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for deferring this payment..."
                  sx={{ mb: 2 }}
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    <strong>Note:</strong>{' '}
                    {deferralType === 'full' 
                      ? 'The payment will be moved to next month. All subsequent payments will also shift by one month, and your loan term will extend by one month.'
                      : `You will pay ${formatCurrency(remainingAmount)} on ${formatDate(payment.dueDate)} and ${formatCurrency(partialAmountNum)} on ${formatDate(newDueDate)}. All subsequent payments will shift by one month.`
                    }
                  </Typography>
                </Alert>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {canDefer && (
          <Button
            variant="primary"
            onClick={() => onConfirm(reason || undefined, deferredAmount)}
            loading={loading}
            disabled={!isValidPartialAmount}
          >
            Confirm Deferral
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

