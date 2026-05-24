import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Input } from '@shared/components';
import moment from 'moment';
import './InstallmentCalculator.scss';

interface InstallmentCalculatorProps {
  vehiclePrice: number;
  onDataChange?: (data: InstallmentCalculatorData) => void;
}

export interface InstallmentCalculatorData {
  downPayment: number;
  termMonths: number;
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

const ANNUAL_RENTAL_RATE = 0.12; // Fixed 12% annual rental rate
const TERM_MONTHS = 48; // Fixed 48-month tenure

export const InstallmentCalculator: React.FC<InstallmentCalculatorProps> = ({ vehiclePrice, onDataChange }) => {
  const [downPayment, setDownPayment] = useState<number>(0);
  const termMonths = TERM_MONTHS;

  const loanAmount = vehiclePrice - downPayment;
  const totalAmount = vehiclePrice;

  // Round to 2 decimal places helper
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const monthlyPayment = useMemo(() => {
    if (loanAmount <= 0) return 0;
    const r = ANNUAL_RENTAL_RATE / 12;
    const n = termMonths;
    const pow = Math.pow(1 + r, n);
    return round2(loanAmount * (r * pow) / (pow - 1));
  }, [loanAmount, termMonths]);

  const monthlySchedule = useMemo(() => {
    const schedule: MonthlyScheduleItem[] = [];
    if (loanAmount <= 0 || monthlyPayment <= 0) return schedule;

    const startDate = moment().startOf('month').add(1, 'month');
    const r = ANNUAL_RENTAL_RATE / 12;
    let balance = round2(loanAmount);
    let totalPaid = 0;

    for (let i = 0; i < termMonths; i++) {
      const dueDate = moment(startDate).add(i, 'months');
      const interest = round2(balance * r);
      const isLast = i === termMonths - 1;

      // Last payment clears whatever remains to eliminate rounding drift
      const payment = isLast ? round2(balance + interest) : monthlyPayment;
      const principal = round2(payment - interest);

      balance = round2(Math.max(0, balance - principal));
      totalPaid = round2(totalPaid + payment);

      schedule.push({
        month: i + 1,
        monthLabel: `${dueDate.format('MMM YYYY')} (Month ${i + 1})`,
        principal,
        rent: interest,
        totalPayment: payment,
        customerOwnership: round2(loanAmount - balance),
        bloxOwnership: balance,
        year: Math.floor(i / 12) + 1,
      });
    }

    return schedule;
  }, [loanAmount, termMonths, monthlyPayment]);

  const totalRent = useMemo(() =>
    round2(monthlySchedule.reduce((s, x) => s + x.rent, 0)),
  [monthlySchedule]);

  const totalInstallmentAmount = useMemo(() =>
    round2(monthlySchedule.reduce((s, x) => s + x.totalPayment, 0)),
  [monthlySchedule]);

  // Group by year — 48 months = exactly 4 years of 12 months each
  const paymentSchedule = useMemo(() => {
    const byYear: Record<number, number> = {};
    monthlySchedule.forEach(({ year, totalPayment }) => {
      byYear[year] = round2((byYear[year] || 0) + totalPayment);
    });
    return Object.entries(byYear).map(([year, yearTotal]) => ({
      year: Number(year),
      monthlyInstallment: monthlyPayment,
      totalInstallmentsYear: yearTotal,
      annualInsurance: 0,
    }));
  }, [monthlySchedule, monthlyPayment]);

  const calculatorData = useMemo(
    () => ({
      downPayment,
      termMonths,
      loanAmount,
      monthlyPayment,
      annualRentalRate: ANNUAL_RENTAL_RATE,
      totalRent,
      totalMembership: 0,
      paymentSchedule,
    }),
    [downPayment, termMonths, loanAmount, monthlyPayment, totalRent, paymentSchedule]
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
            value={downPayment}
            onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
          />
        </Box>
      </Box>

      {/* Term Section — fixed, non-editable */}
      <Box className="calculator-section">
        <Typography variant="h6" className="section-title">
          Term
        </Typography>
        <Box className="input-group">
          <Input
            label="Term (months)"
            value="48 Months"
            disabled
            sx={{
              '& .MuiInputBase-root.Mui-disabled': {
                backgroundColor: '#fff',
              },
              '& .MuiInputBase-input.Mui-disabled': {
                WebkitTextFillColor: 'var(--primary-text, #0e1909)',
                opacity: 1,
              },
            }}
          />
        </Box>
      </Box>

    </Box>
  );
};
