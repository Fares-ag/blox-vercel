import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Edit, Calculate } from '@mui/icons-material';
import { Button as CustomButton, DatePicker } from '@shared/components';
import type { Application, InstallmentPlan } from '@shared/models/application.model';
import { formatCurrency } from '@shared/utils/formatters';
import { parseTenureToMonths, formatMonthsToTenure } from '@shared/utils/tenure.utils';
import moment, { type Moment } from 'moment';
import type { PaymentSchedule } from '@shared/models/application.model';
import './EditApplicationDialog.scss';

interface EditApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Application>) => Promise<void>;
  application: Application | null;
  loading?: boolean;
}

const TENURE_OPTIONS = [
  '12 Months',
  '18 Months',
  '24 Months',
  '36 Months',
  '48 Months',
  '60 Months',
  '1 Year',
  '2 Years',
  '3 Years',
  '4 Years',
  '5 Years',
];

export const EditApplicationDialog: React.FC<EditApplicationDialogProps> = ({
  open,
  onClose,
  onSave,
  application,
  loading = false,
}) => {
  const [downPayment, setDownPayment] = useState<number>(0);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(0);
  const [tenure, setTenure] = useState<string>('36 Months');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [firstPaymentDate, setFirstPaymentDate] = useState<Moment | null>(null);
  const [regenerateSchedule, setRegenerateSchedule] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (application && open) {
      setDownPayment(application.downPayment || 0);
      setMonthlyAmount(application.installmentPlan?.monthlyAmount || 0);
      setTenure(application.installmentPlan?.tenure || '36 Months');
      setTotalAmount(application.installmentPlan?.totalAmount || 0);
      
      // Get first payment date from schedule or default to next month
      const existingSchedule = application.installmentPlan?.schedule || [];
      if (existingSchedule.length > 0 && existingSchedule[0].dueDate) {
        setFirstPaymentDate(moment(existingSchedule[0].dueDate));
      } else {
        const interval = application.installmentPlan?.interval || 'Monthly';
        const isDailyInterval = (interval || '').toString().trim().toLowerCase() === 'daily';
        const defaultDate = isDailyInterval
          ? moment().startOf('day').add(1, 'day')
          : moment().startOf('month').add(1, 'month');
        setFirstPaymentDate(defaultDate);
      }
      
      setRegenerateSchedule(false);
      setErrors({});
    }
  }, [application, open]);

  const vehiclePrice = application?.vehicle?.price || 0;
  const loanAmount = useMemo(() => {
    return Math.max(0, vehiclePrice - downPayment);
  }, [vehiclePrice, downPayment]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (downPayment < 0) {
      newErrors.downPayment = 'Down payment cannot be negative';
    }
    if (downPayment > vehiclePrice) {
      newErrors.downPayment = 'Down payment cannot exceed vehicle price';
    }
    if (monthlyAmount <= 0) {
      newErrors.monthlyAmount = 'Monthly amount must be greater than 0';
    }
    if (totalAmount <= 0) {
      newErrors.totalAmount = 'Total amount must be greater than 0';
    }
    if (loanAmount <= 0 && downPayment < vehiclePrice) {
      newErrors.downPayment = 'Down payment must be less than vehicle price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateSchedule = (
    monthlyPayment: number,
    tenureMonths: number,
    vehiclePrice: number,
    downPayment: number,
    interval: string,
    startDate?: Moment | null
  ): PaymentSchedule[] => {
    const schedule: PaymentSchedule[] = [];
    const now = moment().startOf('day');
    const isDailyInterval = (interval || '').toString().trim().toLowerCase() === 'daily';
    
    // Use provided start date or default
    let scheduleStartDate: Moment;
    if (startDate) {
      scheduleStartDate = moment(startDate);
    } else {
      scheduleStartDate = isDailyInterval
        ? moment().startOf('day').add(1, 'day')
        : moment().startOf('month').add(1, 'month');
    }

    // Get existing schedule to preserve payment statuses
    const existingSchedule = application?.installmentPlan?.schedule || [];
    const existingPaidPayments = new Map<number, PaymentSchedule>();
    existingSchedule.forEach((payment, index) => {
      if (payment.status === 'paid') {
        existingPaidPayments.set(index, payment);
      }
    });

    for (let i = 0; i < tenureMonths; i++) {
      const dueDate = isDailyInterval
        ? moment(scheduleStartDate).add(i, 'days')
        : moment(scheduleStartDate).add(i, 'months');
      const dueDateFormatted = dueDate.format('YYYY-MM-DD');

      const isPast = dueDate.isBefore(now, isDailyInterval ? 'day' : 'month');
      const isCurrentMonth = isDailyInterval
        ? dueDate.isSame(now, 'day')
        : dueDate.isSame(now, 'month');

      let status: PaymentSchedule['status'];
      let paidDate: string | undefined;

      // Check if this payment was already paid in the existing schedule
      const existingPaid = existingPaidPayments.get(i);
      if (existingPaid) {
        status = 'paid';
        paidDate = existingPaid.paidDate || dueDateFormatted;
      } else if (isPast) {
        status = 'paid';
        paidDate = dueDateFormatted;
      } else if (isCurrentMonth) {
        status = 'active';
      } else {
        status = 'upcoming';
      }

      schedule.push({
        dueDate: dueDateFormatted,
        amount: monthlyPayment,
        status,
        paidDate,
      });
    }

    return schedule;
  };

  const handleSave = async () => {
    if (!validate() || !application) return;

    try {
      const tenureMonths = parseTenureToMonths(tenure);
      const interval = application.installmentPlan?.interval || 'Monthly';

      let updatedSchedule: PaymentSchedule[] = [];
      
      if (regenerateSchedule) {
        // Regenerate entire schedule with new first payment date
        updatedSchedule = generateSchedule(monthlyAmount, tenureMonths, vehiclePrice, downPayment, interval || 'Monthly', firstPaymentDate);
      } else if (firstPaymentDate) {
        // Update existing schedule dates to use new first payment date (shift all dates)
        const existingSchedule = application.installmentPlan?.schedule || [];
        const originalFirstDate = existingSchedule.length > 0 
          ? moment(existingSchedule[0].dueDate) 
          : null;
        
        if (originalFirstDate && !firstPaymentDate.isSame(originalFirstDate, 'day')) {
          // Calculate the difference in days/months
          const isDailyInterval = (interval || '').toString().trim().toLowerCase() === 'daily';
          const diff = isDailyInterval 
            ? firstPaymentDate.diff(originalFirstDate, 'days')
            : firstPaymentDate.diff(originalFirstDate, 'months');
          
          updatedSchedule = existingSchedule.map((payment) => {
            const originalDate = moment(payment.dueDate);
            const newDate = isDailyInterval
              ? originalDate.clone().add(diff, 'days')
              : originalDate.clone().add(diff, 'months');
            
            return {
              ...payment,
              dueDate: newDate.format('YYYY-MM-DD'),
            };
          });
        } else {
          updatedSchedule = existingSchedule;
        }
      } else {
        updatedSchedule = application.installmentPlan?.schedule || [];
      }

      const updatedInstallmentPlan: InstallmentPlan = {
        ...(application.installmentPlan || {}),
        tenure,
        monthlyAmount,
        totalAmount,
        downPayment,
        interval: interval || 'Monthly',
        schedule: updatedSchedule,
      };

      const updates: Partial<Application> = {
        downPayment,
        loanAmount,
        installmentPlan: updatedInstallmentPlan,
      };

      await onSave(updates);
    } catch (error) {
      console.error('Error saving application updates:', error);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!application) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth className="edit-application-dialog">
      <DialogTitle className="dialog-title">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Edit />
          <Typography variant="h3">Edit Application Installments</Typography>
        </Box>
        {application.id && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Application ID: {application.id.slice(0, 8)}
            {application.customerName && ` • ${application.customerName}`}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent className="dialog-content">
        <Alert severity="info" sx={{ mb: 3 }}>
          You can edit installment details here. Changes will update the application immediately. Use "Regenerate Schedule" to recalculate the payment schedule based on new values.
        </Alert>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Vehicle Price
              </Typography>
              <Typography variant="h6" sx={{ color: '#DAFF01', fontWeight: 600 }}>
                {formatCurrency(vehiclePrice)}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Down Payment"
              type="number"
              value={downPayment}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setDownPayment(value);
                if (errors.downPayment) {
                  const newErrors = { ...errors };
                  delete newErrors.downPayment;
                  setErrors(newErrors);
                }
              }}
              error={!!errors.downPayment}
              helperText={errors.downPayment || `Loan amount will be: ${formatCurrency(loanAmount)}`}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>QAR</Typography>,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Loan Amount"
              type="number"
              value={loanAmount}
              disabled
              helperText="Calculated automatically (Vehicle Price - Down Payment)"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>QAR</Typography>,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Tenure</InputLabel>
              <Select value={tenure} onChange={(e) => setTenure(e.target.value)} label="Tenure">
                {TENURE_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Monthly Installment Amount"
              type="number"
              value={monthlyAmount}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setMonthlyAmount(value);
                if (errors.monthlyAmount) {
                  const newErrors = { ...errors };
                  delete newErrors.monthlyAmount;
                  setErrors(newErrors);
                }
              }}
              error={!!errors.monthlyAmount}
              helperText={errors.monthlyAmount}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>QAR</Typography>,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Total Amount"
              type="number"
              value={totalAmount}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setTotalAmount(value);
                if (errors.totalAmount) {
                  const newErrors = { ...errors };
                  delete newErrors.totalAmount;
                  setErrors(newErrors);
                }
              }}
              error={!!errors.totalAmount}
              helperText={errors.totalAmount || 'Total amount including all installments'}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>QAR</Typography>,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker
              label="First Payment Date"
              value={firstPaymentDate}
              onChange={(value) => setFirstPaymentDate(value)}
              format="DD, MMMM YYYY"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={regenerateSchedule}
                  onChange={(e) => setRegenerateSchedule(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Regenerate Payment Schedule
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Recalculate the entire payment schedule based on the new values. Existing paid payments will be preserved.
                  </Typography>
                </Box>
              }
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions className="dialog-actions">
        <Button variant="text" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <CustomButton
          variant="primary"
          onClick={handleSave}
          loading={loading}
          startIcon={<Calculate />}
        >
          Save Changes
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

