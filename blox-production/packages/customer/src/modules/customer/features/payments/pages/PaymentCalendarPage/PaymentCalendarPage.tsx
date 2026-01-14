import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ArrowBack,
  ChevronLeft,
  ChevronRight,
  ViewDay,
  CalendarMonth,
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '@shared/utils/formatters';
import { StatusBadge, Button as CustomButton } from '@shared/components';
import { supabaseApiService } from '@shared/services';
import { DeferPaymentDialog } from '../../../membership/components/DeferPaymentDialog/DeferPaymentDialog';
import { membershipService } from '../../../../services/membership.service';
import { deferralService } from '../../../../services/deferral.service';
import { EventAvailable } from '@mui/icons-material';
import moment from 'moment';
import { toast } from 'react-toastify';
import type { Application, PaymentStatus } from '@shared/models/application.model';
import { useAppSelector } from '../../../../store/hooks';
import './PaymentCalendarPage.scss';

interface CalendarPayment {
  date: string;
  applicationId: string;
  applicationName: string;
  amount: number;
  status: 'paid' | 'upcoming' | 'overdue' | 'active';
  paymentId?: string;
  application?: Application;
  isDeferred?: boolean;
  isPartiallyDeferred?: boolean;
  originalDueDate?: string;
  originalAmount?: number;
  isDailyConverted?: boolean; // True if this is a daily payment converted from monthly
  originalPaymentIndex?: number; // Index of the original monthly payment
}

export const PaymentCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [currentDate, setCurrentDate] = useState(moment());
  const [payments, setPayments] = useState<CalendarPayment[]>([]);
  const [deferDialogOpen, setDeferDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CalendarPayment | null>(null);
  const [deferring, setDeferring] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('monthly');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const mapPaymentStatus = (status: PaymentStatus | undefined, dueDate: string): CalendarPayment['status'] => {
    if (status === 'paid') return 'paid';
    if (status === 'active') return 'active';
    if (status === 'upcoming') return 'upcoming';
    // due/unpaid/partially_paid (or undefined) → overdue if in the past, otherwise active
    return moment(dueDate).isBefore(moment(), 'day') ? 'overdue' : 'active';
  };

  const loadPayments = useCallback(async () => {
    try {
      if (!user?.email) {
        console.warn('⚠️ No user email found, cannot load payments');
        setPayments([]);
        return;
      }

      // Load applications from Supabase only
      const supabaseResponse = await supabaseApiService.getApplications();
      
      if (supabaseResponse.status === 'SUCCESS' && supabaseResponse.data) {
        // Filter to current user's applications by email
        const userEmail = user.email;
        const userApplications = supabaseResponse.data.filter(
          (app) => app.customerEmail?.toLowerCase() === userEmail.toLowerCase()
        );

        const calendarPayments: CalendarPayment[] = [];
        const startOfMonth = currentDate.clone().startOf('month');
        const endOfMonth = currentDate.clone().endOf('month');

        userApplications.forEach((app) => {
          // Only show payments for active applications
          if (app.status === 'active' && app.installmentPlan?.schedule) {
            const appInterval = (app.installmentPlan.interval || 'Monthly').toString().trim();
            // Case-insensitive comparison
            const isDailyInterval = appInterval.toLowerCase() === 'daily';
            
            // In monthly view, show only monthly payments (exclude daily to avoid confusion)
            // In daily view, we'll convert monthly payments to daily amounts
            const shouldShow = viewMode === 'monthly' 
              ? !isDailyInterval // In monthly view, only show non-daily payments
              : true; // In daily view, show all (we'll convert monthly to daily)

            // Skip if shouldn't show
            if (!shouldShow) {
              return;
            }
            
            let paymentsAdded = 0;
            
            if (viewMode === 'daily' && !isDailyInterval) {
              // Convert monthly payments to daily amounts
              app.installmentPlan.schedule.forEach((payment, index) => {
                const paymentDate = moment(payment.dueDate);
                
                // Check if this monthly payment falls within the current month
                if (paymentDate.isSameOrAfter(startOfMonth) && paymentDate.isSameOrBefore(endOfMonth)) {
                  // Get the month of this payment
                  const paymentMonth = paymentDate.clone().startOf('month');
                  const paymentMonthEnd = paymentDate.clone().endOf('month');
                  const daysInMonth = paymentMonthEnd.diff(paymentMonth, 'days') + 1;
                  
                  // Calculate daily amount: monthly payment / days in month
                  const dailyAmount = payment.amount / daysInMonth;
                  
                  // Create a daily payment for each day of the month
                  for (let day = 0; day < daysInMonth; day++) {
                    const dailyDate = paymentMonth.clone().add(day, 'days');
                    const dailyDateFormatted = dailyDate.format('YYYY-MM-DD');
                    
                    // Only add if it's within the current calendar view month
                    if (dailyDate.isSameOrAfter(startOfMonth) && dailyDate.isSameOrBefore(endOfMonth)) {
                      calendarPayments.push({
                        date: dailyDateFormatted,
                        applicationId: app.id,
                        applicationName: `Application ${app.id}`,
                        amount: dailyAmount,
                        status: mapPaymentStatus(payment.status, dailyDateFormatted),
                        paymentId: `${app.id}-${index}-day-${day}`,
                        application: app,
                        isDeferred: payment.isDeferred || false,
                        isPartiallyDeferred: payment.isPartiallyDeferred || false,
                        originalDueDate: payment.originalDueDate,
                        originalAmount: payment.originalAmount,
                        isDailyConverted: true, // Mark as converted from monthly
                        originalPaymentIndex: index, // Store the original monthly payment index
                      });
                      paymentsAdded++;
                    }
                  }
                }
              });
            } else {
              // Show payments as-is (monthly payments in monthly view, daily payments in daily view)
              app.installmentPlan.schedule.forEach((payment, index) => {
                const paymentDate = moment(payment.dueDate);
                if (paymentDate.isSameOrAfter(startOfMonth) && paymentDate.isSameOrBefore(endOfMonth)) {
                  calendarPayments.push({
                    date: payment.dueDate,
                    applicationId: app.id,
                    applicationName: `Application ${app.id}`,
                    amount: payment.amount,
                    status: mapPaymentStatus(payment.status, payment.dueDate),
                    paymentId: `${app.id}-${index}`,
                    application: app,
                    isDeferred: payment.isDeferred || false,
                    isPartiallyDeferred: payment.isPartiallyDeferred || false,
                    originalDueDate: payment.originalDueDate,
                    originalAmount: payment.originalAmount,
                  });
                  paymentsAdded++;
                }
              });
            }
            
          }
        });

        setPayments(calendarPayments);
      } else {
        throw new Error(supabaseResponse.message || 'Failed to load applications');
      }
    } catch (error: any) {
      console.error('❌ Failed to load payments:', error);
      setPayments([]);
    }
  }, [currentDate, user?.email, viewMode]);

  useEffect(() => {
    if (user?.email) {
      loadPayments();
    }
  }, [currentDate, user?.email, viewMode, loadPayments]);

  // Reload when deferral dialog closes
  useEffect(() => {
    if (!deferDialogOpen) {
      loadPayments();
    }
  }, [deferDialogOpen]);


  // Memoize getPaymentsForDate to avoid recalculating on every render
  const getPaymentsForDate = useCallback((date: moment.Moment): CalendarPayment[] => {
    return payments.filter((p) => moment(p.date).isSame(date, 'day'));
  }, [payments]);

  const renderCalendar = () => {
    const startOfMonth = currentDate.clone().startOf('month').startOf('week');
    const endOfMonth = currentDate.clone().endOf('month').endOf('week');
    const days: moment.Moment[] = [];
    const day = startOfMonth.clone();

    while (day.isSameOrBefore(endOfMonth, 'day')) {
      days.push(day.clone());
      day.add(1, 'day');
    }

    const weekDays = isMobile ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const maxIndicators = isMobile ? (viewMode === 'daily' ? 2 : 1) : (viewMode === 'daily' ? 3 : 2);

    return (
      <Box className="calendar-container">
        <Box className="calendar-header">
          {weekDays.map((day, index) => (
            <Box key={`weekday-${index}-${day}`} className="weekday-header">
              <Typography variant="caption" fontWeight={600} sx={{ color: 'var(--primary-text)' }}>
                {day}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box className="calendar-grid">
          {days.map((day) => {
            const dayPayments = getPaymentsForDate(day);
            const isCurrentMonth = day.isSame(currentDate, 'month');
            const isToday = day.isSame(moment(), 'day');

            return (
              <Box
                key={day.format('YYYY-MM-DD')}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
              >
                <Typography variant="body2" className="day-number">
                  {day.format('D')}
                </Typography>
                {dayPayments.length > 0 && (
                  <Box className="payments-list">
                    {viewMode === 'daily' && dayPayments.length > 0 ? (
                      // For daily view, show aggregated total or individual payments
                      (() => {
                        const totalAmount = dayPayments.reduce((sum, p) => sum + p.amount, 0);
                        // const uniqueApplications = new Set(dayPayments.map(p => p.applicationId));
                        return (
                          <>
                            {dayPayments.slice(0, maxIndicators).map((payment, idx) => {
                              // For daily converted payments, navigate with the date so PaymentPage can identify it
                              const handlePaymentClick = () => {
                                if (payment.isDailyConverted && payment.originalPaymentIndex !== undefined) {
                                  // Navigate with the original payment index and date
                                  navigate(`/customer/applications/${payment.applicationId}/payment`, {
                                    state: {
                                      paymentDate: payment.date,
                                      dailyAmount: payment.amount,
                                      isDailyPayment: true,
                                      originalPaymentIndex: payment.originalPaymentIndex,
                                    }
                                  });
                                } else {
                                  // Regular payment navigation
                                  navigate(`/customer/applications/${payment.applicationId}/payment${payment.paymentId ? `/${payment.paymentId}` : ''}`);
                                }
                              };
                              
                              return (
                                <Box
                                  key={idx}
                                  className={`payment-indicator ${payment.status} ${payment.isDeferred ? 'deferred' : ''} ${payment.isPartiallyDeferred ? 'partially-deferred' : ''}`}
                                  onClick={handlePaymentClick}
                                  title={`${formatCurrency(payment.amount)} - ${payment.applicationName}${payment.isDailyConverted ? ' (Daily)' : ''}`}
                                >
                                  <Typography variant="caption" noWrap>
                                    {formatCurrency(payment.amount)}
                                    {payment.isDeferred && ' ⏱️'}
                                    {payment.isPartiallyDeferred && ' ⏸️'}
                                  </Typography>
                                </Box>
                              );
                            })}
                            {dayPayments.length > maxIndicators && (
                              <Typography variant="caption" className="more-indicator">
                                +{dayPayments.length - maxIndicators} more ({formatCurrency(totalAmount)} total)
                              </Typography>
                            )}
                            {dayPayments.length <= maxIndicators && dayPayments.length > 1 && (
                              <Typography variant="caption" className="more-indicator" sx={{ fontSize: '0.65rem', color: 'var(--primary-text)', fontWeight: 600 }}>
                                Total: {formatCurrency(totalAmount)}
                              </Typography>
                            )}
                          </>
                        );
                      })()
                    ) : (
                      // For monthly view, show up to 2 payments
                      <>
                        {dayPayments.slice(0, maxIndicators).map((payment, idx) => (
                          <Box
                            key={idx}
                            className={`payment-indicator ${payment.status} ${payment.isDeferred ? 'deferred' : ''} ${payment.isPartiallyDeferred ? 'partially-deferred' : ''}`}
                            onClick={() => navigate(`/customer/applications/${payment.applicationId}/payment`)}
                            title={
                              payment.isDeferred
                                ? `Deferred payment${payment.originalDueDate ? ` (originally due ${formatDate(payment.originalDueDate)})` : ''}`
                                : payment.isPartiallyDeferred
                                ? `Partially deferred payment${payment.originalAmount ? ` (original amount: ${formatCurrency(payment.originalAmount)})` : ''}`
                                : undefined
                            }
                          >
                            <Typography variant="caption" noWrap>
                              {formatCurrency(payment.amount)}
                              {payment.isDeferred && ' ⏱️'}
                              {payment.isPartiallyDeferred && ' ⏸️'}
                            </Typography>
                          </Box>
                        ))}
                        {dayPayments.length > maxIndicators && (
                          <Typography variant="caption" className="more-indicator">
                            +{dayPayments.length - maxIndicators} more
                          </Typography>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const handleDeferPayment = async (payment: CalendarPayment, reason?: string, deferredAmount?: number) => {
    if (!payment.application || !payment.date) return;

    try {
      setDeferring(true);
      
      // Create deferral record
      await membershipService.deferPayment(
        payment.application.id,
        payment.date,
        reason,
        deferredAmount
      );

      // Update payment schedule
      const result = await deferralService.updatePaymentScheduleAfterDeferral(
        payment.application.id,
        payment.date,
        deferredAmount
      );

      if (result.updated) {
        if (deferredAmount && deferredAmount < payment.amount) {
          toast.success(`Partial deferral successful! ${deferredAmount.toFixed(2)} QAR deferred to next month.`);
        } else {
          toast.success('Payment deferred successfully!');
        }
        setDeferDialogOpen(false);
        setSelectedPayment(null);
        // Reload payments
        loadPayments();
      } else {
        toast.error('Failed to update payment schedule');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to defer payment');
    } finally {
      setDeferring(false);
    }
  };

  const canDeferPayment = (payment: CalendarPayment): boolean => {
    if (!payment.application) return false;
    const hasMembership = payment.application.bloxMembership?.isActive || false;
    const isEligible = ['upcoming', 'active'].includes(payment.status);
    const canDefer = deferralService.canDeferPayment();
    return hasMembership && isEligible && canDefer;
  };

  const upcomingPayments = payments
    .filter((p) => ['upcoming', 'active'].includes(p.status))
    .sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf())
    .slice(0, 5);

  return (
    <Box className="payment-calendar-page">
      <Button
        variant="text"
        startIcon={<ArrowBack />}
        onClick={() => navigate(-1)}
        className="back-button"
      >
        Back
      </Button>

      <Box className="page-header">
        <Typography variant="h4" className="page-title" sx={{ color: 'var(--primary-text)' }}>
          Payment Calendar
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1.5, sm: 3 },
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {/* View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => {
              if (newMode !== null) {
                setViewMode(newMode);
              }
            }}
            aria-label="payment view mode"
            size="small"
            sx={{
              width: { xs: '100%', sm: 'auto' },
              '& .MuiToggleButton-root': {
                flex: { xs: 1, sm: 'unset' },
                justifyContent: 'center',
                px: { xs: 1.5, sm: 2 },
                py: 1,
                border: '1px solid var(--divider-color)',
                '&.Mui-selected': {
                  backgroundColor: 'var(--primary-color)', /* Lime Yellow */
                  color: 'var(--primary-btn-color)', /* Blox Black text */
                  borderColor: 'var(--primary-color)',
                  '&:hover': {
                    backgroundColor: 'var(--primary-btn-hover)',
                  },
                },
                '&:not(.Mui-selected)': {
                  backgroundColor: 'var(--card-background)', /* Light Grey */
                  color: 'var(--secondary-text)', /* Dark Grey text */
                  '&:hover': {
                    backgroundColor: 'var(--card-hover)',
                  },
                },
              },
            }}
          >
            <ToggleButton value="monthly" aria-label="monthly view">
              {!isMobile && <CalendarMonth sx={{ mr: 1, fontSize: 18 }} />}
              Monthly
            </ToggleButton>
            <ToggleButton value="daily" aria-label="daily view">
              {!isMobile && <ViewDay sx={{ mr: 1, fontSize: 18 }} />}
              Daily
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Box className="month-navigation" sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
            <IconButton onClick={() => setCurrentDate(currentDate.clone().subtract(1, 'month'))}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" className="current-month" sx={{ color: 'var(--primary-text)' }}>
              {currentDate.format('MMMM YYYY')}
            </Typography>
            <IconButton onClick={() => setCurrentDate(currentDate.clone().add(1, 'month'))}>
              <ChevronRight />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Box className="calendar-layout">
        <Box className="calendar-section">
          <Paper className="calendar-paper">
            {payments.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'var(--primary-text)', fontWeight: 700 }}>
                  No Payments Found
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--secondary-text)', opacity: 0.9 }}>
                  {viewMode === 'daily' 
                    ? 'No payments scheduled for this month. Try switching to Monthly view or navigate to a different month.'
                    : 'No monthly payments scheduled for this month. Try navigating to a different month.'}
                </Typography>
              </Box>
            ) : (
              renderCalendar()
            )}
          </Paper>
        </Box>

        <Box className="upcoming-section">
          <Paper className="upcoming-payments-paper">
            <Typography variant="h6" className="section-title">
              Upcoming Payments
            </Typography>
            {upcomingPayments.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'var(--secondary-text)', opacity: 0.8 }}>
                No upcoming payments
              </Typography>
            ) : (
              <Box className="upcoming-list">
                {upcomingPayments.map((payment, idx) => (
                  <Card key={idx} className="payment-card" sx={{ mb: 2 }}>
                    <CardContent>
                      <Box className="payment-card-header">
                        <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--primary-text)' }}>
                          {payment.applicationName}
                        </Typography>
                        <StatusBadge status={payment.status} type="payment" />
                      </Box>
                      <Typography variant="h6" className="payment-amount">
                        {formatCurrency(payment.amount)}
                        {payment.isDeferred && ' ⏱️'}
                        {payment.isPartiallyDeferred && ' ⏸️'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--secondary-text)', opacity: 0.8 }}>
                        Due: {formatDate(payment.date)}
                        {payment.isDeferred && payment.originalDueDate && (
                          <Box component="span" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                            Originally: {formatDate(payment.originalDueDate)}
                          </Box>
                        )}
                        {payment.isPartiallyDeferred && payment.originalAmount && (
                          <Box component="span" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                            Original: {formatCurrency(payment.originalAmount)}
                          </Box>
                        )}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        {canDeferPayment(payment) && (
                          <CustomButton
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setDeferDialogOpen(true);
                            }}
                            startIcon={<EventAvailable />}
                            sx={{ flex: 1 }}
                          >
                            Defer
                          </CustomButton>
                        )}
                        <Button
                          variant="contained"
                          size="small"
                          fullWidth={!canDeferPayment(payment)}
                          sx={{ 
                            flex: canDeferPayment(payment) ? 1 : 'none',
                            backgroundColor: '#0E1909',
                            color: 'var(--primary-color)',
                            border: '1px solid var(--primary-color)',
                            '&:hover': {
                              backgroundColor: '#0E1909',
                              borderColor: 'var(--primary-color)',
                              opacity: 0.9,
                            }
                          }}
                          onClick={() => navigate(`/customer/applications/${payment.applicationId}/payment`)}
                        >
                          Pay Now
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {selectedPayment && (
        <DeferPaymentDialog
          open={deferDialogOpen}
          onClose={() => {
            setDeferDialogOpen(false);
            setSelectedPayment(null);
          }}
          onConfirm={(reason, deferredAmount) => handleDeferPayment(selectedPayment, reason, deferredAmount)}
          payment={{
            id: selectedPayment.paymentId || selectedPayment.date,
            dueDate: selectedPayment.date,
            amount: selectedPayment.amount,
            applicationId: selectedPayment.applicationId,
          }}
          loading={deferring}
        />
      )}
    </Box>
  );
};


