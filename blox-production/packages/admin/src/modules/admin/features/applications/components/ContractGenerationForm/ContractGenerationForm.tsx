import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { Button, Input, DatePicker } from '@shared/components';
import { formatCurrency } from '@shared/utils/formatters';
import { useForm, Controller } from 'react-hook-form';
import moment from 'moment';
type Moment = moment.Moment;
import './ContractGenerationForm.scss';

export interface ContractFormData {
  // Company Information
  crNo: string;
  nationality: string;
  address: string;

  // Vehicle Information
  countryOfOrigin: string;
  cylinderNo: string;
  chassisNo: string;
  internalColor: string;

  // Service Contract
  hasServiceContract: 'yes' | 'no';
  warrantyStartDate: Moment | null;
  warrantyEndDate: Moment | null;

  // Pricing
  vehiclePrice: number;
  registrationFee: number;
  insuranceFees: number;
  extraFees: number;
  totalPrice: number;
  paymentDueBeforeRegistration: number;

  // Vehicle Registration
  registrationOtherPartyName: string;
  registrationContactDetails: string;

  // Vehicle Delivery
  deliveryOtherPartyName: string;
  deliveryContactDetails: string;

  // Representatives
  firstPartyRepresentative: string;
  secondPartyRepresentative: string;
}

interface ContractGenerationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ContractFormData) => void;
  applicationData?: any;
  loading?: boolean;
}

export const ContractGenerationForm: React.FC<ContractGenerationFormProps> = ({
  open,
  onClose,
  onSubmit,
  applicationData,
  loading = false,
}) => {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ContractFormData>({
    defaultValues: {
      hasServiceContract: 'no',
      vehiclePrice: applicationData?.vehicle?.price || 0,
      totalPrice: applicationData?.vehicle?.price || 0,
      paymentDueBeforeRegistration: applicationData?.installmentPlan?.downPayment || 0,
      nationality: applicationData?.customerInfo?.nationality || '',
      address: applicationData?.customerInfo?.address?.street 
        ? `${applicationData.customerInfo.address.street}, ${applicationData.customerInfo.address.city}`
        : '',
    },
  });

  const vehiclePrice = watch('vehiclePrice');
  const registrationFee = watch('registrationFee') || 0;
  const insuranceFees = watch('insuranceFees') || 0;
  const extraFees = watch('extraFees') || 0;

  // Calculate total price
  React.useEffect(() => {
    const total = vehiclePrice + registrationFee + insuranceFees + extraFees;
    setValue('totalPrice', total);
  }, [vehiclePrice, registrationFee, insuranceFees, extraFees, setValue]);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open && applicationData) {
      reset({
        hasServiceContract: 'no',
        vehiclePrice: applicationData?.vehicle?.price || 0,
        totalPrice: applicationData?.vehicle?.price || 0,
        paymentDueBeforeRegistration: applicationData?.installmentPlan?.downPayment || 0,
        nationality: applicationData?.customerInfo?.nationality || '',
        address: applicationData?.customerInfo?.address?.street 
          ? `${applicationData.customerInfo.address.street}, ${applicationData.customerInfo.address.city}`
          : '',
      });
    }
  }, [open, applicationData, reset]);

  const onFormSubmit = (data: ContractFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      className="contract-generation-dialog"
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle className="dialog-title">
        <Typography variant="h3">Contract Generation Form</Typography>
      </DialogTitle>

      <DialogContent className="dialog-content">
        <form id="contract-generation-form" onSubmit={handleSubmit(onFormSubmit)}>
          {/* Company Information Section */}
          <Box className="form-section">
            <Typography variant="h4" className="section-title">
              Company Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Input
                  label="C.R NO."
                  {...register('crNo', { required: 'Company registration number is required' })}
                  error={!!errors.crNo}
                  helperText={errors.crNo?.message}
                  placeholder="Enter the company registration number"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Nationality"
                  {...register('nationality', { required: 'Nationality is required' })}
                  error={!!errors.nationality}
                  helperText={errors.nationality?.message}
                  placeholder="Specify the user's nationality"
                />
              </Grid>
              <Grid item xs={12}>
                <Input
                  label="Address"
                  {...register('address', { required: 'Address is required' })}
                  error={!!errors.address}
                  helperText={errors.address?.message}
                  placeholder="Enter the user's address"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Vehicle Information Section */}
          <Box className="form-section">
            <Typography variant="h4" className="section-title">
              Vehicle Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Country of Origin"
                  {...register('countryOfOrigin', { required: 'Country of origin is required' })}
                  error={!!errors.countryOfOrigin}
                  helperText={errors.countryOfOrigin?.message}
                  placeholder="Specify the origin of the vehicle"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Cylinder No."
                  {...register('cylinderNo', { required: 'Cylinder number is required' })}
                  error={!!errors.cylinderNo}
                  helperText={errors.cylinderNo?.message}
                  placeholder="Enter the cylinder number of the vehicle"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Chassis No."
                  {...register('chassisNo', { required: 'Chassis number is required' })}
                  error={!!errors.chassisNo}
                  helperText={errors.chassisNo?.message}
                  placeholder="Provide the chassis number of the vehicle"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Internal Color"
                  {...register('internalColor', { required: 'Internal color is required' })}
                  error={!!errors.internalColor}
                  helperText={errors.internalColor?.message}
                  placeholder="Specify the interior color of the vehicle"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Service Contract Section */}
          <Box className="form-section">
            <Typography variant="h4" className="section-title">
              Service Contract
            </Typography>
            <Controller
              name="hasServiceContract"
              control={control}
              rules={{ required: 'Please select service contract option' }}
              render={({ field }) => (
                <RadioGroup
                  {...field}
                  row
                  className="service-contract-radio"
                >
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                  <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                </RadioGroup>
              )}
            />
            {watch('hasServiceContract') === 'yes' && (
              <Box className="warranty-dates" sx={{ mt: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="warrantyStartDate"
                      control={control}
                      rules={{ required: watch('hasServiceContract') === 'yes' ? 'Warranty start date is required' : false }}
                      render={({ field }) => (
                        <DatePicker
                          label="Start date"
                          value={field.value}
                          onChange={field.onChange}
                          error={!!errors.warrantyStartDate}
                          helperText={errors.warrantyStartDate?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="warrantyEndDate"
                      control={control}
                      rules={{ required: watch('hasServiceContract') === 'yes' ? 'Warranty end date is required' : false }}
                      render={({ field }) => (
                        <DatePicker
                          label="End date"
                          value={field.value}
                          onChange={field.onChange}
                          error={!!errors.warrantyEndDate}
                          helperText={errors.warrantyEndDate?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>

          {/* Pricing Section */}
          <Box className="form-section">
            <Typography variant="h4" className="section-title">
              Price of Vehicles
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Vehicle Registration Fee"
                  type="number"
                  {...register('registrationFee', { 
                    required: 'Registration fee is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Fee must be positive' }
                  })}
                  error={!!errors.registrationFee}
                  helperText={errors.registrationFee?.message}
                  placeholder="Enter the registration fee"
                  InputProps={{
                    endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>QAR</Typography>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Insurance Fees"
                  type="number"
                  {...register('insuranceFees', { 
                    required: 'Insurance fees are required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Fee must be positive' }
                  })}
                  error={!!errors.insuranceFees}
                  helperText={errors.insuranceFees?.message}
                  placeholder="Enter the insurance fees"
                  InputProps={{
                    endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>QAR</Typography>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Extra Fees"
                  type="number"
                  {...register('extraFees', { 
                    valueAsNumber: true,
                    min: { value: 0, message: 'Fee must be positive' }
                  })}
                  error={!!errors.extraFees}
                  helperText={errors.extraFees?.message}
                  placeholder="Specify any additional fees"
                  InputProps={{
                    endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>QAR</Typography>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Price of Vehicles"
                  type="number"
                  {...register('vehiclePrice', { 
                    required: 'Vehicle price is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Price must be positive' }
                  })}
                  error={!!errors.vehiclePrice}
                  helperText={errors.vehiclePrice?.message}
                  placeholder="Specify the total price of the vehicle"
                  InputProps={{
                    endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>QAR</Typography>,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box className="total-price-display">
                  <Typography variant="body2" className="total-label">Total Price</Typography>
                  <Typography variant="h5" className="total-value">
                    {formatCurrency(watch('totalPrice') || 0)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Payment Due Before Registration & Delivery"
                  type="number"
                  {...register('paymentDueBeforeRegistration', { 
                    required: 'Payment due is required',
                    valueAsNumber: true,
                    min: { value: 0, message: 'Amount must be positive' }
                  })}
                  error={!!errors.paymentDueBeforeRegistration}
                  helperText={errors.paymentDueBeforeRegistration?.message}
                  placeholder="Specify the payment due before vehicle registration and delivery"
                  InputProps={{
                    endAdornment: <Typography variant="body2" sx={{ ml: 1 }}>QAR</Typography>,
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Vehicle Registration Section */}
          <Box className="form-section">
            <Typography variant="h4" className="section-title">
              Vehicle Registration
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Other Party Name"
                  {...register('registrationOtherPartyName', { required: 'Registration party name is required' })}
                  error={!!errors.registrationOtherPartyName}
                  helperText={errors.registrationOtherPartyName?.message}
                  placeholder="Enter the second party's name for registration"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Contact Details"
                  {...register('registrationContactDetails', { required: 'Contact details are required' })}
                  error={!!errors.registrationContactDetails}
                  helperText={errors.registrationContactDetails?.message}
                  placeholder="+974 Enter Contact Details"
                  InputProps={{
                    startAdornment: <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>+974</Typography>,
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Vehicle Delivery Section */}
          <Box className="form-section">
            <Typography variant="h4" className="section-title">
              Vehicle Delivery
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Other Party Name"
                  {...register('deliveryOtherPartyName', { required: 'Delivery party name is required' })}
                  error={!!errors.deliveryOtherPartyName}
                  helperText={errors.deliveryOtherPartyName?.message}
                  placeholder="Enter the second party's name for delivery"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Contact Details"
                  {...register('deliveryContactDetails', { required: 'Contact details are required' })}
                  error={!!errors.deliveryContactDetails}
                  helperText={errors.deliveryContactDetails?.message}
                  placeholder="+974 Enter Contact Details"
                  InputProps={{
                    startAdornment: <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>+974</Typography>,
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Representatives Section */}
          <Box className="form-section">
            <Typography variant="h4" className="section-title">
              Representatives
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Input
                  label="First Party Represented By"
                  {...register('firstPartyRepresentative', { required: 'First party representative is required' })}
                  error={!!errors.firstPartyRepresentative}
                  helperText={errors.firstPartyRepresentative?.message}
                  placeholder="Enter the representative for the first party"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Second Party Represented By"
                  {...register('secondPartyRepresentative', { required: 'Second party representative is required' })}
                  error={!!errors.secondPartyRepresentative}
                  helperText={errors.secondPartyRepresentative?.message}
                  placeholder="Enter the representative for the second party"
                />
              </Grid>
            </Grid>
          </Box>
        </form>
      </DialogContent>

      <DialogActions className="dialog-actions">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit(onFormSubmit)}
          loading={loading}
        >
          Generate Contract
        </Button>
      </DialogActions>
    </Dialog>
  );
};


