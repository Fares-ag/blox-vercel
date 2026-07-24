import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import * as yup from 'yup';
import { Input, DatePicker, Select, type SelectOption, type StepProps, Loading } from '@shared/components';
import { supabaseApiService } from '@shared/services';
import type { User } from '@shared/models/user.model';
import type { ApplicantType } from '@shared/models/application.model';
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
  qid: yup.string().nullable().notRequired().max(11, 'Qatar ID must be 11 digits'),
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
  // Corporate fields (flat in form, nested into customerInfo.corporate on update)
  legalName: yup.string().nullable().notRequired(),
  crNumber: yup.string().nullable().notRequired(),
  tradeName: yup.string().nullable().notRequired(),
  industry: yup.string().nullable().notRequired(),
  signatoryFirstName: yup.string().nullable().notRequired(),
  signatoryLastName: yup.string().nullable().notRequired(),
  signatoryEmail: yup.string().nullable().notRequired().email('Invalid email'),
  signatoryPhone: yup.string().nullable().notRequired(),
  signatoryQid: yup.string().nullable().notRequired().max(11, 'Qatar ID must be 11 digits'),
  signatoryNationality: yup.string().nullable().notRequired(),
  signatoryPosition: yup.string().nullable().notRequired(),
  regStreet: yup.string().nullable().notRequired(),
  regCity: yup.string().nullable().notRequired(),
  regCountry: yup.string().nullable().notRequired(),
  regPostalCode: yup.string().nullable().notRequired(),
});

function buildCustomerInfo(applicantType: ApplicantType, value: any) {
  if (applicantType === 'corporate') {
    return {
      applicantType: 'corporate' as const,
      email: value.signatoryEmail || '',
      phone: value.signatoryPhone || '',
      firstName: value.signatoryFirstName || '',
      lastName: value.signatoryLastName || '',
      qid: value.signatoryQid || '',
      nationality: value.signatoryNationality || '',
      corporate: {
        legalName: value.legalName || '',
        crNumber: value.crNumber || '',
        tradeName: value.tradeName || '',
        industry: value.industry || '',
        registeredAddress: {
          street: value.regStreet || '',
          city: value.regCity || '',
          state: '',
          country: value.regCountry || '',
          postalCode: value.regPostalCode || '',
        },
        authorizedSignatory: {
          firstName: value.signatoryFirstName || '',
          lastName: value.signatoryLastName || '',
          email: value.signatoryEmail || '',
          phone: value.signatoryPhone || '',
          qid: value.signatoryQid || '',
          nationality: value.signatoryNationality || '',
          position: value.signatoryPosition || '',
        },
      },
    };
  }

  return {
    applicantType: 'individual' as const,
    firstName: value.firstName || '',
    lastName: value.lastName || '',
    email: value.email || '',
    phone: value.phone || '',
    dateOfBirth: value.dateOfBirth || '',
    nationality: value.nationality || '',
    qid: value.qid || '',
    street: value.street || '',
    city: value.city || '',
    country: value.country || '',
    postalCode: value.postalCode || '',
    company: value.company || '',
    position: value.position || '',
    employmentType: value.employmentType || '',
    employmentDuration: value.employmentDuration || '',
    monthlyIncome: value.monthlyIncome || 0,
  };
}

export const CustomerInfoStep: React.FC<StepProps> = ({ data, updateData }) => {
  const initialType: ApplicantType =
    data?.customerInfo?.applicantType === 'corporate' ? 'corporate' : 'individual';
  const [applicantType, setApplicantType] = React.useState<ApplicantType>(initialType);
  const [useExistingCustomer, setUseExistingCustomer] = React.useState<boolean>(false);
  const [users, setUsers] = React.useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState('');
  const [selectedUserEmail, setSelectedUserEmail] = React.useState<string>('');

  const corp = data?.customerInfo?.corporate;
  const signatory = corp?.authorizedSignatory;
  const regAddr = corp?.registeredAddress;

  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: data?.customerInfo?.firstName || '',
      lastName: data?.customerInfo?.lastName || '',
      email: data?.customerInfo?.email || '',
      phone: data?.customerInfo?.phone || '',
      dateOfBirth: data?.customerInfo?.dateOfBirth || null,
      nationality: data?.customerInfo?.nationality || '',
      qid: data?.customerInfo?.qid || '',
      street: data?.customerInfo?.street || data?.customerInfo?.address?.street || '',
      city: data?.customerInfo?.city || data?.customerInfo?.address?.city || '',
      country: data?.customerInfo?.country || data?.customerInfo?.address?.country || '',
      postalCode: data?.customerInfo?.postalCode || data?.customerInfo?.address?.postalCode || '',
      company: data?.customerInfo?.company || data?.customerInfo?.employment?.company || '',
      position: data?.customerInfo?.position || data?.customerInfo?.employment?.position || '',
      employmentType: data?.customerInfo?.employmentType || data?.customerInfo?.employment?.employmentType || '',
      employmentDuration:
        data?.customerInfo?.employmentDuration || data?.customerInfo?.employment?.employmentDuration || '',
      monthlyIncome: data?.customerInfo?.monthlyIncome || data?.customerInfo?.income?.monthlyIncome || 0,
      legalName: corp?.legalName || '',
      crNumber: corp?.crNumber || '',
      tradeName: corp?.tradeName || '',
      industry: corp?.industry || '',
      signatoryFirstName: signatory?.firstName || data?.customerInfo?.firstName || '',
      signatoryLastName: signatory?.lastName || data?.customerInfo?.lastName || '',
      signatoryEmail: signatory?.email || data?.customerInfo?.email || '',
      signatoryPhone: signatory?.phone || data?.customerInfo?.phone || '',
      signatoryQid: signatory?.qid || '',
      signatoryNationality: signatory?.nationality || '',
      signatoryPosition: signatory?.position || '',
      regStreet: regAddr?.street || '',
      regCity: regAddr?.city || '',
      regCountry: regAddr?.country || '',
      regPostalCode: regAddr?.postalCode || '',
    },
  });

  const dateOfBirth = watch('dateOfBirth');

  React.useEffect(() => {
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
      updateData({ customerInfo: buildCustomerInfo(applicantType, value) });
    });
    return () => subscription.unsubscribe();
  }, [watch, updateData, applicantType]);

  const handleApplicantTypeChange = (
    _: React.MouseEvent<HTMLElement>,
    next: ApplicantType | null
  ) => {
    if (!next) return;
    setApplicantType(next);
    const value = watch();
    updateData({
      customerInfo: buildCustomerInfo(next, value),
      // Clear multi-select when switching away from corporate
      ...(next === 'individual' ? { vehicles: undefined } : {}),
    });
  };

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

    // Prefill signatory from person when selecting existing user for corporate
    setValue('signatoryFirstName', firstName, { shouldValidate: true });
    setValue('signatoryLastName', lastName, { shouldValidate: true });
    setValue('signatoryEmail', email, { shouldValidate: true });
    setValue('signatoryPhone', phone, { shouldValidate: true });
    setValue('signatoryQid', ci.qid || fallbackUser?.nationalId || '', { shouldValidate: true });
    setValue('signatoryNationality', ci.nationality || fallbackUser?.nationality || '', {
      shouldValidate: true,
    });

    setValue('dateOfBirth', ci.dateOfBirth || '', { shouldValidate: true });
    setValue('nationality', ci.nationality || fallbackUser?.nationality || '', { shouldValidate: true });
    setValue('qid', ci.qid || fallbackUser?.nationalId || '', { shouldValidate: true });

    setValue('street', ci.street || address.street || '', { shouldValidate: true });
    setValue('city', ci.city || address.city || '', { shouldValidate: true });
    setValue('country', ci.country || address.country || '', { shouldValidate: true });
    setValue('postalCode', ci.postalCode || address.postalCode || '', { shouldValidate: true });

    setValue('company', ci.company || employment.company || '', { shouldValidate: true });
    setValue('position', ci.position || employment.position || '', { shouldValidate: true });
    setValue('employmentType', ci.employmentType || employment.employmentType || '', { shouldValidate: true });
    setValue('employmentDuration', ci.employmentDuration || employment.employmentDuration || '', {
      shouldValidate: true,
    });

    const monthlyIncome =
      (typeof ci.monthlyIncome === 'number' ? ci.monthlyIncome : undefined) ??
      (typeof income.monthlyIncome === 'number' ? income.monthlyIncome : undefined) ??
      (typeof employment.salary === 'number' ? employment.salary : undefined) ??
      0;
    setValue('monthlyIncome', monthlyIncome, { shouldValidate: true });

    if (ci.corporate) {
      setValue('legalName', ci.corporate.legalName || '', { shouldValidate: true });
      setValue('crNumber', ci.corporate.crNumber || '', { shouldValidate: true });
      setValue('tradeName', ci.corporate.tradeName || '', { shouldValidate: true });
      setValue('industry', ci.corporate.industry || '', { shouldValidate: true });
      const ra = ci.corporate.registeredAddress || {};
      setValue('regStreet', ra.street || '', { shouldValidate: true });
      setValue('regCity', ra.city || '', { shouldValidate: true });
      setValue('regCountry', ra.country || '', { shouldValidate: true });
      setValue('regPostalCode', ra.postalCode || '', { shouldValidate: true });
      const s = ci.corporate.authorizedSignatory || {};
      setValue('signatoryFirstName', s.firstName || firstName, { shouldValidate: true });
      setValue('signatoryLastName', s.lastName || lastName, { shouldValidate: true });
      setValue('signatoryEmail', s.email || email, { shouldValidate: true });
      setValue('signatoryPhone', s.phone || phone, { shouldValidate: true });
      setValue('signatoryQid', s.qid || '', { shouldValidate: true });
      setValue('signatoryNationality', s.nationality || '', { shouldValidate: true });
      setValue('signatoryPosition', s.position || '', { shouldValidate: true });
    }
  };

  const handleSelectExistingCustomer = async (email: string) => {
    setSelectedUserEmail(email);
    const selected = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());

    if (selected) {
      applyCustomerInfoToForm(
        {
          firstName: selected.firstName,
          lastName: selected.lastName,
          email: selected.email,
          phone: selected.phone,
          nationality: selected.nationality,
          qid: selected.nationalId,
        },
        selected
      );
    } else {
      setValue('email', email, { shouldValidate: true });
      setValue('signatoryEmail', email, { shouldValidate: true });
    }

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
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
          Applicant Type
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={applicantType}
          onChange={handleApplicantTypeChange}
          size="small"
          color="primary"
        >
          <ToggleButton value="individual">Individual</ToggleButton>
          <ToggleButton value="corporate">Corporate</ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'var(--light-grey)' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Existing Customer
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={useExistingCustomer}
              onChange={(e) => setUseExistingCustomer(e.target.checked)}
              sx={{ color: 'var(--field-border-color)', '&.Mui-checked': { color: 'var(--blox-black)' } }}
            />
          }
          label={
            applicantType === 'corporate'
              ? 'Select existing user as authorized signatory'
              : 'Select from existing customers'
          }
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

      {applicantType === 'corporate' ? (
        <>
          <Typography variant="h3" className="section-title">
            Company Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Input
                label="Legal Name"
                {...register('legalName')}
                error={!!errors.legalName}
                helperText={errors.legalName?.message as string}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="CR Number"
                {...register('crNumber')}
                error={!!errors.crNumber}
                helperText={errors.crNumber?.message as string || 'Commercial Registration number'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Trade Name (optional)"
                {...register('tradeName')}
                error={!!errors.tradeName}
                helperText={errors.tradeName?.message as string}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Industry (optional)"
                {...register('industry')}
                error={!!errors.industry}
                helperText={errors.industry?.message as string}
              />
            </Grid>
          </Grid>

          <Typography variant="h3" className="section-title" sx={{ mt: 4 }}>
            Registered Address
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Input label="Street Address" {...register('regStreet')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input label="City" {...register('regCity')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input label="Country" {...register('regCountry')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input label="Postal Code" {...register('regPostalCode')} />
            </Grid>
          </Grid>

          <Typography variant="h3" className="section-title" sx={{ mt: 4 }}>
            Authorized Signatory
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Input
                label="First Name"
                {...register('signatoryFirstName')}
                error={!!errors.signatoryFirstName}
                helperText={errors.signatoryFirstName?.message as string}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Last Name"
                {...register('signatoryLastName')}
                error={!!errors.signatoryLastName}
                helperText={errors.signatoryLastName?.message as string}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Email"
                type="email"
                {...register('signatoryEmail')}
                error={!!errors.signatoryEmail}
                helperText={
                  (errors.signatoryEmail?.message as string) ||
                  'Application will be visible under this user’s account'
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Phone Number"
                {...register('signatoryPhone')}
                error={!!errors.signatoryPhone}
                helperText={errors.signatoryPhone?.message as string}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Qatar ID (QID)"
                {...register('signatoryQid')}
                error={!!errors.signatoryQid}
                helperText={(errors.signatoryQid?.message as string) || '11-digit Qatar ID number'}
                inputProps={{ maxLength: 11 }}
                placeholder="e.g., 12345678901"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input label="Nationality" {...register('signatoryNationality')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Input
                label="Position"
                {...register('signatoryPosition')}
                placeholder="e.g., Manager / Owner"
              />
            </Grid>
          </Grid>
        </>
      ) : (
        <>
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
            <Grid item xs={12} sm={6}>
              <Input
                label="Qatar ID (QID)"
                {...register('qid')}
                error={!!errors.qid}
                helperText={(errors.qid?.message as string) || '11-digit Qatar ID number'}
                inputProps={{ maxLength: 11 }}
                placeholder="e.g., 12345678901"
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
        </>
      )}
    </Box>
  );
};
