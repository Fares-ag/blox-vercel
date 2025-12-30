import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Paper, FormControlLabel, Checkbox } from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import * as yup from 'yup';
import { Input, DatePicker, Select, type SelectOption, type StepProps, Loading } from '@shared/components';
import { supabaseApiService } from '@shared/services';
import type { User } from '@shared/models/user.model';
import moment from 'moment';
import type { Moment } from 'moment';
import './CustomerInfoStep.scss';

// All fields optional for admin "Create Application" flow (draft-friendly).
const schema = yup.object().shape({
  firstName: yup.string().nullable().notRequired(),
  lastName: yup.string().nullable().notRequired(),
  email: yup.string().nullable().notRequired().email('Invalid email'),
  phone: yup.string().nullable().notRequired(),
  dateOfBirth: yup.string().nullable().notRequired(),
  nationality: yup.string().nullable().notRequired(),
  street: yup.string().nullable().notRequired(),
  city: yup.string().nullable().notRequired(),
  country: yup.string().nullable().notRequired(),
  postalCode: yup.string().nullable().notRequired(),
  company: yup.string().nullable().notRequired(),
  position: yup.string().nullable().notRequired(),
  employmentType: yup.string().nullable().notRequired(),
  employmentDuration: yup.string().nullable().notRequired(),
  monthlyIncome: yup
    .number()
    .transform((value, originalValue) => {
      if (originalValue === '' || originalValue === null) return undefined;
      return Number.isNaN(value) ? undefined : value;
    })
    .nullable()
    .notRequired()
    .min(0),
});

export const CustomerInfoStep: React.FC<StepProps> = ({ data, updateData }) => {
  const [useExistingCustomer, setUseExistingCustomer] = React.useState<boolean>(false);
  const [users, setUsers] = React.useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState('');
  const [selectedUserEmail, setSelectedUserEmail] = React.useState<string>('');

  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: data.customerInfo || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: null,
      nationality: '',
      street: '',
      city: '',
      country: '',
      postalCode: '',
      company: '',
      position: '',
      employmentType: '',
      employmentDuration: '',
      monthlyIncome: 0,
    },
  });

  const dateOfBirth = watch('dateOfBirth');

  React.useEffect(() => {
    // If we already have an email in the draft, default to existing-customer mode
    if (data?.customerInfo?.email) {
      setSelectedUserEmail(data.customerInfo.email);
    }
  }, [data?.customerInfo?.email]);

  React.useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await supabaseApiService.getUsers();
        if (res.status === 'SUCCESS' && res.data) {
          setUsers(res.data);
        } else {
          setUsers([]);
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    if (useExistingCustomer && users.length === 0 && !loadingUsers) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useExistingCustomer]);

  React.useEffect(() => {
    const subscription = watch((value: any) => {
      updateData({ customerInfo: value });
    });
    return () => subscription.unsubscribe();
  }, [watch, updateData]);

  const handleDateChange = (value: Moment | null) => {
    setValue('dateOfBirth', value ? value.format('YYYY-MM-DD') : '', { shouldValidate: true });
  };

  const existingCustomerOptions: SelectOption[] = React.useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const filtered = q
      ? users.filter((u) => {
          const name = (u.name || `${u.firstName || ''} ${u.lastName || ''}`).trim().toLowerCase();
          return (
            (u.email || '').toLowerCase().includes(q) ||
            (u.phone || '').toLowerCase().includes(q) ||
            name.includes(q)
          );
        })
      : users;

    return filtered.map((u) => {
      const labelName = (u.name || `${u.firstName || ''} ${u.lastName || ''}`).trim() || u.email;
      const label = u.phone ? `${labelName} • ${u.phone} • ${u.email}` : `${labelName} • ${u.email}`;
      return { value: u.email, label };
    });
  }, [users, userSearch]);

  const applyCustomerInfoToForm = (customerInfo: any, fallbackUser?: User) => {
    const ci = customerInfo || {};
    const address = ci.address || {};
    const employment = ci.employment || {};
    const income = ci.income || {};

    const firstName = ci.firstName || fallbackUser?.firstName || '';
    const lastName = ci.lastName || fallbackUser?.lastName || '';
    const email = ci.email || fallbackUser?.email || '';
    const phone = ci.phone || fallbackUser?.phone || '';

    setValue('firstName', firstName, { shouldValidate: true });
    setValue('lastName', lastName, { shouldValidate: true });
    setValue('email', email, { shouldValidate: true });
    setValue('phone', phone, { shouldValidate: true });

    setValue('dateOfBirth', ci.dateOfBirth || '', { shouldValidate: true });
    setValue('nationality', ci.nationality || fallbackUser?.nationality || '', { shouldValidate: true });

    setValue('street', ci.street || address.street || '', { shouldValidate: true });
    setValue('city', ci.city || address.city || '', { shouldValidate: true });
    setValue('country', ci.country || address.country || '', { shouldValidate: true });
    setValue('postalCode', ci.postalCode || address.postalCode || '', { shouldValidate: true });

    setValue('company', ci.company || employment.company || '', { shouldValidate: true });
    setValue('position', ci.position || employment.position || '', { shouldValidate: true });
    setValue('employmentType', ci.employmentType || employment.employmentType || '', { shouldValidate: true });
    setValue('employmentDuration', ci.employmentDuration || employment.employmentDuration || '', { shouldValidate: true });

    const monthlyIncome =
      (typeof ci.monthlyIncome === 'number' ? ci.monthlyIncome : undefined) ??
      (typeof income.monthlyIncome === 'number' ? income.monthlyIncome : undefined) ??
      (typeof employment.salary === 'number' ? employment.salary : undefined) ??
      0;
    setValue('monthlyIncome', monthlyIncome, { shouldValidate: true });
  };

  const handleSelectExistingCustomer = async (email: string) => {
    setSelectedUserEmail(email);
    const selected = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());

    // Prefill quickly from the user list
    if (selected) {
      applyCustomerInfoToForm(
        {
          firstName: selected.firstName,
          lastName: selected.lastName,
          email: selected.email,
          phone: selected.phone,
          nationality: selected.nationality,
        },
        selected
      );
    } else {
      setValue('email', email, { shouldValidate: true });
    }

    // Then try to fetch the latest full customer_info blob for richer prefill
    const res = await supabaseApiService.getLatestCustomerInfoByEmail(email);
    if (res.status === 'SUCCESS' && res.data) {
      applyCustomerInfoToForm(res.data.customerInfo, selected);
    }
  };

  const employmentTypes: SelectOption[] = [
    { value: 'gov-or-semi-gov', label: 'Government or Semi-Government' },
    { value: 'private-international', label: 'Private International' },
    { value: 'private-local', label: 'Private Local' },
    { value: 'self-employed', label: 'Self-Employed' },
  ];

  const employmentDurations: SelectOption[] = [
    { value: 'less-than-6-months', label: 'Less than 6 months' },
    { value: 'between-6-12-months', label: 'Between 6 and 12 months' },
    { value: 'more-than-12-months', label: 'More than 12 months' },
  ];

  return (
    <Box component="form" className="customer-info-step">
      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: '#f9fafb' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Existing Customer
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={useExistingCustomer}
              onChange={(e) => setUseExistingCustomer(e.target.checked)}
              sx={{ color: '#DAFF01', '&.Mui-checked': { color: '#DAFF01' } }}
            />
          }
          label="Select from existing customers"
        />
        {useExistingCustomer && (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Input
                  label="Search (name / email / phone)"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Type to filter..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                {loadingUsers ? (
                  <Loading />
                ) : (
                  <Select
                    label="Choose Customer"
                    value={selectedUserEmail}
                    onChange={(e) => handleSelectExistingCustomer(e.target.value as string)}
                    options={existingCustomerOptions}
                    helperText={existingCustomerOptions.length === 0 ? 'No customers found yet' : undefined}
                  />
                )}
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      <Typography variant="h3" className="section-title">
        Personal Information
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Input
            label="First Name"
            {...register('firstName')}
            error={!!errors.firstName}
            helperText={errors.firstName?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Input
            label="Last Name"
            {...register('lastName')}
            error={!!errors.lastName}
            helperText={errors.lastName?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Input
            label="Phone Number"
            {...register('phone')}
            error={!!errors.phone}
            helperText={errors.phone?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <DatePicker
            label="Date of Birth"
            value={dateOfBirth ? moment(dateOfBirth) : null}
            onChange={handleDateChange}
            format="DD/MM/YYYY"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Input
            label="Nationality"
            {...register('nationality')}
            error={!!errors.nationality}
            helperText={errors.nationality?.message as string}
          />
        </Grid>
      </Grid>

      <Typography variant="h3" className="section-title" sx={{ mt: 4 }}>
        Address
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Input
            label="Street Address"
            {...register('street')}
            error={!!errors.street}
            helperText={errors.street?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Input
            label="City"
            {...register('city')}
            error={!!errors.city}
            helperText={errors.city?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Input
            label="Country"
            {...register('country')}
            error={!!errors.country}
            helperText={errors.country?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Input
            label="Postal Code"
            {...register('postalCode')}
            error={!!errors.postalCode}
            helperText={errors.postalCode?.message as string}
          />
        </Grid>
      </Grid>

      <Typography variant="h3" className="section-title" sx={{ mt: 4 }}>
        Employment Information
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Input
            label="Company Name"
            {...register('company')}
            error={!!errors.company}
            helperText={errors.company?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Input
            label="Position"
            {...register('position')}
            error={!!errors.position}
            helperText={errors.position?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Select
            label="Employment Type"
            value={watch('employmentType')}
            onChange={(e) => setValue('employmentType', e.target.value)}
            options={employmentTypes}
            error={!!errors.employmentType}
            helperText={errors.employmentType?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Select
            label="Employment Duration"
            value={watch('employmentDuration')}
            onChange={(e) => setValue('employmentDuration', e.target.value)}
            options={employmentDurations}
            error={!!errors.employmentDuration}
            helperText={errors.employmentDuration?.message as string}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Input
            label="Monthly Income (QAR)"
            type="number"
            {...register('monthlyIncome', { valueAsNumber: true })}
            error={!!errors.monthlyIncome}
            helperText={errors.monthlyIncome?.message as string}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
