import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Paper,
  Divider,
  RadioGroup,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { History, Edit, Delete, Add, Save, Cancel, CheckCircle } from '@mui/icons-material';
import { Select, type SelectOption, Input, DatePicker, Button } from '@shared/components';
import type { StepProps } from '@shared/components/shared/MultiStepForm/MultiStepForm';
import { Config } from '@shared/config/app.config';
import { formatCurrency, formatDate } from '@shared/utils/formatters';
import { formatMonthsToTenure, parseTenureToMonths } from '@shared/utils/tenure.utils';
import moment from 'moment';
type Moment = moment.Moment;
import type { PaymentSchedule, PaymentStatus } from '@shared/models/application.model';
import { toast } from 'react-toastify';
import './InstallmentPlanStep.scss';

export const InstallmentPlanStep: React.FC<StepProps> = ({ data, updateData }) => {
  const [tenure, setTenure] = useState<string>(data.installmentPlan?.tenure || Config.tenure[0]);
  const [interval, setInterval] = useState<string>(() => {
    // Prefer Monthly as the default for new applications (more intuitive for customers),
    // while preserving any existing stored interval.
    if (data.installmentPlan?.interval) return data.installmentPlan.interval;
    return Config.Interval.includes('Monthly') ? 'Monthly' : Config.Interval[0];
  });
  const [monthlyAmount, setMonthlyAmount] = useState<number>(data.installmentPlan?.monthlyAmount || 0);
  const [totalAmount, setTotalAmount] = useState<number>(data.installmentPlan?.totalAmount || 0);
  const [hasExistingLoan, setHasExistingLoan] = useState<boolean>(data.existingLoan?.enabled || false);
  const [entryMode, setEntryMode] = useState<'auto' | 'fixed' | 'manual'>(data.existingLoan?.entryMode || 'manual');
  const [loanStartDate, setLoanStartDate] = useState<Moment | null>(
    data.existingLoan?.startDate ? moment(data.existingLoan.startDate) : null
  );
  const [totalLoanMonths, setTotalLoanMonths] = useState<number>(data.existingLoan?.totalMonths || 36);
  const [downPayment, setDownPayment] = useState<number>(data.existingLoan?.downPayment || data.installmentPlan?.downPayment || 0);
  const [manualMonthlyPayment, setManualMonthlyPayment] = useState<number>(
    data.existingLoan?.monthlyPaymentAmount || data.installmentPlan?.monthlyAmount || 0
  );
  const [annualRatePercent, setAnnualRatePercent] = useState<number>(
    data.existingLoan?.annualRatePercent ??
      (data.installmentPlan?.annualInterestRate !== undefined
        ? (data.installmentPlan.annualInterestRate * 100)
        : (data.offer?.annualRentRate || 0))
  );
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null);
  const [editingScheduleRow, setEditingScheduleRow] = useState<Partial<PaymentSchedule> | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>(
    data.installmentPlan?.schedule || []
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validation Functions
  const validatePaymentSchedule = (schedule: PaymentSchedule[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (schedule.length === 0) {
      return { isValid: true, errors: [] }; // Empty schedule is valid (not yet generated)
    }

    // 1. Validate all payments have required fields
    schedule.forEach((payment, index) => {
      if (!payment.dueDate) {
        errors.push(`Payment #${index + 1}: Due date is required`);
      }
      if (!payment.amount || payment.amount <= 0) {
        errors.push(`Payment #${index + 1}: Amount must be greater than 0`);
      }
      if (!payment.status) {
        errors.push(`Payment #${index + 1}: Status is required`);
      }
      if (payment.status === 'paid' && !payment.paidDate) {
        errors.push(`Payment #${index + 1}: Paid date is required for paid payments`);
      }
    });

    // 2. Validate dates are sequential (no duplicates, proper order)
    const dates = schedule
      .map((p) => moment(p.dueDate))
      .filter((d) => d.isValid())
      .sort((a, b) => a.valueOf() - b.valueOf());

    // Check for duplicate dates
    const uniqueDates = new Set(dates.map((d) => d.format('YYYY-MM-DD')));
    if (uniqueDates.size < dates.length) {
      errors.push('Duplicate payment dates found. Each payment must have a unique due date.');
    }

    // Check dates are sequential (within same month or next month)
    for (let i = 1; i < dates.length; i++) {
      const prevDate = dates[i - 1];
      const currentDate = dates[i];
      const monthsDiff = currentDate.diff(prevDate, 'months', true);
      
      // Allow same month (different day) or next month, but not more
      if (monthsDiff > 1.5) {
        errors.push(
          `Gap detected: Payment dates should be sequential. Found gap between ${prevDate.format('MMM YYYY')} and ${currentDate.format('MMM YYYY')}`
        );
      }
      if (monthsDiff < 0) {
        errors.push(
          `Payment dates are out of order. ${currentDate.format('MMM YYYY')} comes before ${prevDate.format('MMM YYYY')}`
        );
      }
    }

    // 3. Validate loan amount vs payment totals
    // Note: amortized_fixed schedules include interest, so total payments won't match principal.
    const isAmortizedFixed = hasExistingLoan && entryMode === 'fixed';
    if (!isAmortizedFixed && data.vehicle && downPayment >= 0) {
      const carValue = data.vehicle.price || 0;
      const expectedLoanAmount = carValue - downPayment;
      const totalPaymentAmount = schedule.reduce((sum, p) => sum + (p.amount || 0), 0);

      // For existing loans, we allow some flexibility (within 5% tolerance)
      // since historical loans might have slight discrepancies
      const tolerance = expectedLoanAmount * 0.05;
      const difference = Math.abs(totalPaymentAmount - expectedLoanAmount);

      if (difference > tolerance && expectedLoanAmount > 0) {
        errors.push(
          `Payment total (${formatCurrency(totalPaymentAmount)}) doesn't match expected loan amount (${formatCurrency(expectedLoanAmount)}). Difference: ${formatCurrency(difference)}`
        );
      }
    }

    // 4. Validate paid payments have reasonable paid dates
    schedule.forEach((payment, index) => {
      if (payment.status === 'paid' && payment.paidDate) {
        const dueDate = moment(payment.dueDate);
        const paidDate = moment(payment.paidDate);

        if (!paidDate.isValid()) {
          errors.push(`Payment #${index + 1}: Paid date is invalid`);
        } else if (paidDate.isAfter(moment(), 'day')) {
          errors.push(`Payment #${index + 1}: Paid date cannot be in the future`);
        } else if (paidDate.isBefore(dueDate.subtract(1, 'year'))) {
          errors.push(`Payment #${index + 1}: Paid date seems too early (more than 1 year before due date)`);
        }
      }
    });

    // 5. Validate total months match schedule length (with some flexibility)
    if (totalLoanMonths > 0) {
      const scheduleMonths = dates.length > 0 ? moment(dates[dates.length - 1]).diff(moment(dates[0]), 'months') + 1 : 0;
      const monthsDiff = Math.abs(scheduleMonths - totalLoanMonths);

      if (monthsDiff > 2 && scheduleMonths > 0) {
        errors.push(
          `Schedule duration (${scheduleMonths} months) doesn't match specified loan duration (${totalLoanMonths} months)`
        );
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  // Initialize payment schedule from existing data (only once on mount)
  useEffect(() => {
    if (data.installmentPlan?.schedule && data.installmentPlan.schedule.length > 0 && paymentSchedule.length === 0) {
      setPaymentSchedule(data.installmentPlan.schedule);
    }
    if (data.existingLoan?.monthlyPaymentAmount && manualMonthlyPayment === 0) {
      setManualMonthlyPayment(data.existingLoan.monthlyPaymentAmount);
    } else if (data.installmentPlan?.monthlyAmount && manualMonthlyPayment === 0) {
      setManualMonthlyPayment(data.installmentPlan.monthlyAmount);
    }
    if (data.existingLoan?.annualRatePercent !== undefined && data.existingLoan?.annualRatePercent !== null) {
      setAnnualRatePercent(data.existingLoan.annualRatePercent);
    }
    if (data.existingLoan?.entryMode) {
      setEntryMode(data.existingLoan.entryMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If switching to amortized-fixed and an offer exists, default the annual rate from the offer (unless the admin already entered one).
  useEffect(() => {
    if (entryMode !== 'fixed') return;
    if ((annualRatePercent || 0) > 0) return;
    if (data.offer?.annualRentRate) {
      setAnnualRatePercent(data.offer.annualRentRate);
    }
  }, [entryMode, annualRatePercent, data.offer]);

  const tenureOptions: SelectOption[] = Config.tenure.map((t) => ({ value: t, label: t }));
  const intervalOptions: SelectOption[] = Config.Interval.map((i) => ({ value: i, label: i }));

  // Normal (non-existing-loan) installment calculations
  useEffect(() => {
    if (hasExistingLoan) return;
    calculateInstallments();
  }, [tenure, interval, data.vehicle, data.offer, downPayment, hasExistingLoan]);

  // Existing-loan auto/fixed modes: generate schedule when inputs change.
  // IMPORTANT: do NOT depend on `paymentSchedule` here, since schedule generation itself updates it.
  useEffect(() => {
    if (!hasExistingLoan) return;

    if (
      entryMode === 'auto' &&
      loanStartDate &&
      totalLoanMonths > 0 &&
      data.vehicle &&
      data.offer &&
      downPayment >= 0
    ) {
        generateExistingLoanSchedule();
    }

    if (
      entryMode === 'fixed' &&
      loanStartDate &&
      totalLoanMonths > 0 &&
      data.vehicle &&
      downPayment >= 0
    ) {
      generateFixedAmortizedSchedule();
      }
  }, [
    hasExistingLoan,
    entryMode,
    loanStartDate,
    totalLoanMonths,
    downPayment,
    annualRatePercent,
    interval,
    data.vehicle,
    data.offer,
  ]);

  // Helper function to update data with current schedule (for manual mode)
  const updateDataWithSchedule = useCallback(() => {
    if (!hasExistingLoan || entryMode !== 'manual' || paymentSchedule.length === 0) return;
    
    const updatedPlan = {
      ...data.installmentPlan,
      schedule: paymentSchedule,
      monthlyAmount: manualMonthlyPayment || data.installmentPlan?.monthlyAmount || 0,
    };
    
    const updatedExistingLoan = {
      ...data.existingLoan,
      entryMode: 'manual' as const,
      monthlyPaymentAmount: manualMonthlyPayment,
      totalMonths: totalLoanMonths,
      startDate: loanStartDate?.format('YYYY-MM-DD'),
      downPayment: downPayment,
    };
    
    updateData({
      installmentPlan: updatedPlan,
      existingLoan: updatedExistingLoan,
    });
  }, [hasExistingLoan, entryMode, paymentSchedule, loanStartDate, totalLoanMonths, downPayment, manualMonthlyPayment, data.installmentPlan, data.existingLoan, updateData]);

  // Existing-loan manual mode: propagate manual edits when schedule changes.
  useEffect(() => {
    if (!hasExistingLoan) return;
    if (entryMode !== 'manual') return;
    if (paymentSchedule.length === 0) return;
    updateDataWithSchedule();
  }, [hasExistingLoan, entryMode, paymentSchedule, loanStartDate, totalLoanMonths, downPayment, manualMonthlyPayment, updateDataWithSchedule]);

  const generateSchedule = (
    monthlyPayment: number,
    startDate: Moment,
    totalMonths: number,
    carValue?: number,
    downPayment?: number,
    annualRentalRate?: number,
    paymentInterval?: string
  ): PaymentSchedule[] => {
    const schedule: PaymentSchedule[] = [];
    const now = moment().startOf('day');
    const intervalValue = (paymentInterval ?? interval ?? '').toString().trim().toLowerCase();
    const isDaily = intervalValue === 'daily';
    
    // If we have rental calculation parameters, calculate dynamic rent
    const useDynamicRent = carValue !== undefined && downPayment !== undefined && annualRentalRate !== undefined;
    const loanAmount = useDynamicRent ? (carValue - downPayment) : 0;
    
    if (isDaily) {
      // Daily payment schedule - using actual calendar days per month
      const rentPerDayRate = useDynamicRent ? (annualRentalRate / 365) : 0;
      
      // Start from tomorrow for daily payments
      const firstDueDate = moment(startDate).startOf('day');
      let currentDate = firstDueDate.clone();
      let totalPrincipalPaid = 0;
      
      // Calculate monthly principal payment
      const principalPaymentPerMonth = useDynamicRent ? (loanAmount / totalMonths) : 0;
      
      // Generate payments month by month to handle different month lengths
      for (let monthIndex = 0; monthIndex < totalMonths; monthIndex++) {
        const monthStart = currentDate.clone().startOf('month');
        const monthEnd = currentDate.clone().endOf('month');
        const daysInMonth = monthEnd.diff(monthStart, 'days') + 1; // +1 to include both start and end days
        
        // Calculate daily principal for this month (monthly principal divided by actual days in month)
        const principalPaymentPerDay = principalPaymentPerMonth / daysInMonth;
        
        // Generate daily payments for this month
        for (let dayInMonth = 0; dayInMonth < daysInMonth; dayInMonth++) {
          const dueDate = monthStart.clone().add(dayInMonth, 'days');
          const dueDateFormatted = dueDate.format('YYYY-MM-DD');
          
          // Calculate payment amount
          let paymentAmount = 0;
          
          if (useDynamicRent) {
            // Calculate rent based on Blox's ownership at this point (before this payment)
            // Customer owns: Down Payment + (Principal paid so far)
            const customerOwnership = downPayment + totalPrincipalPaid;
            const bloxOwnership = carValue - customerOwnership;
            const dailyRentForThisDay = bloxOwnership * rentPerDayRate;
            paymentAmount = principalPaymentPerDay + dailyRentForThisDay;
            
            // Update total principal paid after calculating this payment
            totalPrincipalPaid += principalPaymentPerDay;
          } else {
            // Simple daily amount from monthly payment (divided by actual days in this month)
            paymentAmount = monthlyPayment / daysInMonth;
          }
          
          // Determine status: past = paid, today = active, future = upcoming
          const isPast = dueDate.isBefore(now, 'day');
          const isToday = dueDate.isSame(now, 'day');
          
          let status: PaymentStatus;
          if (isPast) {
            status = 'paid';
          } else if (isToday) {
            status = 'active';
          } else {
            status = 'upcoming';
          }
          
          schedule.push({
            dueDate: dueDateFormatted,
            amount: paymentAmount,
            status,
            paidDate: isPast ? dueDateFormatted : undefined,
          });
        }
        
        // Move to next month
        currentDate = monthEnd.clone().add(1, 'day').startOf('month');
      }
    } else {
      // Monthly payment schedule (existing logic)
      // Set due date to the first day of each month for consistency
      const firstDueDate = moment(startDate).startOf('month');
      const principalPaymentPerMonth = useDynamicRent ? (loanAmount / totalMonths) : 0;
      const rentPerPeriodRate = useDynamicRent ? (annualRentalRate / 12) : 0;

      for (let i = 0; i < totalMonths; i++) {
        // Calculate due date as first day of the month (same day each month)
        const dueDate = moment(firstDueDate).add(i, 'months');
        const dueDateFormatted = dueDate.format('YYYY-MM-DD');

        // Calculate payment amount
        let paymentAmount = monthlyPayment;
        
        if (useDynamicRent) {
          // Calculate rent based on Blox's ownership at this point
          // Customer owns: Down Payment + (Principal paid so far)
          const customerOwnership = downPayment + (principalPaymentPerMonth * i);
          const bloxOwnership = carValue - customerOwnership;
          const monthlyRentForThisMonth = bloxOwnership * rentPerPeriodRate;
          paymentAmount = principalPaymentPerMonth + monthlyRentForThisMonth;
        }

        // Determine status: past = paid, current month = active, future = upcoming
        const isPast = dueDate.isBefore(now, 'month');
        const isCurrentMonth = dueDate.isSame(now, 'month');

        let status: PaymentStatus;
        if (isPast) {
          status = 'paid';
        } else if (isCurrentMonth) {
          status = 'active';
        } else {
          status = 'upcoming';
        }

        schedule.push({
          dueDate: dueDateFormatted,
          amount: paymentAmount,
          status,
          paidDate: isPast ? dueDateFormatted : undefined,
        });
      }
    }

    return schedule;
  };

  const calculateAmortizedMonthlyPayment = (principal: number, annualPercent: number, months: number): number => {
    if (principal <= 0 || months <= 0) return 0;
    const r = (annualPercent / 100) / 12;
    if (r <= 0) return principal / months;
    const pow = Math.pow(1 + r, months);
    return (principal * r * pow) / (pow - 1);
  };

  const calculateInstallments = useCallback(() => {
    if (!data.vehicle || !data.offer) return;

    const vehiclePrice = data.vehicle.price || 0;
    // Use stored annualRentalRate from installmentPlan if available (from calculator),
    // otherwise use offer's rate. Stored rate is already a decimal, offer rate is percentage.
    const annualRentRate = data.installmentPlan?.annualRentalRate !== undefined
      ? data.installmentPlan.annualRentalRate
      : (data.offer.annualRentRate || 0) / 100; // Convert to decimal
    
    // Parse tenure consistently: handle both "X Years" and "X Months" formats
    const tenureMonths = parseTenureToMonths(tenure);
    
    // Use down payment from state (matching InstallmentCalculator logic)
    const downPaymentForCalc = hasExistingLoan ? downPayment : (data.installmentPlan?.downPayment || downPayment || 0);
    const loanAmountForCalc = vehiclePrice - downPaymentForCalc;
    
    if (loanAmountForCalc <= 0 || tenureMonths <= 0) {
      setMonthlyAmount(0);
      setTotalAmount(vehiclePrice);
      return;
    }
    
    // Calculate principal payment per month (equal principal payments)
    const principalPaymentPerMonth = loanAmountForCalc / tenureMonths;
    
    // Calculate rent using dynamic rent model (rent decreases as customer ownership increases)
    const rentPerPeriodRate = annualRentRate / 12;
    let totalRentCalculated = 0;
    
    // Calculate total rent over loan term (matching InstallmentCalculator)
    for (let month = 0; month < tenureMonths; month++) {
      const customerOwnership = downPaymentForCalc + (principalPaymentPerMonth * month);
      const bloxOwnership = vehiclePrice - customerOwnership;
      const monthlyRentForThisMonth = bloxOwnership * rentPerPeriodRate;
      totalRentCalculated += monthlyRentForThisMonth;
    }
    
    // Total amount = Vehicle Price + Total Rent (matching InstallmentCalculator)
    const calculatedTotal = vehiclePrice + totalRentCalculated;
    
    // Calculate monthly payment (first month payment = principal + initial rent)
    const initialBloxOwnership = loanAmountForCalc;
    const initialMonthlyRent = initialBloxOwnership * rentPerPeriodRate;
    const firstMonthPayment = principalPaymentPerMonth + initialMonthlyRent;

    setTotalAmount(calculatedTotal);
    setMonthlyAmount(firstMonthPayment); // Show first month payment

    // Generate schedule for all applications
    // For existing loans, use the provided start date and total loan months
    // For new applications, generate schedule starting next month with tenure months
    let generatedSchedule: PaymentSchedule[] = [];
    
    if (hasExistingLoan && loanStartDate) {
      // Existing loan: use provided start date and total loan months
      generatedSchedule = generateSchedule(
        firstMonthPayment, 
        loanStartDate, 
        totalLoanMonths, 
        vehiclePrice, 
        downPaymentForCalc, 
        annualRentRate,
        interval
      );
    } else {
      // New application: generate schedule starting next month for the full tenure
      const isDailyInterval = (interval || '').toString().trim().toLowerCase() === 'daily';
      const startDate = isDailyInterval
        ? moment().startOf('day').add(1, 'day') // Start tomorrow for daily
        : moment().startOf('month').add(1, 'month'); // Start next month for monthly
      generatedSchedule = generateSchedule(
        firstMonthPayment, 
        startDate, 
        tenureMonths, 
        vehiclePrice, 
        downPaymentForCalc, 
        annualRentRate,
        interval
      );
    }

    const updatedPlan = {
      tenure,
      interval,
      monthlyAmount: firstMonthPayment, // First month payment
      totalAmount: calculatedTotal,
      downPayment: downPaymentForCalc,
      annualRentalRate: annualRentRate, // Store the rate used for calculation
      schedule: generatedSchedule,
    };

    updateData({
      installmentPlan: updatedPlan,
    });
  }, [data.vehicle, data.offer, data.installmentPlan, tenure, interval, downPayment, hasExistingLoan, loanStartDate, totalLoanMonths, updateData, generateSchedule]);

  const generateExistingLoanSchedule = () => {
    if (!loanStartDate || totalLoanMonths <= 0 || !data.vehicle || !data.offer) return;

    const carValue = data.vehicle.price || 0;
    const loanAmount = carValue - downPayment;
    
    if (loanAmount <= 0) return;

    // Use stored annualRentalRate from installmentPlan if available, otherwise use offer's rate
    const annualRentalRate = data.installmentPlan?.annualRentalRate !== undefined
      ? data.installmentPlan.annualRentalRate
      : (data.offer.annualRentRate || 0) / 100; // Convert percentage to decimal
    
    // Principal payment per month (equal principal payments)
    const principalPaymentPerMonth = loanAmount / totalLoanMonths;
    
    // Calculate initial monthly rent (first month)
    // Rent is based on Blox's ownership, which decreases over time
    const rentPerPeriodRate = annualRentalRate / 12;
    const initialBloxOwnership = loanAmount; // Blox owns the loan amount initially
    const initialMonthlyRent = initialBloxOwnership * rentPerPeriodRate;
    
    // First month payment = Principal + Initial Rent
    const firstMonthPayment = principalPaymentPerMonth + initialMonthlyRent;
    
    // Calculate total rent over loan term (decreases each month)
    let totalRent = 0;
    for (let month = 0; month < totalLoanMonths; month++) {
      const customerOwnership = downPayment + (principalPaymentPerMonth * month);
      const bloxOwnership = carValue - customerOwnership;
      const monthlyRentForThisMonth = bloxOwnership * rentPerPeriodRate;
      totalRent += monthlyRentForThisMonth;
    }
    
    // Generate schedule with dynamic rent calculation
    const schedule = generateSchedule(firstMonthPayment, loanStartDate, totalLoanMonths, carValue, downPayment, annualRentalRate, interval);
    setPaymentSchedule(schedule);
    setManualMonthlyPayment(firstMonthPayment);
    
    updateData({
      existingLoan: {
        enabled: true,
        startDate: loanStartDate.format('YYYY-MM-DD'),
        totalMonths: totalLoanMonths,
        downPayment,
        carValue,
        loanAmount,
        annualRentalRate: annualRentalRate * 100, // Store as percentage
        monthlyRent: initialMonthlyRent, // First month rent
        principalPaymentPerMonth,
        monthlyAmount: firstMonthPayment, // First month payment
        totalRent,
      },
      installmentPlan: {
        ...(data.installmentPlan || {}),
        tenure: formatMonthsToTenure(totalLoanMonths),
        interval: 'Monthly',
        monthlyAmount: firstMonthPayment, // First month payment (varies per month)
        totalAmount: carValue + totalRent,
        schedule,
        calculationMethod: 'dynamic_rent',
      },
      paymentHistory: schedule
        .filter((s) => s.status === 'paid')
        .map((s, index) => ({
          id: `payment-${index}`,
          amount: s.amount,
          type: 'Installment',
          status: 'paid' as PaymentStatus,
          date: s.paidDate || s.dueDate,
        })),
    });
  };

  const generateFixedAmortizedSchedule = () => {
    if (!loanStartDate || totalLoanMonths <= 0 || !data.vehicle) return;

    const carValue = data.vehicle.price || 0;
    const principal = carValue - downPayment;
    if (principal <= 0) return;

    const rawPayment = calculateAmortizedMonthlyPayment(principal, annualRatePercent, totalLoanMonths);

    // Currency precision is 0 in this repo; floor avoids rounding up (e.g. 1622.6 -> 1622)
    const monthlyPayment = Math.max(0, Math.floor(rawPayment));

    const schedule = generateSchedule(
      monthlyPayment,
      loanStartDate,
      totalLoanMonths,
      undefined,
      undefined,
      undefined,
      'Monthly'
    );

    setPaymentSchedule(schedule);
    setManualMonthlyPayment(monthlyPayment);

    updateData({
      existingLoan: {
        enabled: true,
        entryMode: 'fixed',
        startDate: loanStartDate.format('YYYY-MM-DD'),
        totalMonths: totalLoanMonths,
        downPayment,
        annualRatePercent,
        loanAmount: principal,
        monthlyAmount: monthlyPayment,
      },
      installmentPlan: {
        ...(data.installmentPlan || {}),
        tenure: formatMonthsToTenure(totalLoanMonths),
        interval: 'Monthly',
        monthlyAmount: monthlyPayment,
        // Total cost (consistent with other flows that include vehicle price / down payment):
        // downPayment + sum(monthly payments)
        totalAmount: downPayment + (monthlyPayment * totalLoanMonths),
        downPayment,
        annualInterestRate: (annualRatePercent / 100),
        calculationMethod: 'amortized_fixed',
        schedule,
      },
      loanAmount: principal,
      downPayment,
      paymentHistory: schedule
        .filter((s) => s.status === 'paid')
        .map((s, index) => ({
          id: `payment-${index}`,
          amount: s.amount,
          type: 'Installment',
          status: 'paid' as PaymentStatus,
          date: s.paidDate || s.dueDate,
        })),
    });
  };

  // Removed duplicate updateDataWithSchedule function - using the one with useCallback above (line 247)

  const handleGenerateSchedule = () => {
    if (!loanStartDate || totalLoanMonths <= 0 || manualMonthlyPayment <= 0) {
      toast.error('Please fill in First Payment Date, Total Months, and Monthly Payment Amount');
      return;
    }

    const schedule = generateSchedule(manualMonthlyPayment, loanStartDate, totalLoanMonths, undefined, undefined, undefined, interval);
    
    // Validate generated schedule
    const validation = validatePaymentSchedule(schedule);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.error('Validation failed. Please check the errors below.');
      return;
    }

    setValidationErrors([]);
    setPaymentSchedule(schedule);
    updateDataWithSchedule();
  };

  const handleEditScheduleRow = (index: number) => {
    setEditingScheduleIndex(index);
    setEditingScheduleRow({ ...paymentSchedule[index] });
  };

  const handleSaveScheduleRow = (index: number) => {
    if (!editingScheduleRow) return;

    // Validate single row before saving
    if (!editingScheduleRow.dueDate) {
      toast.error('Due date is required');
      return;
    }
    if (!editingScheduleRow.amount || editingScheduleRow.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (!editingScheduleRow.status) {
      toast.error('Status is required');
      return;
    }
    if (editingScheduleRow.status === 'paid' && !editingScheduleRow.paidDate) {
      toast.error('Paid date is required for paid payments');
      return;
    }

    const updatedSchedule = [...paymentSchedule];
    updatedSchedule[index] = {
      ...updatedSchedule[index],
      ...editingScheduleRow,
    } as PaymentSchedule;

    // Validate entire schedule after update
    const validation = validatePaymentSchedule(updatedSchedule);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.warning('Schedule has validation issues. Check errors below, but changes are saved.');
    } else {
      setValidationErrors([]);
    }

    setPaymentSchedule(updatedSchedule);
    setEditingScheduleIndex(null);
    setEditingScheduleRow(null);
    updateDataWithSchedule();
  };

  const handleCancelEdit = () => {
    setEditingScheduleIndex(null);
    setEditingScheduleRow(null);
  };

  const handleDeleteScheduleRow = (index: number) => {
    const updatedSchedule = paymentSchedule.filter((_, i) => i !== index);
    
    // Re-validate schedule after deletion
    const validation = validatePaymentSchedule(updatedSchedule);
    if (!validation.isValid && updatedSchedule.length > 0) {
      setValidationErrors(validation.errors);
      toast.warning('Schedule has validation issues after deletion.');
    } else {
      setValidationErrors([]);
    }

    setPaymentSchedule(updatedSchedule);
    updateDataWithSchedule();
  };

  const handleAddScheduleRow = () => {
    if (!loanStartDate) {
      toast.error('Please set First Payment Date before adding payments');
      return;
    }

    // Calculate next due date (last payment date + 1 month, or loan start date if empty)
    const lastPaymentDate = paymentSchedule.length > 0
      ? moment(paymentSchedule[paymentSchedule.length - 1].dueDate)
      : moment(loanStartDate).subtract(1, 'month');
    
    const newDueDate = moment(lastPaymentDate).add(1, 'month');

    const newRow: PaymentSchedule = {
      dueDate: newDueDate.format('YYYY-MM-DD'),
      amount: manualMonthlyPayment || 0,
      status: 'upcoming',
    };

    const updatedSchedule = [...paymentSchedule, newRow];
    
    // Validate schedule with new row
    const validation = validatePaymentSchedule(updatedSchedule);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast.warning('New payment added, but schedule has validation issues.');
    } else {
      setValidationErrors([]);
    }

    setPaymentSchedule(updatedSchedule);
    setEditingScheduleIndex(paymentSchedule.length);
    setEditingScheduleRow(newRow);
  };

  return (
    <Box className="installment-plan-step">
      <Typography variant="h3" className="section-title">
        Installment Plan
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Select
            label="Tenure"
            value={tenure}
            onChange={(e) => setTenure(e.target.value as string)}
            options={tenureOptions}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Select
            label="Payment Interval"
            value={interval}
            onChange={(e) => setInterval(e.target.value as string)}
            options={intervalOptions}
          />
        </Grid>
        {!hasExistingLoan && data.vehicle && (
          <Grid item xs={12} sm={6}>
            <Input
              label="Down Payment (QAR)"
              type="number"
              value={downPayment.toString()}
              onChange={(e) => {
                const amount = parseFloat(e.target.value) || 0;
                if (amount >= 0) {
                  setDownPayment(amount);
                }
              }}
              placeholder="0.00"
              helperText="Down payment amount for this loan"
            />
          </Grid>
        )}
      </Grid>

      {/* Existing Loan Section */}
      <Paper variant="outlined" sx={{ mt: 3, p: 3, backgroundColor: '#f9fafb' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <History sx={{ color: '#00cfa2' }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Existing Loan Information
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enable this if the customer has an existing loan that you want to register in the system
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={hasExistingLoan}
              onChange={(e) => {
                setHasExistingLoan(e.target.checked);
                if (!e.target.checked) {
                  updateData({
                    existingLoan: { enabled: false },
                    installmentPlan: {
                      ...data.installmentPlan,
                      schedule: [],
                    },
                  });
                }
              }}
              sx={{ color: '#00cfa2', '&.Mui-checked': { color: '#00cfa2' } }}
            />
          }
          label="This application is for an existing loan"
        />

        {hasExistingLoan && (
          <Box sx={{ mt: 3 }}>
            {/* Entry Mode Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Entry Method
              </Typography>
              <RadioGroup
                value={entryMode}
                onChange={(e) => {
                  setEntryMode(e.target.value as 'auto' | 'fixed' | 'manual');
                  if (e.target.value === 'manual') {
                    // Clear auto-generated schedule when switching to manual
                    setPaymentSchedule([]);
                  }
                }}
                row
              >
                <FormControlLabel
                  value="auto"
                  control={<Radio sx={{ color: '#00cfa2', '&.Mui-checked': { color: '#00cfa2' } }} />}
                  label="Auto-generate (calculate from rates)"
                />
                <FormControlLabel
                  value="fixed"
                  control={<Radio sx={{ color: '#00cfa2', '&.Mui-checked': { color: '#00cfa2' } }} />}
                  label="Fixed monthly (amortized)"
                />
                <FormControlLabel
                  value="manual"
                  control={<Radio sx={{ color: '#00cfa2', '&.Mui-checked': { color: '#00cfa2' } }} />}
                  label="Manual entry (full control)"
                />
              </RadioGroup>
            </Box>

            {/* Auto Mode Requirements */}
            {entryMode === 'auto' && !data.offer && (
              <Box sx={{ mb: 2, p: 2, backgroundColor: '#fff3cd', borderRadius: 2, border: '1px solid #ffc107' }}>
                <Typography variant="body2" color="warning.main">
                  Please select an offer in the previous step to calculate loan details.
                </Typography>
              </Box>
            )}
            
            {entryMode === 'auto' && data.offer && (
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#e7f3ff', borderRadius: 2, border: '1px solid #2196f3' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Selected Offer: {data.offer.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Annual Rental Rate: <strong>{(data.offer.annualRentRate || 0).toFixed(2)}%</strong>
                </Typography>
              </Box>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="First Payment Date"
                  value={loanStartDate}
                  onChange={(date) => {
                    setLoanStartDate(date);
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Term of Rental in Years"
                  type="number"
                  value={(totalLoanMonths / 12).toString()}
                  onChange={(e) => {
                    const years = parseFloat(e.target.value) || 0;
                    if (years > 0) {
                      setTotalLoanMonths(Math.round(years * 12));
                    }
                  }}
                  placeholder="e.g., 3"
                  helperText="Loan term in years (will be converted to months)"
                  inputProps={{ step: 0.5, min: 0.5 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Total Loan Duration (Months)"
                  type="number"
                  value={totalLoanMonths.toString()}
                  onChange={(e) => {
                    const months = parseInt(e.target.value) || 0;
                    if (months > 0) {
                      setTotalLoanMonths(months);
                    }
                  }}
                  placeholder="e.g., 36"
                  helperText="Total number of months for the entire loan"
                />
              </Grid>
              {entryMode === 'fixed' && (
                <Grid item xs={12} sm={6}>
                  <Input
                    label="Annual Rate (%)"
                    type="number"
                    value={annualRatePercent.toString()}
                    onChange={(e) => setAnnualRatePercent(parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 12.06 or 0 for interest-free"
                    helperText="Used to compute fixed monthly installment (amortized). Enter 0 for interest-free loans."
                    inputProps={{ step: 0.01, min: 0 }}
                  />
                </Grid>
              )}
              {data.vehicle && (
                <Grid item xs={12} sm={6}>
                  <Input
                    label="Car value"
                    type="number"
                    value={data.vehicle.price?.toString() || '0'}
                    disabled
                    helperText="Vehicle price (from vehicle selection)"
                  />
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Input
                  label="Down Payment (QAR)"
                  type="number"
                  value={downPayment.toString()}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    if (amount >= 0) {
                      setDownPayment(amount);
                    }
                  }}
                  placeholder="0.00"
                  helperText="Down payment amount for this loan"
                />
              </Grid>
              {data.vehicle && (
                <Grid item xs={12} sm={6}>
                  <Input
                    label="Loan Amount (QAR)"
                    type="number"
                    value={(data.vehicle.price || 0) - downPayment}
                    disabled
                    helperText="Calculated: Car value - Down Payment"
                    sx={{
                      '& .MuiInputBase-input:disabled': {
                        fontWeight: 600,
                        color: '#00cfa2',
                      },
                    }}
                  />
                </Grid>
              )}
              {/* Manual Monthly Payment Input - Always shown in manual mode, optional in auto */}
              {entryMode === 'manual' && (
                <Grid item xs={12} sm={6}>
                  <Input
                    label="Monthly Payment Amount (QAR)"
                    type="number"
                    value={manualMonthlyPayment.toString()}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      if (amount >= 0) {
                        setManualMonthlyPayment(amount);
                      }
                    }}
                    placeholder="e.g., 200"
                    helperText="Enter the monthly payment amount for this existing loan"
                    required
                  />
                </Grid>
              )}
              {entryMode === 'fixed' && (
                <Grid item xs={12} sm={6}>
                  <Input
                    label="Fixed Monthly Installment (QAR)"
                    type="number"
                    value={manualMonthlyPayment.toString()}
                    disabled
                    helperText="Calculated automatically from principal, annual rate, and tenure"
                  />
                </Grid>
              )}
            </Grid>

            {/* Manual Mode: Payment Schedule Editor */}
            {entryMode === 'manual' && (
              <Box sx={{ mt: 3 }}>
                {/* Validation Errors Display */}
                {validationErrors.length > 0 && (
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      backgroundColor: '#ffebee',
                      borderRadius: 2,
                      border: '1px solid #f44336',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#c62828' }}>
                      Validation Errors:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {validationErrors.map((error, idx) => (
                        <li key={idx}>
                          <Typography variant="body2" color="error.main">
                            {error}
                          </Typography>
                        </li>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Validation Success Indicator */}
                {validationErrors.length === 0 && paymentSchedule.length > 0 && (
                  <Box
                    sx={{
                      mb: 2,
                      p: 1.5,
                      backgroundColor: '#e8f5e9',
                      borderRadius: 2,
                      border: '1px solid #4caf50',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <CheckCircle sx={{ color: '#2e7d32', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#2e7d32' }}>
                      Payment schedule is valid
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Payment Schedule
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={handleGenerateSchedule}
                      disabled={!loanStartDate || totalLoanMonths <= 0 || manualMonthlyPayment <= 0}
                    >
                      Generate Schedule
                    </Button>
                    <Button variant="secondary" size="small" startIcon={<Add />} onClick={handleAddScheduleRow}>
                      Add Payment
                    </Button>
                  </Box>
                </Box>

                {paymentSchedule.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Due Date</TableCell>
                          <TableCell>Amount (QAR)</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Paid Date</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentSchedule.map((payment, index) => (
                          <TableRow key={index} hover>
                            {editingScheduleIndex === index ? (
                              <>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                  <DatePicker
                                    value={editingScheduleRow?.dueDate ? moment(editingScheduleRow.dueDate) : null}
                                    onChange={(date) =>
                                      setEditingScheduleRow({
                                        ...editingScheduleRow,
                                        dueDate: date ? date.format('YYYY-MM-DD') : '',
                                      })
                                    }
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={editingScheduleRow?.amount?.toString() || '0'}
                                    onChange={(e) =>
                                      setEditingScheduleRow({
                                        ...editingScheduleRow,
                                        amount: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    size="small"
                                    sx={{ width: '120px' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={editingScheduleRow?.status || 'upcoming'}
                                    onChange={(e) =>
                                      setEditingScheduleRow({
                                        ...editingScheduleRow,
                                        status: e.target.value as PaymentStatus,
                                      })
                                    }
                                    size="small"
                                    options={[
                                      { value: 'paid', label: 'Paid' },
                                      { value: 'active', label: 'Active' },
                                      { value: 'upcoming', label: 'Upcoming' },
                                    ]}
                                  />
                                </TableCell>
                                <TableCell>
                                  <DatePicker
                                    value={
                                      editingScheduleRow?.paidDate ? moment(editingScheduleRow.paidDate) : null
                                    }
                                    onChange={(date) =>
                                      setEditingScheduleRow({
                                        ...editingScheduleRow,
                                        paidDate: date ? date.format('YYYY-MM-DD') : undefined,
                                      })
                                    }
                                    size="small"
                                    disabled={editingScheduleRow?.status !== 'paid'}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton size="small" color="primary" onClick={() => handleSaveScheduleRow(index)}>
                                    <Save />
                                  </IconButton>
                                  <IconButton size="small" onClick={handleCancelEdit}>
                                    <Cancel />
                                  </IconButton>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{formatDate(payment.dueDate)}</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(payment.amount)}</TableCell>
                                <TableCell>
                                  <Box
                                    sx={{
                                      display: 'inline-block',
                                      px: 1,
                                      py: 0.5,
                                      borderRadius: 1,
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      backgroundColor:
                                        payment.status === 'paid'
                                          ? '#d4edda'
                                          : payment.status === 'active'
                                          ? '#fff3cd'
                                          : '#e7f3ff',
                                      color:
                                        payment.status === 'paid'
                                          ? '#155724'
                                          : payment.status === 'active'
                                          ? '#856404'
                                          : '#004085',
                                    }}
                                  >
                                    {payment.status}
                                  </Box>
                                </TableCell>
                                <TableCell>{payment.paidDate ? formatDate(payment.paidDate) : '-'}</TableCell>
                                <TableCell align="center">
                                  <Tooltip title="Edit">
                                    <IconButton size="small" onClick={() => handleEditScheduleRow(index)}>
                                      <Edit fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteScheduleRow(index)}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No payment schedule yet. Enter monthly payment amount and click "Generate Schedule" or add payments manually.
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            {entryMode === 'auto' && loanStartDate && totalLoanMonths > 0 && data.vehicle && data.offer && (
              (() => {
                const carValue = data.vehicle.price || 0;
                const loanAmount = carValue - downPayment;
                const annualRentalRate = (data.offer.annualRentRate || 0) / 100;
                const rentPerPeriodRate = annualRentalRate / 12;
                const monthlyRent = carValue * rentPerPeriodRate;
                const principalPaymentPerMonth = loanAmount > 0 ? loanAmount / totalLoanMonths : 0;
                const monthlyPayment = principalPaymentPerMonth + monthlyRent;
                const totalRent = monthlyRent * totalLoanMonths;
                const schedule = loanAmount > 0 ? generateSchedule(monthlyPayment, loanStartDate, totalLoanMonths, undefined, undefined, undefined, interval) : [];
                const paidCount = schedule.filter((s) => s.status === 'paid').length;
                const pendingCount = schedule.filter((s) => s.status === 'upcoming' || s.status === 'active').length;

                return loanAmount > 0 ? (
                  <Box sx={{ mt: 3, p: 3, backgroundColor: '#ffffff', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 3 }}>
                      Summary (with no extra payments)
                    </Typography>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Car value
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(carValue)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Down Payment
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(downPayment)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Loan Amount
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ color: '#00cfa2' }}>
                          {formatCurrency(loanAmount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Principal Payment per Month
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(principalPaymentPerMonth)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Annual Rental based on car value
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {(annualRentalRate * 100).toFixed(2)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Monthly rent
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(monthlyRent)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Term of Rental in Years
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {(totalLoanMonths / 12).toFixed(1)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Frequency of Payment
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          Monthly
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Number of Payments
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {totalLoanMonths}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Rent Per Period
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {(rentPerPeriodRate * 100).toFixed(2)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Total Monthly Payment including rent
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ color: '#00cfa2' }}>
                          {formatCurrency(monthlyPayment)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Total Rent
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(totalRent)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="caption" color="text.secondary">
                          Total Asset + total rent
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ color: '#00cfa2' }}>
                          {formatCurrency(carValue + totalRent)}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                      Payment Schedule Preview
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Past Payments (Paid)
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#00cfa2', fontWeight: 600 }}>
                          {paidCount}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Future Payments (Pending)
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#f59e0b', fontWeight: 600 }}>
                          {pendingCount}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ mt: 2, p: 2, backgroundColor: '#ffebee', borderRadius: 2, border: '1px solid #f44336' }}>
                    <Typography variant="body2" color="error.main">
                      Loan amount must be greater than 0. Please adjust the down payment.
                    </Typography>
                  </Box>
                );
              })()
            )}
          </Box>
        )}
      </Paper>

      {monthlyAmount > 0 && !hasExistingLoan && data.vehicle && data.offer && (() => {
        const vehiclePrice = data.vehicle.price || 0;
        const downPaymentForCalc = downPayment || 0;
        const loanAmountForCalc = vehiclePrice - downPaymentForCalc;
        
        // Parse tenure consistently: handle both "X Years" and "X Months" formats
        let tenureMonths = 0;
        if (tenure.includes('Year')) {
          const years = parseInt(tenure.split(' ')[0]) || 0;
          const monthsPart = tenure.match(/(\d+)\s*Month/i);
          const months = monthsPart ? parseInt(monthsPart[1]) : 0;
          tenureMonths = (years * 12) + months;
        } else if (tenure.includes('Month')) {
          tenureMonths = parseInt(tenure.replace(/\D/g, '')) || 12;
        } else {
          // Fallback: assume it's years if no unit specified
          tenureMonths = (parseInt(tenure.replace(/\D/g, '')) || 1) * 12;
        }
        
        // Use stored annualRentalRate if available, otherwise use offer's rate
        const annualRentRate = data.installmentPlan?.annualRentalRate !== undefined
          ? data.installmentPlan.annualRentalRate
          : (data.offer.annualRentRate || 0) / 100;
        const rentPerPeriodRate = annualRentRate / 12;
        const principalPaymentPerMonth = loanAmountForCalc / tenureMonths;
        
        // Calculate total rent
        let totalRentCalculated = 0;
        for (let month = 0; month < tenureMonths; month++) {
          const customerOwnership = downPaymentForCalc + (principalPaymentPerMonth * month);
          const bloxOwnership = vehiclePrice - customerOwnership;
          const monthlyRentForThisMonth = bloxOwnership * rentPerPeriodRate;
          totalRentCalculated += monthlyRentForThisMonth;
        }

        // Calculate monthly payment schedule showing each month with rent details
        const calculateMonthlySchedule = () => {
          const schedule: Array<{ 
            month: number; 
            monthLabel: string;
            principal: number; 
            rent: number;
            totalPayment: number;
            customerOwnership: number;
            bloxOwnership: number;
            year: number;
          }> = [];
          
          if (loanAmountForCalc <= 0 || tenureMonths <= 0) return schedule;

          const startDate = moment().startOf('month').add(1, 'month');
          
          for (let month = 0; month < tenureMonths; month++) {
            const monthNumber = month + 1;
            const year = Math.floor(month / 12) + 1;
            const dueDate = moment(startDate).add(month, 'months');
            
            // Principal payment (equal each month)
            const principal = principalPaymentPerMonth;
            
            // Calculate ownership shares
            const customerOwnership = downPaymentForCalc + (principalPaymentPerMonth * month);
            const bloxOwnership = vehiclePrice - customerOwnership;
            const rent = bloxOwnership * rentPerPeriodRate;
            
            const totalPayment = principal + rent;

            schedule.push({
              month: monthNumber,
              monthLabel: `${dueDate.format('MMM YYYY')} (Month ${monthNumber})`,
              principal,
              rent,
              totalPayment,
              customerOwnership,
              bloxOwnership,
              year,
            });
          }

          return schedule;
        };

        const monthlySchedule = calculateMonthlySchedule();

        return (
          <>
            <Divider sx={{ my: 3 }} />
            <Box className="installment-plan-section" sx={{ mt: 3 }}>
              <Typography variant="h6" className="section-title" sx={{ fontWeight: 600, mb: 2 }}>
                Installment Plan
              </Typography>
              
              {/* Vehicle Information */}
              {data.vehicle && (
                <Box 
                  sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: 2, 
                    p: 2.5, 
                    backgroundColor: '#F9FAFB', 
                    borderRadius: 2,
                    mb: 2
                  }}
                >
                  <Box className="plan-item" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Vehicle
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {data.vehicle.make} {data.vehicle.model}
                    </Typography>
                  </Box>
                  <Box className="plan-item" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Trim
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {data.vehicle.trim}
                    </Typography>
                  </Box>
                  <Box className="plan-item" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Model Year
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {data.vehicle.modelYear}
                    </Typography>
                  </Box>
                  <Box className="plan-item" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Vehicle Price
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {formatCurrency(vehiclePrice)}
                    </Typography>
                  </Box>
                </Box>
              )}

              <Box 
                className="plan-details" 
                sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: 2, 
                  p: 2.5, 
                  backgroundColor: '#F9FAFB', 
                  borderRadius: 2 
                }}
              >
                <Box className="plan-item" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Down Payment
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatCurrency(downPaymentForCalc)}
                  </Typography>
                </Box>
                <Box className="plan-item" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Loan Amount
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatCurrency(loanAmountForCalc)}
                  </Typography>
                </Box>
                <Box className="plan-item" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tenure
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {tenureMonths} months
                  </Typography>
                </Box>
                <Box className="plan-item" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Rent
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatCurrency(totalRentCalculated)}
                  </Typography>
                </Box>
                <Box className="plan-item" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Amount
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatCurrency(monthlyAmount)} per month
                  </Typography>
                </Box>
                <Box className="plan-item" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {formatCurrency(totalAmount)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Payment Schedule by Month */}
            {monthlySchedule.length > 0 && (
              <Box className="payment-schedule-section" sx={{ mt: 3 }}>
                <Typography variant="h6" className="section-title" sx={{ fontWeight: 600, mb: 2 }}>
                  Payment Schedule (Month to Month)
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Month</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Principal</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Rent</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Total Payment</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Customer Share</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Blox Share</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monthlySchedule.map((scheduleItem, index) => {
                        const isYearStart = index === 0 || monthlySchedule[index - 1]?.year !== scheduleItem.year;
                        return (
                          <React.Fragment key={scheduleItem.month}>
                            {isYearStart && (
                              <TableRow sx={{ backgroundColor: '#F0F9FF' }}>
                                <TableCell colSpan={7} sx={{ fontWeight: 600, color: '#00CFA2', py: 1 }}>
                                  Year {String(scheduleItem.year).padStart(2, '0')}
                                </TableCell>
                              </TableRow>
                            )}
                            <TableRow 
                              sx={{ 
                                '&:hover': { backgroundColor: '#FAFAFA' },
                                borderLeft: isYearStart ? '3px solid #00CFA2' : 'none'
                              }}
                            >
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  Month {scheduleItem.month}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {scheduleItem.monthLabel.split('(')[0].trim()}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={500}>
                                  {formatCurrency(scheduleItem.principal)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={500} color="text.secondary">
                                  {formatCurrency(scheduleItem.rent)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight={600} sx={{ color: '#00CFA2' }}>
                                  {formatCurrency(scheduleItem.totalPayment)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2" 
                                  fontWeight={600} 
                                  sx={{ 
                                    color: '#F59E0B',
                                    backgroundColor: '#FEF3C7',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    display: 'inline-block'
                                  }}
                                >
                                  {formatCurrency(scheduleItem.customerOwnership)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography 
                                  variant="body2" 
                                  fontWeight={600} 
                                  sx={{ 
                                    color: '#10B981',
                                    backgroundColor: '#D1FAE5',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    display: 'inline-block'
                                  }}
                                >
                                  {formatCurrency(scheduleItem.bloxOwnership)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        );
      })()}
    </Box>
  );
};
