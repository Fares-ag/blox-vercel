import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Checkbox,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ArrowBack,
  CreditCard,
  AccountBalance,
  Lock,
  CheckCircle,
  Stars,
  AttachMoney,
} from '@mui/icons-material';
import { supabaseApiService, receiptService, supabase, skipCashService, paymentPermissionsService, creditsService } from '@shared/services';
import type { PaymentMethod } from '@shared/models/payment.model';
import type { Application, PaymentSchedule } from '@shared/models/application.model';
import { Button as CustomButton, Loading } from '@shared/components';
import { Config } from '@shared/config/app.config';
import { formatCurrency } from '@shared/utils/formatters';
import { calculateSettlementDiscount } from '@shared/utils/settlement-discount.utils';
import { devLogger } from '@shared/utils/logger.util';
import type { SettlementDiscountSettings } from '@shared/models/settlement-discount.model';
import { toast } from 'react-toastify';
import moment from 'moment';
import { DeferPaymentDialog } from '../../../membership/components/DeferPaymentDialog/DeferPaymentDialog';
import { membershipService } from '../../../../services/membership.service';
import { deferralService } from '../../../../services/deferral.service';
import { useCredits } from '../../../../hooks/useCredits';
import { EventAvailable } from '@mui/icons-material';
import './PaymentPage.scss';

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'credit_card',
    type: 'credit_card',
    label: 'Credit Card',
    enabled: true,
  },
  {
    id: 'debit_card',
    type: 'debit_card',
    label: 'Debit Card (QPay)',
    enabled: true,
  },
  {
    id: 'bank_transfer',
    type: 'bank_transfer',
    label: 'Bank Transfer',
    enabled: true,
  },
  {
    id: 'blox_credit',
    type: 'blox_credit',
    label: 'Blox Credit',
    enabled: true,
  },
];

function isCardMethod(type: PaymentMethod['type']): boolean {
  return type === 'credit_card' || type === 'debit_card';
}

export const PaymentPage: React.FC = () => {
  const { id, paymentId } = useParams<{ id: string; paymentId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [application, setApplication] = useState<Application | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod['type']>('credit_card');
  const [amount, setAmount] = useState<number>(0);
  // Card details are collected on the SkipCash hosted checkout page.
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
  const [isSettlement, setIsSettlement] = useState(false);
  const [remainingPaymentsCount, setRemainingPaymentsCount] = useState(0);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [discountSettings, setDiscountSettings] = useState<SettlementDiscountSettings | null>(null);
  const [discountCalculation, setDiscountCalculation] = useState<any>(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);
  const [canPay, setCanPay] = useState(true);
  const [checkingCanPay, setCheckingCanPay] = useState(true);
  const { creditsBalance, refreshCredits } = useCredits();
  const submittingRef = useRef(false);

  useEffect(() => {
    if (id) {
      loadApplication();
      checkMembership();
    }
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const allowed = id ? await paymentPermissionsService.getCanPayForApplication(id) : false;
        if (mounted) setCanPay(allowed);
      } finally {
        if (mounted) setCheckingCanPay(false);
      }
    })();
    return () => {
      mounted = false;
    };
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
      // For partial payments, use remaining amount if available, otherwise full amount
      const remainingAmount = paymentSchedule.remainingAmount ?? paymentSchedule.amount;
      setAmount(remainingAmount);
      setCustomAmount(remainingAmount.toString());
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

    // Handle settlement payment
    if (location.state?.isSettlement || location.state?.settleAll) {
      setIsSettlement(true);
      setAmount(location.state.amount || 0);
      setRemainingPaymentsCount(location.state.remainingPayments || 0);
    } else {
      setIsSettlement(false);
      setDiscountCalculation(null);
    }
  }, [location.state]);

  const loadSettlementDiscount = useCallback(async () => {
    if (!application || !isSettlement) {
      devLogger.debug('Cannot load discount: application or isSettlement missing', { application: !!application, isSettlement });
      return;
    }
    
    try {
      setLoadingDiscount(true);
      devLogger.debugWithEmoji('📊', 'Loading settlement discount settings...');
      const settingsResponse = await supabaseApiService.getSettlementDiscountSettings();
      
      if (settingsResponse.status === 'SUCCESS' && settingsResponse.data) {
        devLogger.debugWithEmoji('✅', 'Settings loaded:', settingsResponse.data);
        setDiscountSettings(settingsResponse.data);
        
        // Calculate discount
        const remainingPayments = application.installmentPlan?.schedule?.filter(
          (p: PaymentSchedule) => p.status !== 'paid'
        ) || [];
        
        devLogger.debugWithEmoji('📋', 'Remaining payments:', remainingPayments.length);
        
        if (remainingPayments.length > 0) {
          const calculation = calculateSettlementDiscount(
            application,
            remainingPayments,
            settingsResponse.data,
            new Date()
          );
          devLogger.debugWithEmoji('💰', 'Discount calculation:', calculation);
          setDiscountCalculation(calculation);
          
          // Update amount with discounted amount if discount applies
          if (calculation.totalDiscount > 0) {
            devLogger.debugWithEmoji('✅', 'Discount applied:', calculation.totalDiscount, 'Final amount:', calculation.finalAmount);
            setAmount(calculation.finalAmount);
          } else {
            devLogger.debug('No discount applied (totalDiscount = 0)');
          }
        } else {
          devLogger.debug('No remaining payments to calculate discount for');
        }
      } else {
        devLogger.warn('Failed to load settings:', settingsResponse.message);
      }
    } catch (error: unknown) {
      devLogger.error('Failed to load settlement discount:', error);
      // Don't show error to user - discount is optional
    } finally {
      setLoadingDiscount(false);
    }
  }, [application, isSettlement]);

  // Load discount when application is loaded and it's a settlement payment
  useEffect(() => {
    if (application && isSettlement) {
      loadSettlementDiscount();
    }
  }, [application, isSettlement, loadSettlementDiscount]);

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
    // Card payments are processed on the SkipCash hosted checkout page.
    // We intentionally do not collect or validate card details in BLOX.
    setErrors({});
    return true;
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

  const submitBankTransferForReview = async (
    appId: string,
    payAmount: number,
    txnId: string,
    dueDate?: string
  ) => {
    const meta = {
      type: 'bank_transfer_pending',
      dueDate: dueDate || null,
      isSettlement: dueDate === 'settlement',
      reference: bankTransferDetails.reference,
      bankName: bankTransferDetails.bankName,
    };
    const { error } = await supabase.from('payment_transactions').insert({
      application_id: appId,
      amount: payAmount,
      method: 'bank_transfer',
      status: 'pending',
      transaction_id: txnId,
      // Stored as JSON for Admin confirmPendingBankTransfer (legacy plain-text still parsed)
      failure_reason: JSON.stringify(meta),
    });
    if (error) {
      throw new Error(error.message || 'Failed to submit bank transfer for review');
    }
  };

  const handleSubmit = async () => {
    if (!application || !amount) {
      toast.error('Invalid payment information');
      return;
    }

    if (submittingRef.current || processing) {
      return;
    }

    if (checkingCanPay) {
      toast.info('Checking payment permissions...');
      return;
    }

    if (!canPay) {
      toast.error('Payments are disabled for your company.');
      return;
    }

    let isValid = true;
    if (selectedMethod === 'credit_card' || selectedMethod === 'debit_card') {
      isValid = validateCardDetails();
    } else if (selectedMethod === 'bank_transfer') {
      isValid = validateBankTransfer();
    } else if (selectedMethod === 'blox_credit') {
      const payAmount = isSettlement
        ? (discountCalculation && discountCalculation.totalDiscount > 0 ? discountCalculation.finalAmount : amount)
        : (useCustomAmount && customAmount ? parseFloat(customAmount) : amount);
      if (creditsBalance < payAmount) {
        toast.error(`Insufficient Blox Credits. You have ${formatCurrency(creditsBalance)}; need ${formatCurrency(payAmount)}.`);
        return;
      }
    }
    if (!isValid) return;

    try {
      submittingRef.current = true;
      setProcessing(true);

      // Handle card payments through SkipCash (credit card or debit card / QPay)
      if (selectedMethod === 'credit_card' || selectedMethod === 'debit_card') {
        // Generate unique transaction ID using UUID (prevents collisions)
        // Remove dashes to fit SkipCash 40-char limit: TXN-(32 chars) = 36 chars
        const transactionId = `TXN-${crypto.randomUUID().replace(/-/g, '')}`;
        
        // Determine payment amount
        let paymentAmount: number;
        if (isSettlement && application.installmentPlan?.schedule) {
          // Calculate total from remaining payments
          const remainingPayments = application.installmentPlan.schedule.filter(
            (payment: PaymentSchedule) => payment.status !== 'paid'
          );
          const totalOriginalAmount = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
          // Use discounted amount if available, otherwise use original total
          paymentAmount = discountCalculation?.finalAmount || totalOriginalAmount || amount;
        } else {
          // Regular payment - use custom amount if specified, otherwise use schedule amount
          paymentAmount = useCustomAmount && customAmount 
            ? parseFloat(customAmount) 
            : amount;
        }

        // Parse customer name
        const nameParts = (application.customerName || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || firstName;

        // Prepare SkipCash payment request
        // Build return URL for payment callback
        const returnUrl = `${window.location.origin}/customer/applications/${application.id}/payment-callback?transactionId=${encodeURIComponent(transactionId)}&applicationId=${encodeURIComponent(application.id)}`;
        
        // Debit card = QPay only; credit card = SkipCash credit flow
        const isDebitCard = selectedMethod === 'debit_card';

        const skipCashRequest = {
          amount: paymentAmount,
          firstName: firstName,
          lastName: lastName,
          phone: application.customerPhone || '',
          email: application.customerEmail || '',
          transactionId: transactionId,
          returnUrl: returnUrl,
          subject: `Payment for Application ${application.id}`,
          description: isSettlement 
            ? `Settlement payment for application ${application.id}`
            : `Payment installment for application ${application.id}`,
          custom1: JSON.stringify({
            applicationId: application.id,
            paymentScheduleId: paymentSchedule?.id,
            dueDate: paymentSchedule?.dueDate,
            isSettlement: isSettlement,
            paymentId: paymentId,
            transactionId: transactionId,
            paymentMethod: selectedMethod, // credit_card or debit_card for card_type in DB
          }),
          onlyDebitCard: isDebitCard, // true = QPay (debit), false = credit card
        };

        // Process payment through SkipCash
        const result = await skipCashService.processPayment(skipCashRequest);

        const responseData = result.data as any;
        const paymentUrl =
          responseData?.paymentUrl ||
          responseData?.resultObj?.paymentUrl ||
          responseData?.payUrl ||
          responseData?.resultObj?.payUrl;

        if (result.status === 'SUCCESS' && paymentUrl) {
          // Redirect to SkipCash payment page
          window.location.href = paymentUrl;
          return; // Don't continue with other logic, user will be redirected
        } else {
          // Improve error message for users
          const userFriendlyMessage = result.message?.includes('authorization') || result.message?.includes('permission')
            ? 'Payment not authorized. Please contact your administrator.'
            : result.message?.includes('Rate limit') || result.message?.includes('Too many')
            ? 'Too many payment attempts. Please wait a minute and try again.'
            : result.message?.includes('credentials') || result.message?.includes('configuration')
            ? 'Payment system is temporarily unavailable. Please try again later or contact support.'
            : result.message || 'Failed to initiate payment. Please try again.';
          
          toast.error(userFriendlyMessage);
          setProcessing(false);
          submittingRef.current = false;
          return;
        }
      }

      // Handle settlement payment (settle all remaining payments)
      if (isSettlement && application.installmentPlan?.schedule) {
        const remainingPayments = application.installmentPlan.schedule.filter(
          (payment: PaymentSchedule) => payment.status !== 'paid'
        );

        // Use discounted amount if discount was calculated
        const finalSettlementAmount = discountCalculation && discountCalculation.totalDiscount > 0
          ? discountCalculation.finalAmount
          : amount;

        const totalOriginalAmount = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
        let allSucceeded = true;

        if (selectedMethod === 'blox_credit') {
          // Pay each installment with Blox Credits (RPC deducts and marks paid)
          let paidCount = 0;
          for (const payment of remainingPayments) {
            const paymentProportion = payment.amount / totalOriginalAmount;
            const discountedPaymentAmount = finalSettlementAmount * paymentProportion;
            const result = await creditsService.payInstallmentWithCredits(
              application.id,
              payment.dueDate,
              discountedPaymentAmount
            );
            if (result.status !== 'SUCCESS' || !result.data?.success) {
              const totalCount = remainingPayments.length;
              const msg = paidCount > 0
                ? `Partially paid: ${paidCount} of ${totalCount} installments. Insufficient Blox Credits for the rest.`
                : (result.message || `Failed to pay installment for ${payment.dueDate}`);
              toast.error(msg);
              allSucceeded = false;
              break;
            }
            paidCount += 1;
            if (result.data?.newBalance !== undefined) refreshCredits();
          }
          if (allSucceeded) {
            await loadApplication();
            const discountMessage = discountCalculation && discountCalculation.totalDiscount > 0
              ? ` with ${formatCurrency(discountCalculation.totalDiscount)} early settlement discount`
              : '';
            toast.success(`Successfully settled all ${remainingPayments.length} remaining payments using Blox Credits${discountMessage}!`);
            navigate(`/customer/my-applications/${id}/payment-confirmation`, {
              state: {
                transactionId: `TXN-${Date.now()}`,
                amount: finalSettlementAmount,
                method: selectedMethod,
                isSettlement,
                paymentsSettled: remainingPayments.length,
              },
            });
            setProcessing(false);
            submittingRef.current = false;
            return;
          }
          // Partial/failed credit settlement already toasted — do not fall through.
          setProcessing(false);
          submittingRef.current = false;
          return;
        } else if (selectedMethod === 'bank_transfer') {
          // Bank transfer: pending admin verification — never self-mark paid
          const transactionId = `TXN-${crypto.randomUUID().replace(/-/g, '')}`;
          await submitBankTransferForReview(
            application.id,
            finalSettlementAmount,
            transactionId,
            'settlement'
          );
          toast.success(
            'Bank transfer submitted for verification. Installments will be marked paid after admin confirmation.'
          );
          navigate(`/customer/my-applications/${id}/payment-confirmation`, {
            state: {
              transactionId,
              amount: finalSettlementAmount,
              method: selectedMethod,
              isSettlement,
              paymentsSettled: remainingPayments.length,
              pendingReview: true,
            },
          });
          setProcessing(false);
          submittingRef.current = false;
          return;
        } else {
          toast.error('Please select Credit Card, Debit Card, Blox Credit, or Bank Transfer for settlement.');
          setProcessing(false);
          submittingRef.current = false;
          return;
        }
      } else if (!isDailyPayment && paymentSchedule) {
        // Determine the amount to pay (custom amount or full amount)
        const paidAmount = useCustomAmount && customAmount 
          ? parseFloat(customAmount) 
          : amount;
        
        // Validate paid amount
        const maxAmount = paymentSchedule.remainingAmount ?? paymentSchedule.amount;
        if (paidAmount > maxAmount) {
          toast.error(`Payment amount cannot exceed ${formatCurrency(maxAmount)}`);
          setProcessing(false);
          submittingRef.current = false;
          return;
        }
        if (paidAmount <= 0) {
          toast.error('Payment amount must be greater than 0');
          setProcessing(false);
          submittingRef.current = false;
          return;
        }

        // Generate unique transaction ID using UUID (prevents collisions)
        const transactionId = `TXN-${crypto.randomUUID().replace(/-/g, '')}`;

        if (selectedMethod === 'blox_credit') {
          const payResult = await creditsService.payInstallmentWithCredits(
            application.id,
            paymentSchedule.dueDate,
            paidAmount
          );
          if (payResult.status !== 'SUCCESS' || !payResult.data?.success) {
            toast.error(payResult.message || 'Failed to pay with Blox Credits.');
            setProcessing(false);
            submittingRef.current = false;
            return;
          }
          refreshCredits();
          const appResponse = await supabaseApiService.getApplicationById(application.id);
          if (appResponse.status !== 'SUCCESS' || !appResponse.data) {
            toast.error('Payment recorded, but failed to reload application.');
            setProcessing(false);
            submittingRef.current = false;
            return;
          }
          setApplication(appResponse.data);

          // Generate and store receipt (blox credit only — paid confirmed)
          try {
            const updatedPayment = appResponse.data.installmentPlan?.schedule?.find(
              (p: PaymentSchedule) => p.dueDate === paymentSchedule.dueDate
            );
            if (updatedPayment) {
              const receiptBlob = await receiptService.generateAsBlob({
                application: appResponse.data,
                payment: updatedPayment,
                paidAmount,
                transactionId,
                paymentMethod: selectedMethod,
                paidDate: new Date().toISOString(),
              });
              const receiptFileName = `receipt-${transactionId}.pdf`;
              const receiptPath = `receipts/${application.id}/${receiptFileName}`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('documents')
                .upload(receiptPath, receiptBlob, {
                  cacheControl: '3600',
                  upsert: false,
                });
              if (!uploadError && uploadData) {
                const { data: urlData } = supabase.storage
                  .from('documents')
                  .getPublicUrl(receiptPath);
                const updatedSchedule = appResponse.data.installmentPlan?.schedule?.map(
                  (p: PaymentSchedule) => {
                    if (p.dueDate === paymentSchedule.dueDate) {
                      return {
                        ...p,
                        receiptUrl: urlData.publicUrl,
                        receiptGeneratedAt: new Date().toISOString(),
                      };
                    }
                    return p;
                  }
                );
                if (updatedSchedule && appResponse.data.installmentPlan) {
                  await supabaseApiService.updateApplication(application.id, {
                    installmentPlan: {
                      ...appResponse.data.installmentPlan,
                      schedule: updatedSchedule,
                    } as any,
                  });
                }
              }
            }
          } catch (receiptError) {
            console.error('❌ Failed to generate receipt:', receiptError);
          }

          toast.success('Payment processed successfully!');
          navigate(`/customer/my-applications/${id}/payment-confirmation`, {
            state: {
              transactionId,
              amount: paidAmount,
              method: selectedMethod,
              isSettlement,
              paymentsSettled: 1,
              dueDate: paymentSchedule?.dueDate,
            },
          });
          setProcessing(false);
          submittingRef.current = false;
          return;
        }

        if (selectedMethod === 'bank_transfer') {
          await submitBankTransferForReview(
            application.id,
            paidAmount,
            transactionId,
            paymentSchedule.dueDate
          );
          toast.success(
            'Bank transfer submitted for verification. Your installment will be marked paid after admin confirmation.'
          );
          navigate(`/customer/my-applications/${id}/payment-confirmation`, {
            state: {
              transactionId,
              amount: paidAmount,
              method: selectedMethod,
              isSettlement: false,
              paymentsSettled: 1,
              dueDate: paymentSchedule.dueDate,
              pendingReview: true,
            },
          });
          setProcessing(false);
          submittingRef.current = false;
          return;
        }
      }

      toast.error('Unsupported payment method for this flow.');
    } catch (error: any) {
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
      submittingRef.current = false;
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

  // No local card formatting needed (SkipCash handles input UI).

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

      {!Config.paymentsEnabled && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Online payments are temporarily disabled. Bank transfer may still be available, or contact support.
        </Alert>
      )}

      {!checkingCanPay && !canPay && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Payments are currently disabled for your company. Please contact support if you believe this is a mistake.
        </Alert>
      )}

      {isSettlement && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Settle All Remaining Payments
          </Typography>
          <Typography variant="body2">
            You are about to settle all {remainingPaymentsCount} remaining payment(s) for this application. 
            This will mark all outstanding installments as paid.
          </Typography>
        </Alert>
      )}

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
              {PAYMENT_METHODS.filter((m) => {
                if (!m.enabled) return false;
                if (!Config.paymentsEnabled && isCardMethod(m.type)) return false;
                return true;
              }).map((method) => (
                <FormControlLabel
                  key={method.id}
                  value={method.type}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {method.type === 'credit_card' && <CreditCard />}
                      {method.type === 'debit_card' && <AccountBalance />}
                      {method.type === 'bank_transfer' && <AccountBalance />}
                      {method.type === 'blox_credit' && <Stars />}
                      {method.label}
                    </Box>
                  }
                />
              ))}
            </RadioGroup>

            <Divider sx={{ my: 3 }} />

            {/* Credit Card: SkipCash. Debit Card: QPay only. */}
            {selectedMethod === 'credit_card' && (
              <Box className="payment-form">
                <Alert severity="info">
                  You’ll be redirected to our secure payment gateway to enter your credit card details.
                </Alert>
              </Box>
            )}
            {selectedMethod === 'debit_card' && (
              <Box className="payment-form">
                <Alert severity="info">
                  You’ll be redirected to QPay to enter your debit card details.
                </Alert>
              </Box>
            )}

            {selectedMethod === 'blox_credit' && (
              <Box className="payment-form">
                <Alert severity="info">
                  Your Blox Credits balance: <strong>{formatCurrency(creditsBalance)}</strong>. The payment amount will be deducted from your balance.
                </Alert>
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

            {canDefer && !isSettlement && (
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
              disabled={processing || checkingCanPay || !canPay || !amount || amount <= 0}
              startIcon={processing ? <CircularProgress size={20} /> : <CheckCircle />}
            >
              {processing 
                ? 'Processing Payment...' 
                : isSettlement 
                  ? `Settle All Payments (${formatCurrency(discountCalculation && discountCalculation.totalDiscount > 0 ? discountCalculation.finalAmount : amount)})`
                  : `Pay ${formatCurrency(amount)}`
              }
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
            {isSettlement ? (
              <>
                <Box className="summary-item">
                  <Typography variant="body2" color="text.secondary">
                    Payments to Settle
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {remainingPaymentsCount} remaining payment(s)
                  </Typography>
                </Box>
                {loadingDiscount ? (
                  <Box className="summary-item">
                    <Typography variant="body2" color="text.secondary">
                      Calculating discount...
                    </Typography>
                    <CircularProgress size={20} sx={{ mt: 1 }} />
                  </Box>
                ) : discountCalculation ? (
                  <>
                    <Box className="summary-item">
                      <Typography variant="body2" color="text.secondary">
                        Original Amount
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatCurrency(discountCalculation.originalTotal)}
                      </Typography>
                    </Box>
                    {discountCalculation.totalDiscount > 0 ? (
                      <>
                        <Box className="summary-item">
                          <Typography variant="body2" color="text.secondary">
                            Early Settlement Discount
                          </Typography>
                          <Typography variant="body1" fontWeight={600} sx={{ color: '#10B981' }}>
                            -{formatCurrency(discountCalculation.totalDiscount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {discountCalculation.monthsEarly.toFixed(1)} months early
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 2 }} />
                      </>
                    ) : discountCalculation.monthsEarly < 1 ? (
                      <Box className="summary-item">
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            No discount available. You must pay at least 1 month early to qualify for early settlement discounts.
                          </Typography>
                        </Alert>
                      </Box>
                    ) : (
                      <Box className="summary-item">
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            No discount available for this settlement.
                          </Typography>
                        </Alert>
                      </Box>
                    )}
                    <Box className="summary-item">
                      <Typography variant="body2" color="text.secondary">
                        Final Amount to Pay
                      </Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#DAFF01' }}>
                        {formatCurrency(discountCalculation.finalAmount)}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box className="summary-item">
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        Discount calculation unavailable. Please contact support if you believe you qualify for an early settlement discount.
                      </Typography>
                    </Alert>
                  </Box>
                )}
                <Box className="summary-item">
                  <Typography variant="body2" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body1" fontWeight={600} sx={{ color: '#DAFF01' }}>
                    Full Settlement
                  </Typography>
                </Box>
              </>
            ) : paymentSchedule ? (
              <>
                <Box className="summary-item">
                  <Typography variant="body2" color="text.secondary">
                    Payment Due Date
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {new Date(paymentSchedule.dueDate).toLocaleDateString()}
                  </Typography>
                </Box>
                {paymentSchedule.remainingAmount !== undefined && paymentSchedule.remainingAmount > 0 && (
                  <Box className="summary-item">
                    <Typography variant="body2" color="text.secondary">
                      Original Amount
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatCurrency(paymentSchedule.amount)}
                    </Typography>
                  </Box>
                )}
                {paymentSchedule.paidAmount !== undefined && paymentSchedule.paidAmount > 0 && (
                  <Box className="summary-item">
                    <Typography variant="body2" color="text.secondary">
                      Already Paid
                    </Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ color: '#DAFF01' }}>
                      {formatCurrency(paymentSchedule.paidAmount)}
                    </Typography>
                  </Box>
                )}
                {paymentSchedule.remainingAmount !== undefined && paymentSchedule.remainingAmount > 0 && (
                  <Box className="summary-item">
                    <Typography variant="body2" color="text.secondary">
                      Remaining Amount
                    </Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ color: '#ff9800' }}>
                      {formatCurrency(paymentSchedule.remainingAmount)}
                    </Typography>
                  </Box>
                )}
              </>
            ) : null}
            <Divider sx={{ my: 2 }} />
            
            {/* Custom Amount Input - Always Visible */}
            {!isSettlement && paymentSchedule && (paymentSchedule.remainingAmount === undefined || paymentSchedule.remainingAmount > 0) && (
              <Box 
                sx={{ 
                  mb: 3,
                  p: 2,
                  border: '2px solid',
                  borderColor: useCustomAmount ? '#DAFF01' : '#e0e0e0',
                  borderRadius: 2,
                  backgroundColor: useCustomAmount ? 'rgba(218, 255, 1, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.3s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AttachMoney sx={{ color: useCustomAmount ? '#DAFF01' : '#666', fontSize: 20 }} />
                  <Typography 
                    variant="subtitle2" 
                    fontWeight={600}
                    sx={{ color: useCustomAmount ? '#DAFF01' : '#333' }}
                  >
                    Pay Custom Amount (Optional)
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useCustomAmount}
                      onChange={(e) => {
                        setUseCustomAmount(e.target.checked);
                        if (!e.target.checked) {
                          const remainingAmount = paymentSchedule.remainingAmount ?? paymentSchedule.amount;
                          setAmount(remainingAmount);
                          setCustomAmount(remainingAmount.toString());
                        }
                      }}
                      sx={{
                        color: '#DAFF01',
                        '&.Mui-checked': {
                          color: '#DAFF01',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" fontWeight={500}>
                      I want to pay a different amount
                    </Typography>
                  }
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Enter Custom Payment Amount"
                  value={customAmount}
                  disabled={!useCustomAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomAmount(value);
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue > 0) {
                      const maxAmount = paymentSchedule.remainingAmount ?? paymentSchedule.amount;
                      if (numValue <= maxAmount) {
                        setAmount(numValue);
                      } else {
                        setAmount(maxAmount);
                        setCustomAmount(maxAmount.toString());
                        toast.warning(`Maximum amount is ${formatCurrency(maxAmount)}`);
                      }
                    }
                  }}
                  inputProps={{ 
                    min: 0.01,
                    max: paymentSchedule.remainingAmount ?? paymentSchedule.amount,
                    step: 0.01
                  }}
                  helperText={
                    useCustomAmount 
                      ? `Maximum: ${formatCurrency(paymentSchedule.remainingAmount ?? paymentSchedule.amount)}`
                      : 'Enable the checkbox above to enter a custom amount'
                  }
                  sx={{ 
                    mt: 2,
                    '& .MuiInputBase-root': {
                      backgroundColor: useCustomAmount ? '#fff' : '#f5f5f5',
                    },
                  }}
                />
                {useCustomAmount && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      You can pay any amount up to {formatCurrency(paymentSchedule.remainingAmount ?? paymentSchedule.amount)}. 
                      The remaining balance will be due on the next payment date.
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
            
            <Box className="summary-item">
              <Typography variant="body2" color="text.secondary">
                {isSettlement ? 'Total Amount to Pay' : 'Amount to Pay'}
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


