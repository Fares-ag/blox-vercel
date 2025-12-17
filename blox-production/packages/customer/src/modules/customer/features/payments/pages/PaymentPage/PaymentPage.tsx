import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ArrowBack,
  CreditCard,
  AccountBalance,
  Wallet,
  Lock,
  CheckCircle,
} from '@mui/icons-material';
import { supabaseApiService } from '@shared/services';
import type { PaymentMethod } from '@shared/models/payment.model';
import type { Application, PaymentSchedule } from '@shared/models/application.model';
import { Button as CustomButton, Loading } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import { toast } from 'react-toastify';
import moment from 'moment';
import { DeferPaymentDialog } from '../../../membership/components/DeferPaymentDialog/DeferPaymentDialog';
import { membershipService } from '../../../../services/membership.service';
import { deferralService } from '../../../../services/deferral.service';
import { EventAvailable } from '@mui/icons-material';
import './PaymentPage.scss';

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'card',
    type: 'card',
    label: 'Credit/Debit Card',
    enabled: true,
  },
  {
    id: 'bank_transfer',
    type: 'bank_transfer',
    label: 'Bank Transfer',
    enabled: true,
  },
  {
    id: 'wallet',
    type: 'wallet',
    label: 'Digital Wallet',
    enabled: false, // Not yet implemented
  },
];

export const PaymentPage: React.FC = () => {
  const { id, paymentId } = useParams<{ id: string; paymentId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [application, setApplication] = useState<Application | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod['type']>('card');
  const [amount, setAmount] = useState<number>(0);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });
  const [bankTransferDetails, setBankTransferDetails] = useState({
    bankName: '',
    accountNumber: '',
    reference: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deferDialogOpen, setDeferDialogOpen] = useState(false);
  const [deferring, setDeferring] = useState(false);
  const [hasMembership, setHasMembership] = useState(false);
  const [isDailyPayment, setIsDailyPayment] = useState(false);
  const [dailyPaymentDate, setDailyPaymentDate] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadApplication();
      checkMembership();
    }
  }, [id]);

  const checkMembership = async () => {
    try {
      const membership = await membershipService.getMembershipStatus();
      setHasMembership(membership?.isActive || false);
    } catch (error) {
      // Check from application
      if (application?.bloxMembership?.isActive) {
        setHasMembership(true);
      }
    }
  };

  useEffect(() => {
    // Get payment amount from location state or payment schedule
    if (location.state?.amount) {
      setAmount(location.state.amount);
    } else if (paymentSchedule) {
      setAmount(paymentSchedule.amount);
    }
  }, [location.state, paymentSchedule]);

  // Handle daily payment from calendar
  useEffect(() => {
    if (location.state?.isDailyPayment && location.state?.dailyAmount) {
      // This is a daily payment converted from monthly
      setIsDailyPayment(true);
      setDailyPaymentDate(location.state.paymentDate || null);
      setAmount(location.state.dailyAmount);
      // Create a temporary payment schedule for the daily payment
      if (location.state.paymentDate && location.state.originalPaymentIndex !== undefined && application) {
        const originalPayment = application.installmentPlan?.schedule?.[location.state.originalPaymentIndex];
        if (originalPayment) {
          setPaymentSchedule({
            ...originalPayment,
            dueDate: location.state.paymentDate,
            amount: location.state.dailyAmount,
          });
        }
      }
    } else {
      setIsDailyPayment(false);
      setDailyPaymentDate(null);
    }
  }, [location.state, application]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      
      // Load from Supabase only
      if (!id) {
        toast.error('Application ID is required');
        navigate('/customer/my-applications');
        return;
      }
      
      const supabaseResponse = await supabaseApiService.getApplicationById(id);
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        const appToUse = supabaseResponse.data;
        
        // Only allow payments for active applications
        if (appToUse.status !== 'active') {
          toast.error('Payments can only be made for active applications.');
          navigate('/customer/my-applications');
          return;
        }
        
        setApplication(appToUse);
        
        if (appToUse.bloxMembership?.isActive) {
          setHasMembership(true);
        }
        
        if (paymentId && appToUse.installmentPlan?.schedule) {
          const idx = parseInt(paymentId);
          const payment = appToUse.installmentPlan.schedule[idx];
          if (payment) {
            setPaymentSchedule(payment);
            setAmount(payment.amount);
          }
        } else if (appToUse.installmentPlan?.schedule && appToUse.installmentPlan.schedule.length > 0) {
          // Use first upcoming payment if no paymentId specified
          const upcomingPayment = appToUse.installmentPlan.schedule.find(
            (p: PaymentSchedule) => p.status === 'upcoming' || p.status === 'active'
          );
          if (upcomingPayment) {
            setPaymentSchedule(upcomingPayment);
            setAmount(upcomingPayment.amount);
          }
        }
      } else {
        throw new Error(supabaseResponse.message || 'Application not found');
      }
    } catch (error: any) {
      console.error('❌ Failed to load application details:', error);
      toast.error(error.message || 'Failed to load application details');
      navigate('/customer/my-applications');
    } finally {
      setLoading(false);
    }
  };

  const validateCardDetails = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!cardDetails.cardNumber || cardDetails.cardNumber.replace(/\s/g, '').length < 16) {
      newErrors.cardNumber = 'Valid card number is required';
    }
    if (!cardDetails.expiryMonth || !cardDetails.expiryYear) {
      newErrors.expiry = 'Expiry date is required';
    }
    if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
      newErrors.cvv = 'CVV is required';
    }
    if (!cardDetails.cardholderName || cardDetails.cardholderName.length < 3) {
      newErrors.cardholderName = 'Cardholder name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBankTransfer = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!bankTransferDetails.bankName) {
      newErrors.bankName = 'Bank name is required';
    }
    if (!bankTransferDetails.accountNumber) {
      newErrors.accountNumber = 'Account number is required';
    }
    if (!bankTransferDetails.reference) {
      newErrors.reference = 'Reference is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!application || !amount) {
      toast.error('Invalid payment information');
      return;
    }

    const isValid = selectedMethod === 'card' ? validateCardDetails() : validateBankTransfer();
    if (!isValid) {
      return;
    }

    try {
      setProcessing(true);

      // TODO: Replace with actual API call
      // const paymentRequest: PaymentRequest = {
      //   applicationId: application.id,
      //   paymentScheduleId: paymentId,
      //   amount,
      //   method: selectedMethod,
      //   ...(selectedMethod === 'card' ? { cardDetails } : { bankTransferDetails }),
      // };
      // const response = await apiService.post('/customer/payments/process', paymentRequest);
      // if (response.status === 'SUCCESS') {
      //   navigate(`/customer/my-applications/${id}/payment-confirmation`, {
      //     state: { transactionId: response.data.transactionId },
      //   });
      // }

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success('Payment processed successfully!');
      navigate(`/customer/my-applications/${id}/payment-confirmation`, {
        state: { transactionId: `TXN-${Date.now()}`, amount, method: selectedMethod },
      });
    } catch (error: any) {
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeferPayment = async (reason?: string, deferredAmount?: number) => {
    if (!application || !paymentSchedule || !id) return;

    try {
      setDeferring(true);
      
      // Create deferral record
      await membershipService.deferPayment(
        application.id,
        paymentSchedule.dueDate,
        reason,
        deferredAmount
      );

      // Update payment schedule
      const result = await deferralService.updatePaymentScheduleAfterDeferral(
        application.id,
        paymentSchedule.dueDate,
        deferredAmount
      );

      if (result.updated) {
        if (deferredAmount && deferredAmount < paymentSchedule.amount) {
          toast.success(`Partial deferral successful! ${deferredAmount.toFixed(2)} QAR deferred to next month.`);
        } else {
          toast.success('Payment deferred successfully! New due date: ' + 
            new Date(moment(paymentSchedule.dueDate).add(1, 'month').toISOString()).toLocaleDateString());
        }
        setDeferDialogOpen(false);
        // Reload application to show updated schedule
        loadApplication();
      } else {
        toast.error('Failed to update payment schedule');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to defer payment');
    } finally {
      setDeferring(false);
    }
  };

  const canDefer = hasMembership && paymentSchedule && 
    (paymentSchedule.status === 'upcoming' || paymentSchedule.status === 'active') &&
    deferralService.canDeferPayment();

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!application) {
    return (
      <Box className="payment-page">
        <Alert severity="error">Application not found</Alert>
        <Button onClick={() => navigate('/customer/my-applications')}>Back to Applications</Button>
      </Box>
    );
  }

  return (
    <Box className="payment-page">
      <Button
        variant="text"
        startIcon={<ArrowBack />}
        onClick={() => navigate(`/customer/my-applications/${id}`)}
        className="back-button"
      >
        Back to Application
      </Button>

      <Typography variant="h4" className="page-title">
        Make Payment
      </Typography>

      {isDailyPayment && dailyPaymentDate && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Daily Payment
          </Typography>
          <Typography variant="body2">
            This is a daily payment for {moment(dailyPaymentDate).format('MMMM D, YYYY')}. 
            The amount shown is your daily portion of the monthly installment.
          </Typography>
        </Alert>
      )}

      <Box className="payment-layout">
        <Box className="payment-method-section">
          <Paper className="payment-card">
            <Typography variant="h6" className="section-title">
              Payment Method
            </Typography>
            <RadioGroup
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value as PaymentMethod['type']);
                setErrors({});
              }}
            >
              {PAYMENT_METHODS.filter((m) => m.enabled).map((method) => (
                <FormControlLabel
                  key={method.id}
                  value={method.type}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {method.type === 'card' && <CreditCard />}
                      {method.type === 'bank_transfer' && <AccountBalance />}
                      {method.type === 'wallet' && <Wallet />}
                      {method.label}
                    </Box>
                  }
                />
              ))}
            </RadioGroup>

            <Divider sx={{ my: 3 }} />

            {/* Card Payment Form */}
            {selectedMethod === 'card' && (
              <Box className="payment-form">
                <TextField
                  fullWidth
                  label="Card Number"
                  value={cardDetails.cardNumber}
                  onChange={(e) =>
                    setCardDetails({ ...cardDetails, cardNumber: formatCardNumber(e.target.value) })
                  }
                  error={!!errors.cardNumber}
                  helperText={errors.cardNumber}
                  placeholder="1234 5678 9012 3456"
                  inputProps={{ maxLength: 19 }}
                  sx={{ mb: 2 }}
                />
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Month"
                      value={cardDetails.expiryMonth}
                      onChange={(e) =>
                        setCardDetails({
                          ...cardDetails,
                          expiryMonth: e.target.value.replace(/[^0-9]/g, '').slice(0, 2),
                        })
                      }
                      error={!!errors.expiry}
                      placeholder="MM"
                      inputProps={{ maxLength: 2 }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="Year"
                      value={cardDetails.expiryYear}
                      onChange={(e) =>
                        setCardDetails({
                          ...cardDetails,
                          expiryYear: e.target.value.replace(/[^0-9]/g, '').slice(0, 4),
                        })
                      }
                      error={!!errors.expiry}
                      placeholder="YYYY"
                      inputProps={{ maxLength: 4 }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="CVV"
                      type="password"
                      value={cardDetails.cvv}
                      onChange={(e) =>
                        setCardDetails({
                          ...cardDetails,
                          cvv: e.target.value.replace(/[^0-9]/g, '').slice(0, 4),
                        })
                      }
                      error={!!errors.cvv}
                      helperText={errors.cvv}
                      placeholder="123"
                      inputProps={{ maxLength: 4 }}
                    />
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  label="Cardholder Name"
                  value={cardDetails.cardholderName}
                  onChange={(e) =>
                    setCardDetails({ ...cardDetails, cardholderName: e.target.value })
                  }
                  error={!!errors.cardholderName}
                  helperText={errors.cardholderName}
                  placeholder="John Doe"
                  sx={{ mt: 2 }}
                />
              </Box>
            )}

            {/* Bank Transfer Form */}
            {selectedMethod === 'bank_transfer' && (
              <Box className="payment-form">
                <Alert severity="info" sx={{ mb: 2 }}>
                  Please transfer the amount to our bank account. Include the reference number in your
                  transfer.
                </Alert>
                <TextField
                  fullWidth
                  label="Your Bank Name"
                  value={bankTransferDetails.bankName}
                  onChange={(e) =>
                    setBankTransferDetails({ ...bankTransferDetails, bankName: e.target.value })
                  }
                  error={!!errors.bankName}
                  helperText={errors.bankName}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Your Account Number"
                  value={bankTransferDetails.accountNumber}
                  onChange={(e) =>
                    setBankTransferDetails({
                      ...bankTransferDetails,
                      accountNumber: e.target.value,
                    })
                  }
                  error={!!errors.accountNumber}
                  helperText={errors.accountNumber}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Reference Number"
                  value={bankTransferDetails.reference}
                  onChange={(e) =>
                    setBankTransferDetails({ ...bankTransferDetails, reference: e.target.value })
                  }
                  error={!!errors.reference}
                  helperText={errors.reference}
                />
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {canDefer && (
              <>
                <CustomButton
                  variant="outlined"
                  fullWidth
                  onClick={() => setDeferDialogOpen(true)}
                  startIcon={<EventAvailable />}
                  sx={{ mb: 2 }}
                >
                  Defer Payment
                </CustomButton>
                <Divider sx={{ my: 2 }} />
              </>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', mb: 2 }}>
              <Lock fontSize="small" />
              <Typography variant="body2">Your payment is secured with SSL encryption</Typography>
            </Box>

            <CustomButton
              variant="primary"
              fullWidth
              onClick={handleSubmit}
              loading={processing}
              disabled={!amount || amount <= 0}
              startIcon={processing ? <CircularProgress size={20} /> : <CheckCircle />}
            >
              {processing ? 'Processing Payment...' : `Pay ${formatCurrency(amount)}`}
            </CustomButton>
          </Paper>
        </Box>

        <Box className="payment-summary-section">
          <Paper className="summary-card">
            <Typography variant="h6" className="section-title">
              Payment Summary
            </Typography>
            <Box className="summary-item">
              <Typography variant="body2" color="text.secondary">
                Application ID
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {application.id}
              </Typography>
            </Box>
            {paymentSchedule && (
              <Box className="summary-item">
                <Typography variant="body2" color="text.secondary">
                  Payment Due Date
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {new Date(paymentSchedule.dueDate).toLocaleDateString()}
                </Typography>
              </Box>
            )}
            <Divider sx={{ my: 2 }} />
            <Box className="summary-item">
              <Typography variant="body2" color="text.secondary">
                Amount to Pay
              </Typography>
              <Typography variant="h5" className="amount">
                {formatCurrency(amount)}
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>

      {paymentSchedule && (
        <DeferPaymentDialog
          open={deferDialogOpen}
          onClose={() => setDeferDialogOpen(false)}
          onConfirm={handleDeferPayment}
          payment={{
            id: paymentSchedule.dueDate,
            dueDate: paymentSchedule.dueDate,
            amount: paymentSchedule.amount,
            applicationId: application?.id || '',
          }}
          loading={deferring}
        />
      )}
    </Box>
  );
};


