import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, FormControlLabel, Divider, Switch, RadioGroup, Radio, FormControl, FormLabel } from '@mui/material';
import { Input } from '@shared/components';
import { Select, type SelectOption } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import { MembershipConfig } from '@shared/config/app.config';
import moment from 'moment';
import './InstallmentCalculator.scss';

interface InstallmentCalculatorProps {
  vehiclePrice: number;
  onDataChange?: (data: InstallmentCalculatorData) => void;
}

export interface InstallmentCalculatorData {
  downPayment: number;
  termMonths: number;
  salary: number;
  durationOfResidence: string;
  monthlyLiabilities: string;
  employmentType: string;
  hasBloxMembership: boolean;
  membershipType: 'monthly' | 'yearly';
  loanAmount: number;
  monthlyPayment: number;
  totalRent: number;
  totalMembership: number;
  paymentSchedule: PaymentScheduleYear[];
}

interface PaymentScheduleYear {
  year: number;
  /** Fixed monthly installment (principal + interest) */
  monthlyInstallment: number;
  /** Total installments paid in this year (principal + interest) */
  totalInstallmentsYear: number;
  annualInsurance: number;
}

interface MonthlyScheduleItem {
  month: number;
  monthLabel: string;
  principal: number;
  rent: number;
  totalPayment: number;
  customerOwnership: number;
  bloxOwnership: number;
  year: number;
}

export const InstallmentCalculator: React.FC<InstallmentCalculatorProps> = ({ vehiclePrice, onDataChange }) => {
  // Down Payment & Term
  const [downPayment, setDownPayment] = useState<number>(0);
  const [termMonths, setTermMonths] = useState<number>(36);

  // Application Info
  const [salary, setSalary] = useState<number>(0);
  const [durationOfResidence, setDurationOfResidence] = useState<string>('');
  const [monthlyLiabilities, setMonthlyLiabilities] = useState<string>('');
  const [employmentType, setEmploymentType] = useState<string>('');

  // Additional Options
  const [hasBloxMembership, setHasBloxMembership] = useState<boolean>(false);
  const [membershipType, setMembershipType] = useState<'monthly' | 'yearly'>('monthly');

  // Options
  const residenceOptions: SelectOption[] = [
    { value: 'less-than-6-months', label: 'Less than 6 months' },
    { value: 'between-6-12-months', label: 'Between 6 and 12 months' },
    { value: 'more-than-12-months', label: 'More than 12 months' },
  ];

  const liabilitiesOptions: SelectOption[] = [
    { value: '5000to6999', label: '5000 to 6999' },
    { value: '7000to8999', label: '7000 to 8999' },
    { value: '9000to11999', label: '9000 to 11999' },
    { value: '12000to14999', label: '12000 to 14999' },
    { value: 'more-than-15000', label: 'More than 15000' },
  ];

  const employmentOptions: SelectOption[] = [
    { value: 'gov-or-semi-gov', label: 'Government or Semi-Government' },
    { value: 'private-international', label: 'Private International' },
    { value: 'private-local', label: 'Private Local' },
    { value: 'self-employed', label: 'Self-Employed' },
  ];

  // Calculations
  const loanAmount = vehiclePrice - downPayment;
  const totalAmount = vehiclePrice;
  const carValue = vehiclePrice;

  // Calculate annual rental rate based on application info (simplified logic) - memoized
  const annualRentalRate = useMemo(() => {
    let rate = 0.12; // Base 12% annual rental rate

    // Adjust based on employment type
    if (employmentType === 'gov-or-semi-gov') {
      rate -= 0.02; // Lower rate for government
    } else if (employmentType === 'private-international') {
      rate += 0.01; // Slightly higher
    } else if (employmentType === 'self-employed') {
      rate += 0.03; // Higher for self-employed
    }

    // Adjust based on residence duration
    if (durationOfResidence === 'more-than-12-months') {
      rate -= 0.01;
    } else if (durationOfResidence === 'less-than-6-months') {
      rate += 0.02;
    }

    // Adjust based on salary to liabilities ratio
    if (salary > 0 && monthlyLiabilities) {
      const liabilities = parseFloat(monthlyLiabilities.split('to')[0].trim());
      const ratio = salary / (liabilities || 1);
      if (ratio > 3) {
        rate -= 0.02;
      } else if (ratio < 1.5) {
        rate += 0.03;
      }
    }

    return Math.max(0.08, Math.min(0.20, rate)); // Clamp between 8% and 20%
  }, [employmentType, durationOfResidence, salary, monthlyLiabilities]);

  // Simple principal-per-month (for display only, not used for the real schedule)
  const principalPaymentPerMonth = useMemo(() => {
    if (loanAmount <= 0 || termMonths <= 0) return 0;
    return loanAmount / termMonths;
  }, [loanAmount, termMonths]);

  // Amortized monthly payment + first month interest (using annualRentalRate as annual interest)
  const { monthlyPayment, firstMonthInterest } = useMemo(() => {
    if (loanAmount <= 0 || termMonths <= 0) {
      return { monthlyPayment: 0, firstMonthInterest: 0 };
    }

    const monthlyRate = annualRentalRate > 0 ? annualRentalRate / 12 : 0;

    // Zero-interest edge case
    if (monthlyRate === 0) {
      const payment = loanAmount / termMonths;
      return { monthlyPayment: payment, firstMonthInterest: 0 };
    }

    const pow = Math.pow(1 + monthlyRate, termMonths);
    const payment = loanAmount * (monthlyRate * pow) / (pow - 1);
    const firstInterest = loanAmount * monthlyRate;

    return { monthlyPayment: payment, firstMonthInterest: firstInterest };
  }, [loanAmount, termMonths, annualRentalRate]);

  // Amortized monthly schedule (principal + interest)
  const monthlySchedule = useMemo(() => {
    const schedule: MonthlyScheduleItem[] = [];
    if (loanAmount <= 0 || termMonths <= 0 || monthlyPayment <= 0) return schedule;

    const startDate = moment().startOf('month').add(1, 'month');
    const monthlyRate = annualRentalRate > 0 ? annualRentalRate / 12 : 0;

    let balance = loanAmount;

    for (let month = 0; month < termMonths; month++) {
      const monthNumber = month + 1;
      const year = Math.floor(month / 12) + 1;
      const dueDate = moment(startDate).add(month, 'months');

      const interest = monthlyRate > 0 ? balance * monthlyRate : 0;
      let principal = monthlyPayment - interest;

      // Guard against rounding issues on the last payment
      if (month === termMonths - 1) {
        principal = balance;
      }

      const totalPayment = principal + interest;
      balance = Math.max(0, balance - principal);

      schedule.push({
        month: monthNumber,
        monthLabel: `${dueDate.format('MMM YYYY')} (Month ${monthNumber})`,
        principal,
        rent: interest, // keep field name 'rent' for compatibility
        totalPayment,
        customerOwnership: loanAmount - balance,
        bloxOwnership: balance,
        year,
      });
    }

    return schedule;
  }, [loanAmount, termMonths, monthlyPayment, annualRentalRate]);

  // Total interest over the term (for summary display)
  const totalRent = useMemo(() => {
    if (monthlySchedule.length === 0) return 0;
    return monthlySchedule.reduce((sum, item) => sum + item.rent, 0);
  }, [monthlySchedule]);

  // Total installment amount (principal + interest) over the term
  const totalInstallmentAmount = useMemo(() => {
    if (monthlySchedule.length === 0) return 0;
    return monthlySchedule.reduce((sum, item) => sum + item.totalPayment, 0);
  }, [monthlySchedule]);

  // Blox Membership cost calculation
  const membershipCostPerMonth = MembershipConfig.costPerMonth;
  const membershipCostPerYear = MembershipConfig.costPerYear;
  const totalMembership = hasBloxMembership 
    ? (membershipType === 'yearly' 
        ? membershipCostPerYear * Math.ceil(termMonths / 12) 
        : membershipCostPerMonth * termMonths)
    : 0;

  // Calculate yearly summary based on total monthly payments (principal + interest)
  const paymentSchedule = useMemo(() => {
    const schedule: PaymentScheduleYear[] = [];
    if (monthlySchedule.length === 0) return schedule;

    let currentYear = 0;
    let yearTotal = 0; // principal + interest for that year

    monthlySchedule.forEach((item) => {
      if (item.year !== currentYear) {
        if (currentYear > 0) {
          schedule.push({
            year: currentYear,
            monthlyInstallment: monthlyPayment,
            totalInstallmentsYear: yearTotal,
            annualInsurance: 0,
          });
        }
        currentYear = item.year;
        yearTotal = 0;
      }
      yearTotal += item.totalPayment;
    });

    // Push last year
    if (currentYear > 0) {
      schedule.push({
        year: currentYear,
        monthlyInstallment: monthlyPayment,
        totalInstallmentsYear: yearTotal,
        annualInsurance: 0,
      });
    }

    return schedule;
  }, [monthlySchedule, monthlyPayment]);

  // Expose data to parent component - use useMemo to create stable object reference
  const calculatorData = useMemo(
    () => ({
      downPayment,
      termMonths,
      salary,
      durationOfResidence,
      monthlyLiabilities,
      employmentType,
      hasBloxMembership,
      membershipType,
      loanAmount,
      monthlyPayment,
      monthlyRent: firstMonthInterest, // First month interest for display
      annualRentalRate,
      principalPaymentPerMonth,
      totalRent,
      totalMembership,
      paymentSchedule,
    }),
    [
      downPayment,
      termMonths,
      salary,
      durationOfResidence,
      monthlyLiabilities,
      employmentType,
      hasBloxMembership,
      membershipType,
      loanAmount,
      monthlyPayment,
      firstMonthInterest,
      annualRentalRate,
      principalPaymentPerMonth,
      totalRent,
      totalMembership,
      paymentSchedule,
    ]
  );

  useEffect(() => {
    if (onDataChange) {
      onDataChange(calculatorData);
    }
  }, [calculatorData, onDataChange]);

  return (
    <Box className="installment-calculator">
      {/* Down Payment Section */}
      <Box className="calculator-section">
        <Typography variant="h6" className="section-title">
          Down Payment
        </Typography>
        <Box className="input-group">
          <Input
            type="number"
            label="Down Payment"
            value={downPayment || ''}
            onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
            placeholder="Enter Down Payment"
          />
        </Box>
        <Box className="input-group">
          <Input
            type="number"
            label="Enter term (months)"
            value={termMonths || ''}
            onChange={(e) => setTermMonths(parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </Box>
        {downPayment > 0 && (
          <Typography variant="body2" className="down-payment-display">
            {formatCurrency(downPayment)}
          </Typography>
        )}
      </Box>

      {/* Application Info Section */}
      <Box className="calculator-section">
        <Typography variant="h6" className="section-title">
          Application Info
        </Typography>
        <Box className="input-group">
          <Input
            type="number"
            label="Salary"
            value={salary || ''}
            onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
            placeholder="Enter Salary"
          />
        </Box>
        <Box className="input-group">
          <Select
            label="Duration Of Residence"
            value={durationOfResidence}
            onChange={(e) => setDurationOfResidence(e.target.value as string)}
            options={residenceOptions}
          />
        </Box>
        <Box className="input-group">
          <Select
            label="Monthly Liabilities"
            value={monthlyLiabilities}
            onChange={(e) => setMonthlyLiabilities(e.target.value as string)}
            options={liabilitiesOptions}
          />
        </Box>
        <Box className="input-group">
          <Select
            label="Employment Type"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as string)}
            options={employmentOptions}
          />
        </Box>
      </Box>

      {/* Summary Section */}
      {(downPayment > 0 || salary > 0) && (
        <Box className="summary-section">
          <Box className="summary-item">
            <Typography variant="body2" color="text.secondary">
              Total Amount
            </Typography>
            <Typography variant="h6">{formatCurrency(totalAmount)}</Typography>
          </Box>
          <Box className="summary-item">
            <Typography variant="body2" color="text.secondary">
              Loan Amount
            </Typography>
            <Typography variant="h6">{formatCurrency(loanAmount)}</Typography>
          </Box>
        </Box>
      )}

      {/* Additional Options */}
      <Box className="options-section">
        <FormControlLabel
          control={
            <Switch
              checked={hasBloxMembership}
              onChange={(e) => {
                setHasBloxMembership(e.target.checked);
                if (!e.target.checked) {
                  setMembershipType('monthly'); // Reset to default
                }
              }}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#00CFA2',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#00CFA2',
                },
              }}
            />
          }
          label={
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Blox Membership
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Get 3 payment deferrals per year. Deferrals are per customer account.
              </Typography>
            </Box>
          }
        />
        
        {hasBloxMembership && (
          <Box sx={{ mt: 2, ml: 4, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.875rem', fontWeight: 600 }}>
                Membership Plan
              </FormLabel>
              <RadioGroup
                value={membershipType}
                onChange={(e) => setMembershipType(e.target.value as 'monthly' | 'yearly')}
                row
              >
                <FormControlLabel
                  value="monthly"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Monthly: {formatCurrency(membershipCostPerMonth)}/month
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total: {formatCurrency(membershipCostPerMonth * termMonths)} for {termMonths} months
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="yearly"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Yearly: {formatCurrency(membershipCostPerYear)}/year
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Save {formatCurrency((membershipCostPerMonth * 12) - membershipCostPerYear)} per year
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </Box>
        )}
      </Box>

      {/* Installment Plan */}
      {downPayment > 0 && termMonths > 0 && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box className="installment-plan-section">
            <Typography variant="h6" className="section-title">
              Installment Plan
            </Typography>
            <Box className="plan-details">
              <Box className="plan-item">
                <Typography variant="body2" color="text.secondary">
                  Down Payment
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {formatCurrency(downPayment)}
                </Typography>
              </Box>
              <Box className="plan-item">
                <Typography variant="body2" color="text.secondary">
                  Loan Amount
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {formatCurrency(loanAmount)}
                </Typography>
              </Box>
              <Box className="plan-item">
                <Typography variant="body2" color="text.secondary">
                  Tenure
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {termMonths}
                </Typography>
              </Box>
              <Box className="plan-item">
                <Typography variant="body2" color="text.secondary">
                  Monthly Installment
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {formatCurrency(monthlyPayment)}
                </Typography>
              </Box>
              <Box className="plan-item">
                <Typography variant="body2" color="text.secondary">
                  Total Installment Amount
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {formatCurrency(totalInstallmentAmount)}
                </Typography>
              </Box>
              <Box className="plan-item">
                <Typography variant="body2" color="text.secondary">
                  Blox Membership
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {hasBloxMembership ? formatCurrency(totalMembership) : 'Not Included'}
                </Typography>
                {hasBloxMembership && (
                  <Typography variant="caption" color="text.secondary">
                    {membershipType === 'yearly' ? 'Yearly plan' : 'Monthly plan'} - Includes 3 deferrals/year
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          {/* Payment Schedule */}
          {paymentSchedule.length > 0 && (
            <Box className="payment-schedule-section">
              <Typography variant="h6" className="section-title">
                Payment Schedule
              </Typography>
              {paymentSchedule.map((scheduleItem) => (
                <Box key={scheduleItem.year} className="schedule-year">
                  <Typography variant="body2" fontWeight={600} className="year-label">
                    Year {String(scheduleItem.year).padStart(2, '0')}
                  </Typography>
                  <Box className="schedule-details">
                    <Box className="schedule-item">
                      <Typography variant="body2" color="text.secondary">
                        Total Installments (Year)
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatCurrency(scheduleItem.totalInstallmentsYear)}
                      </Typography>
                    </Box>
                    <Box className="schedule-item">
                      <Typography variant="body2" color="text.secondary">
                        Monthly Installment
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatCurrency(scheduleItem.monthlyInstallment)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
